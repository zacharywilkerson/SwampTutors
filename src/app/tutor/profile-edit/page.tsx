"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../../../firebase/config";
import { useAuth } from "../../../hooks/useAuth";
import { useTutorRedirect } from "../../../hooks/useTutorRedirect";
import { ALL_COURSES } from "../../../constants/courses";

export default function TutorProfileEdit() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { isLoading: redirectLoading, hasCheckedStatus } = useTutorRedirect(['/tutor/profile-setup', '/tutor/profile-pending']);
  
  const [formData, setFormData] = useState({
    bio: "",
    education: "",
    hourlyRate: 50,
  });
  
  const [tutorData, setTutorData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    // Don't fetch if we're still checking redirect status
    if (redirectLoading || !hasCheckedStatus) return;
    
    // Redirect if not logged in
    if (!authLoading && !user) {
      router.push('/tutor/signup/how-it-works');
      return;
    }
    
    const fetchTutorData = async () => {
      if (user) {
        try {
          setLoading(true);
          const tutorDoc = await getDoc(doc(db, 'tutors', user.uid));
          
          if (tutorDoc.exists()) {
            const data = tutorDoc.data();
            setTutorData(data);
            
            // Initialize form data
            setFormData({
              bio: data.bio || "",
              education: data.education || "",
              hourlyRate: data.hourlyRate || 50,
            });
          } else {
            // If tutor document doesn't exist, redirect to profile setup
            router.push('/tutor/signup/how-it-works');
          }
        } catch (error) {
          console.error("Error fetching tutor data:", error);
          setErrorMessage("Failed to load your profile data. Please try refreshing the page.");
        } finally {
          setLoading(false);
        }
      }
    };
    
    fetchTutorData();
  }, [user, authLoading, router, redirectLoading, hasCheckedStatus]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name === 'hourlyRate') {
      if (value === '') {
        // Allow empty input temporarily
        setFormData(prev => ({
          ...prev,
          hourlyRate: value as any // Allow empty string temporarily
        }));
      } else {
        // Only convert to number and validate if there's actually input
        const rate = Math.max(1, Math.min(120, Number(value) || 65));
        setFormData(prev => ({
          ...prev,
          hourlyRate: rate
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    
    try {
      setSaving(true);
      setErrorMessage("");
      setSuccessMessage("");
      
      // Validate hourly rate before submission
      const validatedFormData = {
        ...formData,
        hourlyRate: typeof formData.hourlyRate === 'string' || formData.hourlyRate < 1 ? 65 : formData.hourlyRate
      };
      
      // Update tutor profile in Firestore
      await updateDoc(doc(db, 'tutors', user.uid), {
        bio: validatedFormData.bio,
        education: validatedFormData.education,
        hourlyRate: validatedFormData.hourlyRate
      });
      
      setSuccessMessage("Profile updated successfully!");
      
      // Update local state with validated data
      setTutorData((prev: any) => ({
        ...prev,
        bio: validatedFormData.bio,
        education: validatedFormData.education,
        hourlyRate: validatedFormData.hourlyRate
      }));
      
    } catch (error) {
      console.error("Error updating profile:", error);
      setErrorMessage("Failed to update profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Helper to get course details from course IDs
  const getCourseDetails = (courseIds: string[]) => {
    return courseIds.map(id => {
      const course = ALL_COURSES.find(c => c.id === id);
      return course || { id, description: "Unknown Course" };
    });
  };

  if (loading || authLoading || redirectLoading || !hasCheckedStatus) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  // Extract course lists
  const approvedCourses = tutorData?.approvedCourses || [];
  const pendingCourses = tutorData?.pendingCourses || [];
  const coursesTaught = tutorData?.coursesTaught || [];
  
  // Find rejected courses (in coursesTaught but not in approvedCourses or pendingCourses)
  const rejectedCourses = coursesTaught.filter(
    (course: string) => !approvedCourses.includes(course) && !pendingCourses.includes(course)
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Edit Your Tutor Profile</h1>
            <Link 
              href={`/tutor/${user?.uid}`}
              className="text-blue-600 hover:text-blue-800"
            >
              View Public Profile
            </Link>
          </div>
          
          {successMessage && (
            <div className="mb-6 bg-green-100 text-green-800 p-4 rounded">
              {successMessage}
            </div>
          )}
          
          {errorMessage && (
            <div className="mb-6 bg-red-100 text-red-800 p-4 rounded">
              {errorMessage}
            </div>
          )}
          
          <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">Personal Information</h2>
              <p className="text-gray-600 mt-1">Update your profile information</p>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div>
                <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
                  Bio
                </label>
                <textarea
                  id="bio"
                  name="bio"
                  rows={4}
                  value={formData.bio}
                  onChange={handleInputChange}
                  placeholder="Tell students about your teaching style, experience, and qualifications..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label htmlFor="education" className="block text-sm font-medium text-gray-700 mb-1">
                  Education
                </label>
                <input
                  type="text"
                  id="education"
                  name="education"
                  value={formData.education}
                  onChange={handleInputChange}
                  placeholder="e.g., Computer Science, University of Florida"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label htmlFor="hourlyRate" className="block text-sm font-medium text-gray-700 mb-1">
                  Hourly Rate (USD)
                </label>
                <div className="flex items-center">
                  <span className="px-3 py-2 bg-gray-100 border border-gray-300 border-r-0 rounded-l-md">$</span>
                  <input
                    type="number"
                    id="hourlyRate"
                    name="hourlyRate"
                    min="1"
                    max="120"
                    value={formData.hourlyRate}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-r-md shadow-sm text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  Set your hourly tutoring rate.
                </p>
              </div>
              
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
          
          <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
            <div className="p-6 border-b flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Your Courses</h2>
                <p className="text-gray-600 mt-1">Manage the courses you teach</p>
              </div>
              <Link
                href="/tutor/course-request"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Request New Courses
              </Link>
            </div>
            
            <div className="p-6">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Approved Courses</h3>
                {approvedCourses.length > 0 ? (
                  <div className="space-y-2">
                    {getCourseDetails(approvedCourses).map((course: any) => (
                      <div key={course.id} className="p-3 rounded-lg border border-green-200 bg-green-50">
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="font-medium">{course.id}</span>
                            <span className="ml-2 text-gray-600">{course.description}</span>
                          </div>
                          <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-800">
                            Approved
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">You don't have any approved courses yet.</p>
                )}
              </div>
              
              {pendingCourses.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Pending Courses</h3>
                  <div className="space-y-2">
                    {getCourseDetails(pendingCourses).map((course: any) => (
                      <div key={course.id} className="p-3 rounded-lg border border-yellow-200 bg-yellow-50">
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="font-medium">{course.id}</span>
                            <span className="ml-2 text-gray-600">{course.description}</span>
                          </div>
                          <span className="px-2 py-1 text-xs rounded bg-yellow-100 text-yellow-800">
                            Pending Approval
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {rejectedCourses.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Rejected Courses</h3>
                  <div className="space-y-2">
                    {getCourseDetails(rejectedCourses).map((course: any) => (
                      <div key={course.id} className="p-3 rounded-lg border border-red-200 bg-red-50">
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="font-medium">{course.id}</span>
                            <span className="ml-2 text-gray-600">{course.description}</span>
                          </div>
                          <span className="px-2 py-1 text-xs rounded bg-red-100 text-red-800">
                            Not Approved
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">Account Settings</h2>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                <Link 
                  href="/account/change-password" 
                  className="text-blue-600 hover:text-blue-800 flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                  Change Password
                </Link>
                
                <button 
                  onClick={() => router.push('/tutor/dashboard')}
                  className="text-gray-600 hover:text-gray-800 flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Back to Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 