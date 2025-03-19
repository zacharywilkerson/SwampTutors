"use client";

import Link from "next/link";
import { useEffect, useState, useCallback, memo, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "../hooks/useAuth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/config";

// Define the tutor status cache interface
interface TutorStatusCache {
  [uid: string]: {
    status: string;
    timestamp: number;
  }
}

// Cache constants
const TUTOR_STATUS_CACHE_KEY = 'swamp_tutors_tutor_status';
const TUTOR_STATUS_CACHE_EXPIRY = 15 * 60 * 1000; // 15 minutes - match useTutorRedirect
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
      log(`Using cached tutor status in Navbar: ${cachedStatus.status}`);
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
    log(`Cached tutor status in Navbar: ${status}`);
  } catch (error) {
    console.error('Error caching tutor status:', error);
  }
};

function Navbar() {
  const { user, userRole, loading: authLoading, logout } = useAuth();
  const pathname = usePathname();
  const [tutorStatus, setTutorStatus] = useState<string | null>(null);
  const [isTutorStatusLoading, setIsTutorStatusLoading] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Close menus when navigating
  useEffect(() => {
    setIsMenuOpen(false);
    setIsProfileDropdownOpen(false);
  }, [pathname]);

  // Handle cache initialization and loading states
  useEffect(() => {
    // If we're done loading auth
    if (!authLoading) {
      // Initial loading quickly set to false
      if (loading) {
        // If user is not logged in or not a tutor, we don't need to check status
        if (!user || userRole !== 'tutor') {
          setLoading(false);
          return;
        }
        
        // Try to get from cache first
        const cachedStatus = getCachedTutorStatus(user.uid);
        if (cachedStatus) {
          log(`Pre-loading cached tutor status: ${cachedStatus}`);
          setTutorStatus(cachedStatus);
          setLoading(false);
          return;
        }
      }
    }
  }, [authLoading, user, userRole, loading]);

  // Check tutor profile status if user is a tutor
  useEffect(() => {
    // Skip if auth is still loading or user is not a tutor
    if (authLoading || !user || userRole !== 'tutor') {
      if (!authLoading && (user || userRole)) {
        setLoading(false); // Done loading if not a tutor
      }
      return;
    }
    
    // Check if we already have tutor status from cache or previous check
    if (tutorStatus) {
      setLoading(false);
      return;
    }

    // Check tutor profile status
    const checkTutorProfile = async () => {
      // Don't check if already checking
      if (isTutorStatusLoading) return;
      
      try {
        setIsTutorStatusLoading(true);
        
        // Try to get from cache first
        const cachedStatus = getCachedTutorStatus(user.uid);
        if (cachedStatus) {
          log(`Using cached tutor status: ${cachedStatus}`);
          setTutorStatus(cachedStatus);
          setLoading(false);
          setIsTutorStatusLoading(false);
          return;
        }
        
        // If not in cache, fetch from Firestore
        log('Fetching tutor status from Firestore');
        const tutorDoc = await getDoc(doc(db, 'tutors', user.uid));
        
        if (tutorDoc.exists()) {
          const tutorData = tutorDoc.data();
          const status = tutorData.profileStatus || 'incomplete';
          setTutorStatus(status);
          
          // Cache the status
          setCachedTutorStatus(user.uid, status);
        } else {
          setTutorStatus('incomplete');
          setCachedTutorStatus(user.uid, 'incomplete');
        }
      } catch (error) {
        console.error('Error checking tutor profile:', error);
      } finally {
        setLoading(false);
        setIsTutorStatusLoading(false);
      }
    };
    
    // Only check if we don't already have a status
    if (!tutorStatus) {
      checkTutorProfile();
    }
  }, [authLoading, user, userRole, tutorStatus, isTutorStatusLoading]);

  // Determine if tutor should see restricted navigation
  const tutorHasIncompleteProfile = 
    userRole === 'tutor' && 
    (tutorStatus === 'incomplete' || tutorStatus === 'pending' || tutorStatus === 'rejected');

  // Memoized logout handler
  const handleLogout = useCallback(async () => {
    try {
      // Pass a redirect callback to the logout function
      await logout(() => {
        // Use window.location.href for a hard redirect to ensure we fully reload
        // and clear any lingering state
        window.location.href = '/';
      });
      // Clear the tutor status cache on logout
      setTutorStatus(null);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  }, [logout]);

  // Show a minimal navbar during any loading state
  if (authLoading || loading) {
    return (
      <nav className="bg-blue-900 text-white shadow-lg">
        <div className="container mx-auto px-4">
          <div className="flex justify-between h-16">
            {/* Only show logo during loading */}
            <div className="flex items-center">
              <Link href="/" className="flex-shrink-0 flex items-center">
                <span className="text-xl font-bold">SwampTutors</span>
              </Link>
            </div>
            {/* Optional: Add a subtle loading indicator */}
            <div className="flex items-center">
              <div className="w-6 h-6 border-2 border-blue-100 border-t-transparent rounded-full animate-spin"></div>
            </div>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="bg-blue-900 text-white shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex justify-between h-16">
          {/* Logo and main navigation */}
          <div className="flex items-center">
            <Link href="/" className="flex-shrink-0 flex items-center">
              <span className="text-xl font-bold">SwampTutors</span>
            </Link>
            
            {/* Desktop Navigation */}
            <div className="hidden md:ml-8 md:flex md:space-x-6">
              {/* Common links */}
              <Link 
                href="/" 
                className={`px-2 py-2 text-sm font-medium ${pathname === '/' ? 'text-white border-b-2 border-white' : 'text-blue-100 hover:text-white'}`}
              >
                Home
              </Link>
              
              {!user && (
                <>
                  <Link 
                    href="/search" 
                    className={`px-2 py-2 text-sm font-medium ${pathname === '/search' ? 'text-white border-b-2 border-white' : 'text-blue-100 hover:text-white'}`}
                  >
                    Find Tutors
                  </Link>
                  <Link 
                    href="/how-it-works" 
                    className={`px-2 py-2 text-sm font-medium ${pathname === '/how-it-works' ? 'text-white border-b-2 border-white' : 'text-blue-100 hover:text-white'}`}
                  >
                    How It Works
                  </Link>
                </>
              )}
              
              {/* Student-specific links */}
              {user && userRole === 'student' && (
                <>
                  <Link 
                    href="/search" 
                    className={`px-2 py-2 text-sm font-medium ${pathname === '/search' ? 'text-white border-b-2 border-white' : 'text-blue-100 hover:text-white'}`}
                  >
                    Find Tutors
                  </Link>
                  <Link 
                    href="/student/dashboard" 
                    className={`px-2 py-2 text-sm font-medium ${pathname === '/student/dashboard' ? 'text-white border-b-2 border-white' : 'text-blue-100 hover:text-white'}`}
                  >
                    My Dashboard
                  </Link>
                  <Link 
                    href="/student/lessons" 
                    className={`px-2 py-2 text-sm font-medium ${pathname === '/student/lessons' ? 'text-white border-b-2 border-white' : 'text-blue-100 hover:text-white'}`}
                  >
                    My Lessons
                  </Link>
                </>
              )}
              
              {/* Tutor-specific links - only show if profile is complete */}
              {user && userRole === 'tutor' && !tutorHasIncompleteProfile && (
                <>
                  <Link 
                    href="/tutor/dashboard" 
                    className={`px-2 py-2 text-sm font-medium ${pathname === '/tutor/dashboard' ? 'text-white border-b-2 border-white' : 'text-blue-100 hover:text-white'}`}
                  >
                    My Dashboard
                  </Link>
                  <Link 
                    href="/tutor/lessons" 
                    className={`px-2 py-2 text-sm font-medium ${pathname === '/tutor/lessons' ? 'text-white border-b-2 border-white' : 'text-blue-100 hover:text-white'}`}
                  >
                    My Lessons
                  </Link>
                  <Link 
                    href="/tutor/availability" 
                    className={`px-2 py-2 text-sm font-medium ${pathname === '/tutor/availability' ? 'text-white border-b-2 border-white' : 'text-blue-100 hover:text-white'}`}
                  >
                    Availability
                  </Link>
                  <Link 
                    href="/tutor/profile-edit" 
                    className={`px-2 py-2 text-sm font-medium ${pathname === '/tutor/profile-edit' ? 'text-white border-b-2 border-white' : 'text-blue-100 hover:text-white'}`}
                  >
                    Edit Profile
                  </Link>
                </>
              )}
              
              {/* Tutor with incomplete profile - show limited options */}
              {user && userRole === 'tutor' && tutorHasIncompleteProfile && (
                <>
                  {tutorStatus === 'incomplete' ? (
                    <Link 
                      href="/tutor/signup/how-it-works" 
                      className={`px-2 py-2 text-sm font-medium ${pathname === '/tutor/signup/how-it-works' ? 'text-white border-b-2 border-white' : 'text-blue-100 hover:text-white'}`}
                    >
                      Complete Profile
                    </Link>
                  ) : (
                    <Link 
                      href="/tutor/profile-pending" 
                      className={`px-2 py-2 text-sm font-medium ${pathname === '/tutor/profile-pending' ? 'text-white border-b-2 border-white' : 'text-blue-100 hover:text-white'}`}
                    >
                      Profile Status
                    </Link>
                  )}
                </>
              )}
              
              {/* Admin-specific links */}
              {user && userRole === 'admin' && (
                <>
                  <Link 
                    href="/admin/dashboard" 
                    className={`px-2 py-2 text-sm font-medium ${pathname === '/admin/dashboard' ? 'text-white border-b-2 border-white' : 'text-blue-100 hover:text-white'}`}
                  >
                    Admin Dashboard
                  </Link>
                  <Link 
                    href="/admin/tutor-review" 
                    className={`px-2 py-2 text-sm font-medium ${pathname === '/admin/tutor-review' ? 'text-white border-b-2 border-white' : 'text-blue-100 hover:text-white'}`}
                  >
                    Review Tutors
                  </Link>
                  <Link 
                    href="/admin/course-review" 
                    className={`px-2 py-2 text-sm font-medium ${pathname === '/admin/course-review' ? 'text-white border-b-2 border-white' : 'text-blue-100 hover:text-white'}`}
                  >
                    Review Courses
                  </Link>
                </>
              )}
            </div>
          </div>
          
          {/* Right-side navigation elements (auth buttons) */}
          <div className="hidden md:flex md:items-center">
            {!user ? (
              <div className="flex space-x-4 items-center">
                <Link href="/login" className="text-blue-100 hover:text-white">
                  Log In
                </Link>
                <div className="h-5 border-r border-blue-400 opacity-50"></div>
                <Link 
                  href="/student/register" 
                  className="bg-white text-blue-900 hover:bg-blue-50 px-4 py-2 rounded font-medium"
                >
                  Sign Up
                </Link>
              </div>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                  className="flex items-center text-blue-100 hover:text-white"
                >
                  <div className="w-8 h-8 bg-blue-700 rounded-full flex items-center justify-center mr-2">
                    {user.displayName?.charAt(0) || "U"}
                  </div>
                  <span>{user.displayName || "User"}</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
                
                {/* Profile dropdown */}
                {isProfileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10">
                    {userRole === 'student' && (
                      <Link href="/student/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                        My Profile
                      </Link>
                    )}
                    {userRole === 'tutor' && !tutorHasIncompleteProfile && (
                      <Link href={`/tutor/${user?.uid}`} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                        My Profile
                      </Link>
                    )}
                    {userRole === 'tutor' && tutorHasIncompleteProfile && tutorStatus === 'incomplete' && (
                      <Link href="/tutor/signup/how-it-works" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                        Complete Profile
                      </Link>
                    )}
                    {userRole === 'tutor' && (tutorStatus === 'pending' || tutorStatus === 'rejected') && (
                      <Link href="/tutor/profile-pending" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                        Profile Status
                      </Link>
                    )}
                    <Link href="/account/settings" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                      Account Settings
                    </Link>
                    <button 
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Mobile menu button */}
          <div className="flex md:hidden items-center">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-blue-100 hover:text-white focus:outline-none"
            >
              <svg
                className={`${isMenuOpen ? 'hidden' : 'block'} h-6 w-6`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <svg
                className={`${isMenuOpen ? 'block' : 'hidden'} h-6 w-6`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile Menu */}
      <div className={`${isMenuOpen ? 'block' : 'hidden'} md:hidden`}>
        <div className="px-2 pt-2 pb-3 space-y-1 border-t border-blue-800">
          {/* Common links */}
          <Link 
            href="/" 
            className={`block px-3 py-2 rounded-md text-base font-medium ${pathname === '/' ? 'bg-blue-800 text-white' : 'text-blue-100 hover:bg-blue-800'}`}
          >
            Home
          </Link>
          
          {!user && (
            <>
              <Link 
                href="/search" 
                className={`block px-3 py-2 rounded-md text-base font-medium ${pathname === '/search' ? 'bg-blue-800 text-white' : 'text-blue-100 hover:bg-blue-800'}`}
              >
                Find Tutors
              </Link>
              <Link 
                href="/how-it-works" 
                className={`block px-3 py-2 rounded-md text-base font-medium ${pathname === '/how-it-works' ? 'bg-blue-800 text-white' : 'text-blue-100 hover:bg-blue-800'}`}
              >
                How It Works
              </Link>
            </>
          )}
          
          {/* Student-specific links */}
          {user && userRole === 'student' && (
            <>
              <Link 
                href="/search" 
                className={`block px-3 py-2 rounded-md text-base font-medium ${pathname === '/search' ? 'bg-blue-800 text-white' : 'text-blue-100 hover:bg-blue-800'}`}
              >
                Find Tutors
              </Link>
              <Link 
                href="/student/dashboard" 
                className={`block px-3 py-2 rounded-md text-base font-medium ${pathname === '/student/dashboard' ? 'bg-blue-800 text-white' : 'text-blue-100 hover:bg-blue-800'}`}
              >
                My Dashboard
              </Link>
              <Link 
                href="/student/lessons" 
                className={`block px-3 py-2 rounded-md text-base font-medium ${pathname === '/student/lessons' ? 'bg-blue-800 text-white' : 'text-blue-100 hover:bg-blue-800'}`}
              >
                My Lessons
              </Link>
              <Link 
                href="/student/profile" 
                className={`block px-3 py-2 rounded-md text-base font-medium ${pathname === '/student/profile' ? 'bg-blue-800 text-white' : 'text-blue-100 hover:bg-blue-800'}`}
              >
                My Profile
              </Link>
            </>
          )}
          
          {/* Tutor-specific links - only show if profile is complete */}
          {user && userRole === 'tutor' && !tutorHasIncompleteProfile && (
            <>
              <Link 
                href="/tutor/dashboard" 
                className={`block px-3 py-2 rounded-md text-base font-medium ${pathname === '/tutor/dashboard' ? 'bg-blue-800 text-white' : 'text-blue-100 hover:bg-blue-800'}`}
              >
                My Dashboard
              </Link>
              <Link 
                href="/tutor/lessons" 
                className={`block px-3 py-2 rounded-md text-base font-medium ${pathname === '/tutor/lessons' ? 'bg-blue-800 text-white' : 'text-blue-100 hover:bg-blue-800'}`}
              >
                My Lessons
              </Link>
              <Link 
                href="/tutor/availability" 
                className={`block px-3 py-2 rounded-md text-base font-medium ${pathname === '/tutor/availability' ? 'bg-blue-800 text-white' : 'text-blue-100 hover:bg-blue-800'}`}
              >
                Availability
              </Link>
              <Link 
                href="/tutor/profile-edit" 
                className={`block px-3 py-2 rounded-md text-base font-medium ${pathname === '/tutor/profile-edit' ? 'bg-blue-800 text-white' : 'text-blue-100 hover:bg-blue-800'}`}
              >
                Edit Profile
              </Link>
            </>
          )}
          
          {/* Tutor with incomplete profile - show limited options */}
          {user && userRole === 'tutor' && tutorHasIncompleteProfile && (
            <>
              {tutorStatus === 'incomplete' ? (
                <Link 
                  href="/tutor/signup/how-it-works" 
                  className={`block px-3 py-2 rounded-md text-base font-medium ${pathname === '/tutor/signup/how-it-works' ? 'bg-blue-800 text-white' : 'text-blue-100 hover:bg-blue-800'}`}
                >
                  Complete Profile
                </Link>
              ) : (
                <Link 
                  href="/tutor/profile-pending" 
                  className={`block px-3 py-2 rounded-md text-base font-medium ${pathname === '/tutor/profile-pending' ? 'bg-blue-800 text-white' : 'text-blue-100 hover:bg-blue-800'}`}
                >
                  Profile Status
                </Link>
              )}
            </>
          )}
          
          {/* Admin-specific links */}
          {user && userRole === 'admin' && (
            <>
              <Link 
                href="/admin/dashboard" 
                className={`block px-3 py-2 rounded-md text-base font-medium ${pathname === '/admin/dashboard' ? 'bg-blue-800 text-white' : 'text-blue-100 hover:bg-blue-800'}`}
              >
                Admin Dashboard
              </Link>
              <Link 
                href="/admin/tutor-review" 
                className={`block px-3 py-2 rounded-md text-base font-medium ${pathname === '/admin/tutor-review' ? 'bg-blue-800 text-white' : 'text-blue-100 hover:bg-blue-800'}`}
              >
                Review Tutors
              </Link>
              <Link 
                href="/admin/course-review" 
                className={`block px-3 py-2 rounded-md text-base font-medium ${pathname === '/admin/course-review' ? 'bg-blue-800 text-white' : 'text-blue-100 hover:bg-blue-800'}`}
              >
                Review Courses
              </Link>
            </>
          )}
          
          {/* Auth links */}
          {!user ? (
            <div className="pt-4 pb-3 border-t border-blue-800">
              <Link 
                href="/login" 
                className="block px-3 py-2 rounded-md text-base font-medium text-blue-100 hover:bg-blue-800"
              >
                Log In
              </Link>
              <Link 
                href="/student/register" 
                className="block px-3 py-2 mt-1 rounded-md text-base font-medium bg-white text-blue-900 hover:bg-blue-50"
              >
                Sign Up
              </Link>
            </div>
          ) : (
            <div className="pt-4 pb-3 border-t border-blue-800">
              <div className="flex items-center px-3">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-blue-700 rounded-full flex items-center justify-center">
                    {user.displayName?.charAt(0) || "U"}
                  </div>
                </div>
                <div className="ml-3">
                  <div className="text-base font-medium text-white">{user.displayName || "User"}</div>
                  <div className="text-sm font-medium text-blue-200">{user.email}</div>
                </div>
              </div>
              <div className="mt-3 px-2 space-y-1">
                <Link 
                  href="/account/settings" 
                  className="block px-3 py-2 rounded-md text-base font-medium text-blue-100 hover:bg-blue-800"
                >
                  Account Settings
                </Link>
                <button 
                  onClick={handleLogout}
                  className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-blue-100 hover:bg-blue-800"
                >
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

export default memo(Navbar); 