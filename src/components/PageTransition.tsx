"use client";

import { useState, useEffect, ReactNode, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

interface PageTransitionProps {
  children: ReactNode;
}

export default function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [previousPath, setPreviousPath] = useState('');
  const isFirstRender = useRef(true);
  
  // Check if we have cached auth on mount
  const hasCachedAuth = useRef(false);
  useEffect(() => {
    try {
      const hasAuthStateCache = localStorage.getItem('swamp_tutors_auth_state') !== null;
      hasCachedAuth.current = hasAuthStateCache;
    } catch (e) {
      console.error('Error checking auth cache status:', e);
    }
  }, []);
  
  // This effect will run whenever the route changes (pathname or search params)
  useEffect(() => {
    // Create a composite key for the current route (path + search params)
    const url = pathname + searchParams.toString();
    
    // Skip the initial load
    if (isFirstRender.current) {
      isFirstRender.current = false;
      setPreviousPath(url);
      return;
    }
    
    // Only show loading state for actual navigation, not initial load
    if (previousPath !== url) {
      const handleRouteChange = () => {
        // Determine if we should skip loading based on cached data
        let transitionDuration = 300; // Default transition
        
        // With cached auth data, transitions can be shorter or skipped
        if (hasCachedAuth.current) {
          transitionDuration = 100; // Much shorter transition with cached auth
          
          // For minor navigations within the same section, we could even skip
          // the transition entirely if both paths are in the same section
          const currentSection = getPathSection(url);
          const previousSection = getPathSection(previousPath);
          
          if (currentSection === previousSection) {
            transitionDuration = 50; // Almost instantaneous for same-section navigation
          }
        }
        
        // Apply transition
        setIsLoading(true);
        
        setTimeout(() => {
          setIsLoading(false);
          setPreviousPath(url);
        }, transitionDuration);
      };
      
      handleRouteChange();
    }
  }, [pathname, searchParams, previousPath]);
  
  // Helper to get the main section of a path (e.g., /tutor/dashboard -> tutor)
  const getPathSection = (path: string): string => {
    const parts = path.split('/').filter(Boolean);
    return parts.length > 0 ? parts[0] : '';
  };
  
  return (
    <div className={isLoading ? 'page-transition page-loading' : 'page-transition'}>
      {children}
    </div>
  );
} 