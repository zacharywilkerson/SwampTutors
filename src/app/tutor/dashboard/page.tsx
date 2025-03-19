"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../../hooks/useAuth";
import { useTutorRedirect } from "../../../hooks/useTutorRedirect";
import { getTutorData } from "../../../firebase";
import { ALL_COURSES } from "../../../constants/courses";
import TutorLessonsComponent from "../../../components/TutorLessonsComponent";

export default function TutorDashboard() {
  const router = useRouter();
  const { user, logout, loading: authLoading } = useAuth();
  const { isLoading: redirectLoading, hasCheckedStatus, profileStatus } = useTutorRedirect(['/tutor/profile-setup', '/tutor/profile-pending']);
  
  const [tutorData, setTutorData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Redirect if not logged in
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    
    // If we've checked the status and it's not 'approved', redirect accordingly
    if (hasCheckedStatus && profileStatus && profileStatus !== 'approved') {
      console.log(`Tutor profile status not approved: ${profileStatus}. Redirecting...`);
      
      if (profileStatus === 'incomplete') {
        router.replace('/tutor/signup/how-it-works');
      } else if (profileStatus === 'pending' || profileStatus === 'rejected') {
        router.replace('/tutor/profile-pending');
      }
      return;
    }
    
    // Only fetch data once we've checked the redirect status and confirmed the profile is approved
    if (!hasCheckedStatus || !user || profileStatus !== 'approved') return;
    
    const fetchTutorData = async () => {
      if (user) {
        try {
          const data = await getTutorData(user.uid);
          setTutorData(data);
        } catch (error) {
          console.error("Error fetching tutor data:", error);
        } finally {
          setLoading(false);
        }
      }
    };
    
    if (user) {
      fetchTutorData();
    }
  }, [user, router, authLoading, hasCheckedStatus, profileStatus]);

  const handleLogout = async () => {
    try {
      await logout(() => {
        router.push('/');
      });
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  if (authLoading || redirectLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Tutor Dashboard</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar - Tutor Info */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <div className="flex flex-col items-center mb-6">
                <div className="w-20 h-20 bg-blue-200 rounded-full flex items-center justify-center text-blue-800 text-xl font-bold mb-3">
                  {tutorData?.displayName?.charAt(0) || "T"}
                </div>
                <h2 className="text-xl font-bold">{tutorData?.displayName || "Tutor"}</h2>
                <p className="text-gray-600">{tutorData?.email || ""}</p>
                <div className="flex items-center mt-2">
                  <span className="text-yellow-500 mr-1">★</span>
                  <span>{tutorData?.rating?.toFixed(1) || "New"}</span>
                  <span className="text-gray-400 ml-1">
                    ({tutorData?.reviewCount || 0} reviews)
                  </span>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <h3 className="font-medium text-gray-800 mb-2">Your Information</h3>
                <p className="text-gray-600 mb-1">
                  <span className="font-medium">Hourly Rate:</span> ${tutorData?.hourlyRate || 0}/hour
                </p>
                <p className="text-gray-600 mb-3">
                  <span className="font-medium">Courses:</span>
                </p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {tutorData?.coursesTaught?.map((courseId: string) => {
                    const course = ALL_COURSES.find((c) => c.id === courseId);
                    return (
                      <span
                        key={courseId}
                        className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs"
                      >
                        {course?.id || courseId}
                      </span>
                    );
                  })}
                </div>
                <div className="mt-4">
                  <Link
                    href="/tutor/profile"
                    className="text-blue-600 hover:underline text-sm"
                  >
                    Edit Profile
                  </Link>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="font-bold text-lg mb-3">Statistics</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 p-3 rounded">
                  <p className="text-2xl font-bold text-blue-800">{tutorData?.stats?.pendingLessons || 0}</p>
                  <p className="text-sm text-blue-800">Pending</p>
                </div>
                <div className="bg-green-50 p-3 rounded">
                  <p className="text-2xl font-bold text-green-800">{tutorData?.stats?.confirmedLessons || 0}</p>
                  <p className="text-sm text-green-800">Confirmed</p>
                </div>
                <div className="bg-yellow-50 p-3 rounded">
                  <p className="text-2xl font-bold text-yellow-800">{tutorData?.stats?.completedLessons || 0}</p>
                  <p className="text-sm text-yellow-800">Completed</p>
                </div>
                <div className="bg-purple-50 p-3 rounded">
                  <p className="text-2xl font-bold text-purple-800">
                    ${tutorData?.stats?.totalEarnings?.toFixed(0) || 0}
                  </p>
                  <p className="text-sm text-purple-800">Earnings</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Main Content - Lessons */}
          <div className="lg:col-span-3">
            {user && <TutorLessonsComponent tutorId={user.uid} />}
          </div>
        </div>
      </main>
    </div>
  );
} 