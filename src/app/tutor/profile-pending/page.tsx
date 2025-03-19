"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../../hooks/useAuth";
import { useTutorRedirect } from "../../../hooks/useTutorRedirect";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../firebase/config";

// Constants for logging - set to false to disable excessive logs
const LOG_ENABLED = false;

// Helper for conditional logging
const log = (message: string, ...args: any[]) => {
  if (LOG_ENABLED) {
    console.log(message, ...args);
  }
};

export default function TutorProfilePending() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  // This page should be excluded from the redirect check (to avoid infinite redirect loops)
  const { isLoading: redirectLoading, profileStatus } = useTutorRedirect(['/tutor/profile-setup', '/tutor/profile-pending']);
  
  const [tutorStatus, setTutorStatus] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const hasInitialized = useRef(false);
  
  useEffect(() => {
    // Skip if already initialized or auth still loading
    if (hasInitialized.current || authLoading) return;
    
    // Redirect if not logged in
    if (!user) {
      router.push('/login');
      return;
    }
    
    // Fetch tutor data if needed for rejection reason
    const fetchTutorData = async () => {
      try {
        const tutorDoc = await getDoc(doc(db, 'tutors', user.uid));
        if (tutorDoc.exists()) {
          const tutorData = tutorDoc.data();
          setTutorStatus(tutorData.profileStatus);
          setRejectionReason(tutorData.rejectionReason || "");
        }
        setIsCheckingStatus(false);
      } catch (error) {
        console.error("Error fetching tutor data:", error);
        setIsCheckingStatus(false);
      }
    };
    
    // Automatically use the profileStatus from useTutorRedirect hook if available
    if (profileStatus && !redirectLoading) {
      hasInitialized.current = true;
      setTutorStatus(profileStatus);
      
      log(`Using tutor status from hook: ${profileStatus}`);
      
      // Only redirect if status is 'incomplete' or 'approved'
      if (profileStatus === 'incomplete') {
        router.replace('/tutor/signup/how-it-works');
      } else if (profileStatus === 'approved') {
        router.replace('/tutor/dashboard');
      } else if (profileStatus === 'rejected' || profileStatus === 'permanently_rejected') {
        // Fetch rejection reason if rejected
        fetchTutorData();
      } else {
        setIsCheckingStatus(false);
      }
    }
  }, [user, authLoading, router, profileStatus, redirectLoading]);
  
  // Show loading state while checking
  if (authLoading || redirectLoading || isCheckingStatus) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600">Checking profile status...</p>
        </div>
      </div>
    );
  }
  
  const isRejected = tutorStatus === 'rejected';
  const isPermanentlyRejected = tutorStatus === 'permanently_rejected';
  
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-8 text-center">
            <div className={`w-16 h-16 ${isRejected || isPermanentlyRejected ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'} rounded-full flex items-center justify-center mx-auto mb-6`}>
              {isRejected || isPermanentlyRejected ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
            
            {isPermanentlyRejected ? (
              <>
                <h1 className="text-2xl font-bold text-gray-900 mb-4">Profile Permanently Rejected</h1>
                <div className="text-gray-600 space-y-4">
                  <p>
                    We regret to inform you that your tutor application has been permanently rejected.
                  </p>
                  
                  {rejectionReason && (
                    <div className="mt-4 p-4 border border-red-200 bg-red-50 rounded-md text-left">
                      <h3 className="font-medium text-red-800 mb-2">Reason for rejection:</h3>
                      <p className="text-gray-700">{rejectionReason}</p>
                    </div>
                  )}
                  
                  <p className="font-medium mt-4">
                    Unfortunately, you will not be able to reapply as a tutor on our platform.
                  </p>
                </div>
                
                <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    href="/"
                    className="inline-flex items-center justify-center px-5 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Return to Homepage
                  </Link>
                </div>
              </>
            ) : isRejected ? (
              <>
                <h1 className="text-2xl font-bold text-gray-900 mb-4">Profile Review: Changes Needed</h1>
                <div className="text-gray-600 space-y-4">
                  <p>
                    Our review team has reviewed your tutor profile and determined that some changes 
                    are needed before it can be approved.
                  </p>
                  
                  {rejectionReason && (
                    <div className="mt-4 p-4 border border-red-200 bg-red-50 rounded-md text-left">
                      <h3 className="font-medium text-red-800 mb-2">Feedback from the review team:</h3>
                      <p className="text-gray-700">{rejectionReason}</p>
                    </div>
                  )}
                  
                  <p className="mt-4">
                    Please update your profile with more detailed information about your 
                    qualifications and experience teaching the courses you've selected.
                  </p>
                  <p className="font-medium">
                    You can edit your profile to address these concerns and submit it again for review.
                  </p>
                </div>
                
                <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    href="/tutor/signup/how-it-works"
                    className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Edit My Profile
                  </Link>
                  <Link
                    href="/"
                    className="inline-flex items-center justify-center px-5 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Return to Homepage
                  </Link>
                </div>
              </>
            ) : (
              <>
                <h1 className="text-2xl font-bold text-gray-900 mb-4">Profile Submitted Successfully!</h1>
                <div className="text-gray-600 space-y-4">
                  <p>
                    Thank you for submitting your tutor profile. Our team will review your information to ensure
                    it meets our guidelines for tutor quality and qualification.
                  </p>
                  <p>
                    This process typically takes 1-2 business days. You'll receive an email notification once your profile
                    is approved, and then students will be able to find you and book lessons.
                  </p>
                  <p className="font-medium">
                    While you wait, you can return to the homepage or log out and come back later.
                  </p>
                </div>
                
                <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    href="/"
                    className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Return to Homepage
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
} 