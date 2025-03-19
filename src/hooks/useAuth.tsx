"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, getUserById, logOut } from '../firebase';

// Define types for our cache
interface CachedUserData {
  uid: string;
  role: 'tutor' | 'student' | 'admin';
  displayName?: string;
  email?: string;
  timestamp: number; // When the data was cached
}

interface CachedAuthState {
  user: {
    uid: string;
    displayName?: string | null;
    email?: string | null;
    photoURL?: string | null;
  } | null;
  userRole: 'tutor' | 'student' | 'admin' | null;
  timestamp: number;
}

interface AuthContextType {
  user: User | null;
  userRole: 'tutor' | 'student' | 'admin' | null;
  loading: boolean;
  logout: (redirectCallback?: () => void) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userRole: null,
  loading: true,
  logout: async () => {},
});

// Cache constants
const USER_CACHE_KEY = 'swamp_tutors_user_cache';
const AUTH_STATE_CACHE_KEY = 'swamp_tutors_auth_state';
const CACHE_EXPIRY_MS = 60 * 60 * 1000; // 1 hour cache expiry

// Helper functions for cache management
const getCachedUserData = (uid: string): CachedUserData | null => {
  try {
    const cacheString = localStorage.getItem(USER_CACHE_KEY);
    if (!cacheString) return null;
    
    const cache = JSON.parse(cacheString);
    
    // Check if cache exists for this user and is not expired
    if (cache[uid] && (Date.now() - cache[uid].timestamp) < CACHE_EXPIRY_MS) {
      return cache[uid];
    }
    return null;
  } catch (error) {
    console.error('Error reading from cache:', error);
    return null;
  }
};

