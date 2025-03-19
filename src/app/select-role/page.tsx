"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AuthLayout from "../../components/AuthLayout";
import { auth, db } from "../../firebase/config";
import { doc, setDoc } from "firebase/firestore";
import { useAuth } from "../../hooks/useAuth";

export default function SelectRole() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // If no user is logged in, redirect to login page
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const handleRoleSelection = async (role: 'student' | 'tutor') => {
    if (!user) return;
    
    setIsLoading(true);
    setError("");

    try {
      // Create user document in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        displayName: user.displayName,
        role,
        profilePictureUrl: user.photoURL || '',
        createdAt: new Date(),
      });

      // If user is a tutor, create additional tutor document
      if (role === 'tutor') {
        await setDoc(doc(db, 'tutors', user.uid), {
          bio: '',
          transcriptUrl: '',
          resumeUrl: '',
          coursesTaught: [],
          approvedCourses: [],
          pendingCourses: [],
          rating: 0,
          hourlyRate: 50,
          availability: [],
          profileStatus: 'incomplete'
        });
        
        // Redirect to tutor profile setup
        router.push('/tutor/signup/how-it-works');
      } else {
        // Redirect to student dashboard
        router.push('/student/dashboard');
      }
    } catch (error: any) {
      console.error("Error setting user role:", error);
      setError(error.message || "An error occurred while setting your role");
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <AuthLayout title="Loading..." subtitle="">
        <div className="flex justify-center">
          <p>Loading...</p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Select Your Role" subtitle="Choose how you want to use SwampTutors">
      <div className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div className="border rounded-lg p-6 hover:border-blue-500 cursor-pointer transition-colors" 
               onClick={() => !isLoading && handleRoleSelection('student')}>
            <h3 className="text-lg font-medium text-gray-900 mb-2">I am a Student</h3>
            <p className="text-gray-500">I want to find and book tutors for my courses.</p>
          </div>

          <div className="border rounded-lg p-6 hover:border-blue-500 cursor-pointer transition-colors"
               onClick={() => !isLoading && handleRoleSelection('tutor')}>
            <h3 className="text-lg font-medium text-gray-900 mb-2">I am a Tutor</h3>
            <p className="text-gray-500">I want to offer tutoring services to students.</p>
          </div>
        </div>

        <div className="text-center">
          <button
            disabled={isLoading}
            onClick={() => logout(() => router.push('/login'))}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            Cancel and sign out
          </button>
        </div>
      </div>
    </AuthLayout>
  );
} 