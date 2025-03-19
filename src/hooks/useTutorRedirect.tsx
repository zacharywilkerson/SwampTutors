"use client";

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './useAuth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

// Define the tutor status cache interface
interface TutorStatusCache {
  [uid: string]: {
    status: string;
    timestamp: number;
  }
}

// Cache constants
const TUTOR_STATUS_CACHE_KEY = 'swamp_tutors_tutor_status';
const TUTOR_STATUS_CACHE_EXPIRY = 15 * 60 * 1000; // 15 minutes
const LOG_ENABLED = false; // Set to false to disable logging

// Helper for conditional logging
const log = (message: string, ...args: any[]) => {
  if (LOG_ENABLED) {
    console.log(message, ...args);
  }
};

// Get cached tutor status
const getCachedTutorStatus = (uid: string): string | null => {
  try {
    const cacheJson = localStorage.getItem(TUTOR_STATUS_CACHE_KEY);
    if (!cacheJson) return null;
    
    const cache: TutorStatusCache = JSON.parse(cacheJson);
    const cachedStatus = cache[uid];
    
    // Check if cache exists and is not expired
    if (cachedStatus && (Date.now() - cachedStatus.timestamp) < TUTOR_STATUS_CACHE_EXPIRY) {
      log(`Using cached tutor status for redirect: ${cachedStatus.status}`);
      return cachedStatus.status;
    }
    return null;
  } catch (error) {
    console.error('Error reading cached tutor status:', error);
    return null;
  }
};

// Set cached tutor status
const setCachedTutorStatus = (uid: string, status: string) => {
  try {
    let cache: TutorStatusCache = {};
    const cacheJson = localStorage.getItem(TUTOR_STATUS_CACHE_KEY);
    
    if (cacheJson) {
      cache = JSON.parse(cacheJson);
    }
    
    cache[uid] = {
      status,
      timestamp: Date.now()
    };
    
    localStorage.setItem(TUTOR_STATUS_CACHE_KEY, JSON.stringify(cache));
    log(`Cached tutor status: ${status}`);
  } catch (error) {
    console.error('Error caching tutor status:', error);
  }
};

// Function to determine the correct redirect path based on status
const getRedirectPath = (status: string): string | null => {
  if (status === 'incomplete') {
    return '/tutor/signup/how-it-works';
  } else if (status === 'pending' || status === 'rejected' || status === 'permanently_rejected') {
    return '/tutor/profile-pending';
  }
  return null; // No redirect for 'approved'
};