const setCachedUserData = (uid: string, userData: Omit<CachedUserData, 'timestamp'>) => {
  try {
    // Read existing cache
    const cacheString = localStorage.getItem(USER_CACHE_KEY);
    const cache = cacheString ? JSON.parse(cacheString) : {};
    
    // Update cache with new data
    cache[uid] = {
      ...userData,
      timestamp: Date.now()
    };
    
    // Write back to localStorage
    localStorage.setItem(USER_CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.error('Error writing to cache:', error);
  }
};

// Cache entire auth state for instant loading
const getCachedAuthState = (): CachedAuthState | null => {
  try {
    const cacheString = localStorage.getItem(AUTH_STATE_CACHE_KEY);
    if (!cacheString) return null;
    
    const cache = JSON.parse(cacheString) as CachedAuthState;
    
    // Check if cache is not expired
    if ((Date.now() - cache.timestamp) < CACHE_EXPIRY_MS) {
      return cache;
    }
    return null;
  } catch (error) {
    console.error('Error reading from auth state cache:', error);
    return null;
  }
};

const setCachedAuthState = (authState: Omit<CachedAuthState, 'timestamp'>) => {
  try {
    // Set cache with timestamp
    const cacheData = {
      ...authState,
      timestamp: Date.now()
    };
    
    // Write to localStorage
    localStorage.setItem(AUTH_STATE_CACHE_KEY, JSON.stringify(cacheData));
  } catch (error) {
    console.error('Error writing to auth state cache:', error);
  }
};

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // Use refs to track initialization state
  const authListenerSetup = useRef(false);
  const firebaseInitializedRef = useRef(false);
  const cachedAuthChecked = useRef(false);
  
  // State
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<'tutor' | 'student' | 'admin' | null>(null);
  const [loading, setLoading] = useState(true);
  const [authInitialized, setAuthInitialized] = useState(false);
  
  // Memoize the logout function to prevent unnecessary rerenders
  const logout = useCallback(async (redirectCallback?: () => void) => {
    try {
      setLoading(true); // Set loading before logout
      
      // Clear auth caches immediately
      try {
        localStorage.removeItem(AUTH_STATE_CACHE_KEY);
        // Also clear session storage
        sessionStorage.removeItem('authState');
      } catch (e) {
        console.error("Error clearing auth cache:", e);
      }
      
      await logOut();
      // Run the redirect callback if provided
      if (redirectCallback) {
        redirectCallback();
      }
      // Auth state change will be detected by the onAuthStateChanged listener
    } catch (error) {
      console.error('Error logging out:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // First effect: Check for cached auth state on mount (runs only once)
  useEffect(() => {
    if (cachedAuthChecked.current) return;
    cachedAuthChecked.current = true;
    
    // Try to restore auth state from cache before Firebase initializes
    const cachedAuth = getCachedAuthState();
    if (cachedAuth) {
      console.log("✅ Using cached auth state:", cachedAuth);
      
      // Pre-populate with cached data
      if (cachedAuth.user) {
        // We can't set a full User object, but we can simulate key properties
        // for rendering purposes until Firebase auth loads
        setUser(cachedAuth.user as any);
        setUserRole(cachedAuth.userRole);
        
        // We're using cached data, so we can show content immediately
        setLoading(false);
      }
    }
  }, []);

  // Second effect: Set up Firebase auth listener (runs only once)
  useEffect(() => {
    // Prevent multiple listener setups
    if (authListenerSetup.current) return;
    authListenerSetup.current = true;
    
    console.log("Setting up auth state change listener");
    
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("Auth state changed:", !!firebaseUser);
      firebaseInitializedRef.current = true;
      
      if (firebaseUser) {
        // Update user state with the full Firebase user object
        setUser(firebaseUser);
        
        // Check for cached user data first
        const cachedData = getCachedUserData(firebaseUser.uid);
        
        if (cachedData) {
          console.log("Using cached user data:", cachedData);
          
          // Set user role from cache immediately if not already set
          if (userRole !== cachedData.role) {
            setUserRole(cachedData.role);
          }
          
          // Cache the entire auth state for next load
          setCachedAuthState({
            user: {
              uid: firebaseUser.uid,
              displayName: firebaseUser.displayName,
              email: firebaseUser.email,
              photoURL: firebaseUser.photoURL,
            },
            userRole: cachedData.role
          });
          
          // We can finish loading if we were still in loading state
          if (loading) {
            setLoading(false);
          }
          
          // We're using cached data, so we can mark as initialized
          if (!authInitialized) {
            setAuthInitialized(true);
          }
          
          // Verify with Firestore in the background without blocking UI
          getUserById(firebaseUser.uid).then(userData => {
            if (userData) {
              const role = userData.role as 'tutor' | 'student' | 'admin';
              
              // Update cache and state only if role has changed
              if (role !== cachedData.role) {
                console.log("User role updated from:", cachedData.role, "to:", role);
                setUserRole(role);
                
                // Update both caches
                setCachedUserData(firebaseUser.uid, {
                  uid: firebaseUser.uid,
                  role,
                  displayName: firebaseUser.displayName || undefined,
                  email: firebaseUser.email || undefined
                });
                
                setCachedAuthState({
                  user: {
                    uid: firebaseUser.uid,
                    displayName: firebaseUser.displayName,
                    email: firebaseUser.email,
                    photoURL: firebaseUser.photoURL,
                  },
                  userRole: role
                });
              }
            }
          }).catch(error => {
            console.error('Error verifying user role with Firestore:', error);
          });
        } else {
          // No cached data, need to fetch from Firestore
          // But we'll keep loading true only for this case
          setLoading(true);
          
          try {
            console.log("Fetching user data from Firestore for:", firebaseUser.uid);
            const userData = await getUserById(firebaseUser.uid);
            
            if (userData) {
              const role = userData.role as 'tutor' | 'student' | 'admin';
              console.log("User role found:", role);
              setUserRole(role);
              
              // Cache the user data for future use
              setCachedUserData(firebaseUser.uid, {
                uid: firebaseUser.uid,
                role,
                displayName: firebaseUser.displayName || undefined,
                email: firebaseUser.email || undefined
              });
              
              // Cache the entire auth state for next load
              setCachedAuthState({
                user: {
                  uid: firebaseUser.uid,
                  displayName: firebaseUser.displayName,
                  email: firebaseUser.email,
                  photoURL: firebaseUser.photoURL,
                },
                userRole: role
              });
            } else {
              console.log("No user data found");
              setUserRole(null);
              
              // Clear any cached auth state
              try {
                localStorage.removeItem(AUTH_STATE_CACHE_KEY);
              } catch (e) {
                console.error("Error clearing auth cache:", e);
              }
            }
          } catch (error) {
            console.error('Error getting user role:', error);
            setUserRole(null);
          } finally {
            // Mark as initialized and not loading after Firestore fetch
            setAuthInitialized(true);
            setLoading(false);
          }
        }
      } else {
        // No firebase user, clear auth state
        console.log("No firebase user, clearing role");
        setUser(null);
        setUserRole(null);
        setAuthInitialized(true);
        setLoading(false);
        
        // Clear any cached auth state
        try {
          localStorage.removeItem(AUTH_STATE_CACHE_KEY);
          sessionStorage.removeItem('authState');
        } catch (e) {
          console.error("Error clearing auth cache:", e);
        }
      }
    });

    return unsubscribe;
  }, []); // Empty dependency array ensures this only runs once

  // Third effect: Update session storage when auth state changes
  // This is separate from our localStorage cache for immediate state restoration during navigation
  useEffect(() => {
    if (authInitialized && !loading) {
      try {
        sessionStorage.setItem('authState', JSON.stringify({
          isLoggedIn: !!user,
          userRole,
        }));
      } catch (e) {
        console.log('Could not store auth state in sessionStorage');
      }
    }
  }, [authInitialized, loading, user, userRole]);

  // Only log auth state when it actually changes
  const prevAuthState = useRef({ isLoggedIn: !!user, userRole, loading });
  useEffect(() => {
    const currentState = { isLoggedIn: !!user, userRole, loading };
    if (
      prevAuthState.current.isLoggedIn !== currentState.isLoggedIn ||
      prevAuthState.current.userRole !== currentState.userRole ||
      prevAuthState.current.loading !== currentState.loading
    ) {
      console.log("Auth provider state:", { 
        isLoggedIn: !!user, 
        userRole, 
        isLoading: loading,
        initialized: authInitialized,
        cacheAvailable: user ? !!getCachedUserData(user.uid) : false,
        firebaseInitialized: firebaseInitializedRef.current
      });
      prevAuthState.current = currentState;
    }
  }, [user, userRole, loading, authInitialized]);

  return (
    <AuthContext.Provider value={{ user, userRole, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}; 