"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../../hooks/useAuth";
import { useTutorRedirect } from "../../../hooks/useTutorRedirect";
import { getTutorLessons } from "../../../firebase";
import TutorLessonActions from "../../../components/TutorLessonActions";
import { convertToDate } from "../../../utils/dateUtils";

export default function TutorLessons() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { isLoading: redirectLoading, hasCheckedStatus } = useTutorRedirect(['/tutor/profile-setup', '/tutor/profile-pending']);
  
  const [lessons, setLessons] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("upcoming");
  
  // Check auth and fetch lessons
  useEffect(() => {
    // Skip if auth is still loading or redirect check hasn't completed
    if (authLoading || redirectLoading || !hasCheckedStatus) return;
    
    // Redirect if not logged in (handled by useTutorRedirect for role/status checks)
    if (!user) {
      router.push("/login");
      return;
    }
    
    // Fetch tutor lessons
    const fetchLessons = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        const lessonsData = await getTutorLessons(user.uid);
        setLessons(lessonsData);
      } catch (error) {
        console.error("Error fetching lessons:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchLessons();
  }, [user, authLoading, redirectLoading, hasCheckedStatus, router]);
  
  // Filter lessons based on active tab - Updated with "awaiting submission" for tutors
  const filteredLessons = lessons.filter(lesson => {
    const lessonDate = convertToDate(lesson.date);
    const now = new Date();
    
    if (activeTab === "upcoming") {
      // Show all future lessons regardless of status (except completed/cancelled)
      return lessonDate > now && lesson.status !== "completed" && lesson.status !== "cancelled";
    } else if (activeTab === "awaiting") {
      // Show past lessons that haven't been marked as completed or cancelled
      return lessonDate < now && 
             lesson.status !== "completed" && 
             lesson.status !== "cancelled";
    } else if (activeTab === "completed") {
      // Show all completed lessons or cancelled lessons
      return lesson.status === "completed" || lesson.status === "cancelled";
    }
    return true;
  }).sort((a, b) => {
    // Convert both dates to Date objects
    const dateA = convertToDate(a.date);
    const dateB = convertToDate(b.date);
    
    // For upcoming lessons, sort in ascending order (earlier dates first)
    if (activeTab === "upcoming") {
      return dateA.getTime() - dateB.getTime();
    }
    
    // For awaiting and completed lessons, sort in descending order (most recent first)
    return dateB.getTime() - dateA.getTime();
  });
  
  // Show loading state
  if (authLoading || redirectLoading || !hasCheckedStatus) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  
  // Function to refresh lessons after an action
  const refreshLessons = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const lessonsData = await getTutorLessons(user.uid);
      setLessons(lessonsData);
    } catch (error) {
      console.error("Error refreshing lessons:", error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6 border-b">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold">My Lessons</h1>
                <p className="text-gray-600 mt-1">
                  View and manage your scheduled tutoring sessions
                </p>
              </div>
            </div>
          </div>
          
          {/* Updated tabs for tutors - Upcoming, Awaiting Submission, Completed */}
          <div className="border-b">
            <div className="flex">
              <button
                onClick={() => setActiveTab("upcoming")}
                className={`px-6 py-3 text-sm font-medium ${
                  activeTab === "upcoming"
                    ? "border-b-2 border-blue-600 text-blue-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Upcoming
              </button>
              <button
                onClick={() => setActiveTab("awaiting")}
                className={`px-6 py-3 text-sm font-medium ${
                  activeTab === "awaiting"
                    ? "border-b-2 border-blue-600 text-blue-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Awaiting Submission
              </button>
              <button
                onClick={() => setActiveTab("completed")}
                className={`px-6 py-3 text-sm font-medium ${
                  activeTab === "completed"
                    ? "border-b-2 border-blue-600 text-blue-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Completed
              </button>
            </div>
          </div>
          
          {/* Lessons list */}
          <div className="p-6">
            {loading ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="mt-2 text-gray-500">Loading lessons...</p>
              </div>
            ) : filteredLessons.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No {activeTab === "awaiting" ? "lessons awaiting submission" : activeTab + " lessons"} found.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredLessons.map((lesson) => {
                  const lessonDate = convertToDate(lesson.date);
                  const formattedDate = lessonDate.toLocaleDateString();
                  const formattedTime = lessonDate.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  
                  // Determine border color based on status
                  const borderColorClass = 
                    lesson.status === "completed" ? "border-l-green-500" :
                    lesson.status === "cancelled" ? "border-l-red-500" :
                    lesson.status === "rescheduled" ? "border-l-yellow-500" :
                    activeTab === "awaiting" ? "border-l-orange-500" :
                    "border-l-blue-500";
                    
                  return (
                    <div
                      key={lesson.id}
                      className={`bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200 ${borderColorClass} border-l-4`}
                    >
                      <div className="p-5">
                        {/* Status badge - moved to top right for more visibility */}
                        <div className="flex justify-between items-start mb-4">
                          <h2 className="text-lg font-semibold text-gray-800">{lesson.courseCode}</h2>
                          <span
                            className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${
                              lesson.status === "completed"
                                ? "bg-green-100 text-green-800"
                                : lesson.status === "cancelled"
                                ? "bg-red-100 text-red-800"
                                : lesson.status === "rescheduled"
                                ? "bg-yellow-100 text-yellow-800"
                                : activeTab === "awaiting"
                                ? "bg-orange-100 text-orange-800"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {activeTab === "awaiting" && lesson.status !== "completed" && lesson.status !== "cancelled"
                              ? "Awaiting Submission"
                              : lesson.status.charAt(0).toUpperCase() + lesson.status.slice(1)}
                          </span>
                        </div>
                        
                        {/* Main information grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-4">
                          <div className="flex flex-col">
                            <div className="flex items-center mb-2">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <h3 className="text-sm font-semibold text-gray-600">Date & Time</h3>
                            </div>
                            <p className="text-gray-800 font-medium">
                              {formattedDate} at {formattedTime}
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                              {lesson.duration} minutes
                            </p>
                          </div>
                          
                          <div className="flex flex-col">
                            <div className="flex items-center mb-2">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                              <h3 className="text-sm font-semibold text-gray-600">Student</h3>
                            </div>
                            <p className="text-gray-800 font-medium">{lesson.studentName}</p>
                          </div>
                        </div>
                      
                        {/* Notes section with improved styling */}
                        {(lesson.notes || lesson.completionNotes || lesson.cancellationReason) && (
                          <div className="mt-4 pt-4 border-t border-gray-100">
                            {lesson.completionNotes && (
                              <div className="mb-3">
                                <h3 className="text-sm font-semibold text-gray-600 mb-1">Completion Notes</h3>
                                <p className="text-gray-700 bg-gray-50 p-2 rounded">{lesson.completionNotes}</p>
                              </div>
                            )}
                            {lesson.cancellationReason && (
                              <div className="mb-3">
                                <h3 className="text-sm font-semibold text-gray-600 mb-1">Cancellation Reason</h3>
                                <p className="text-gray-700 bg-gray-50 p-2 rounded">{lesson.cancellationReason}</p>
                              </div>
                            )}
                            {lesson.notes && (
                              <div className="mb-3">
                                <h3 className="text-sm font-semibold text-gray-600 mb-1">Booking Notes</h3>
                                <p className="text-gray-700 bg-gray-50 p-2 rounded">{lesson.notes}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {/* Lesson actions */}
                      <TutorLessonActions lesson={lesson} onActionComplete={refreshLessons} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
} 