export function useTutorRedirect(excludePaths: string[] = []) {
  const { user, userRole, loading: authLoading } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [hasCheckedStatus, setHasCheckedStatus] = useState(false);
  const [profileStatus, setProfileStatus] = useState<string | null>(null);
  const isFirstRender = useRef(true);
  const hasScheduledVerification = useRef(false);

  // Background verification function defined INSIDE the hook 
  // to avoid reference errors
  const verifyTutorStatus = async (uid: string, cachedStatus: string) => {
    try {
      log('Background verification of tutor status');
      // Avoid verification on first render to prevent extra Firebase calls
      if (isFirstRender.current) {
        isFirstRender.current = false;
        return;
      }

      const tutorDoc = await getDoc(doc(db, 'tutors', uid));
      
      if (!tutorDoc.exists()) {
        if (cachedStatus !== 'incomplete') {
          log('Tutor document no longer exists, updating cache');
          setCachedTutorStatus(uid, 'incomplete');
          setProfileStatus('incomplete');
        }
        return;
      }

      const tutorData = tutorDoc.data();
      const serverStatus = tutorData.profileStatus || 'incomplete';
      
      // If status has changed, update cache and state
      if (serverStatus !== cachedStatus) {
        log(`Status changed from ${cachedStatus} to ${serverStatus}`);
        setCachedTutorStatus(uid, serverStatus);
        setProfileStatus(serverStatus);
        
        // If on an inappropriate page, redirect
        const currentPath = window.location.pathname;
        const redirectPath = getRedirectPath(serverStatus);
        
        if (redirectPath && !currentPath.startsWith(redirectPath) && 
            !excludePaths.some(path => currentPath.startsWith(path))) {
          log(`Redirecting to ${redirectPath} after status verification`);
          router.replace(redirectPath);
        }
      }
    } catch (error) {
      console.error('Error in background verification:', error);
    }
  };

  useEffect(() => {
    // Skip if auth is still loading
    if (authLoading) return;

    // Skip for non-tutors or if user is not authenticated
    if (!user || userRole !== 'tutor') {
      setIsLoading(false);
      setHasCheckedStatus(true);
      return;
    }

    // Skip if current path is in exclude list
    const currentPath = window.location.pathname;
    
    // Check if the current path is already the correct path for the status
    // This prevents unnecessary redirects if the user is already on the right page
    const isExcluded = (status: string) => {
      const redirectPath = getRedirectPath(status);
      if (redirectPath && currentPath.startsWith(redirectPath)) {
        return true;
      }
      return excludePaths.some(path => currentPath.startsWith(path));
    };
    
    // First check if we have a cached status
    const cachedStatus = getCachedTutorStatus(user.uid);
    
    if (cachedStatus) {
      log(`Found cached tutor status: ${cachedStatus}`);
      setProfileStatus(cachedStatus);
      
      // Only redirect if not already on the correct page
      if (!isExcluded(cachedStatus)) {
        const redirectPath = getRedirectPath(cachedStatus);
        if (redirectPath) {
          log(`Redirecting to ${redirectPath} (from cache)`);
          router.replace(redirectPath);
        }
      } else {
        log(`Already on correct path for status: ${cachedStatus}`);
      }
      
      setIsLoading(false);
      setHasCheckedStatus(true);
      
      // Schedule verification, but only once
      if (!hasScheduledVerification.current) {
        hasScheduledVerification.current = true;
        // Use setTimeout to push this to the next event loop cycle
        setTimeout(() => {
          verifyTutorStatus(user.uid, cachedStatus);
        }, 2000); // Delay by 2 seconds to prevent immediate calls
      }
      
      return;
    }

    // If no cache, check tutor profile status from Firestore
    const checkTutorStatus = async () => {
      try {
        log('Fetching tutor status from Firestore');
        const tutorDoc = await getDoc(doc(db, 'tutors', user.uid));
        
        if (!tutorDoc.exists()) {
          log('Tutor document does not exist');
          // Cache the status as incomplete
          const status = 'incomplete';
          setCachedTutorStatus(user.uid, status);
          setProfileStatus(status);
          
          // Redirect to profile setup if not already there
          if (!isExcluded(status)) {
            router.replace('/tutor/profile-setup');
          }
          
          setIsLoading(false);
          setHasCheckedStatus(true);
          return;
        }

        const tutorData = tutorDoc.data();
        const status = tutorData.profileStatus || 'incomplete';
        log(`Fetched tutor status: ${status}`);
        
        // Cache the status
        setCachedTutorStatus(user.uid, status);
        setProfileStatus(status);

        // Redirect based on profile status if not already on the correct page
        if (!isExcluded(status)) {
          const redirectPath = getRedirectPath(status);
          if (redirectPath) {
            log(`Redirecting to ${redirectPath}`);
            router.replace(redirectPath);
          }
        } else {
          log(`Already on correct path for status: ${status}`);
        }
        
        setIsLoading(false);
        setHasCheckedStatus(true);
      } catch (error) {
        console.error('Error checking tutor status:', error);
        setIsLoading(false);
        setHasCheckedStatus(true);
      }
    };

    checkTutorStatus();
    // User, userRole, and router are stable objects, so this won't cause excessive re-renders
  }, [user, userRole, authLoading, router, excludePaths]);

  return { isLoading, hasCheckedStatus, profileStatus };
} 