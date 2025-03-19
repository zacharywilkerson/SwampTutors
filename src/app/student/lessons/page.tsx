"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../../hooks/useAuth";
import { getUserLessons } from "../../../firebase";
import { convertToDate } from "../../../utils/dateUtils";

export default function StudentLessons() {
  const router = useRouter();
  const { user, userRole, loading: authLoading } = useAuth();
  
  const [lessons, setLessons] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastVisible, setLastVisible] = useState<any>(null);
  const [hasMore, setHasMore] = useState(false);
  const [expandedNotes, setExpandedNotes] = useState<{[key: string]: boolean}>({});
  
  const LESSONS_PER_PAGE = 5;
  
  // Check auth and fetch lessons
  useEffect(() => {
    // Skip if auth is still loading
    if (authLoading) return;
    
    // Redirect if not logged in or not a student
    if (!user || userRole !== "student") {
      router.push("/login");
      return;
    }
    
    // Fetch completed lessons
    fetchLessons();
  }, [user, userRole, authLoading, router]);
  
  // Fetch initial lessons (past/completed only)
  const fetchLessons = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Get completed lessons - true for pastOnly, false for upcomingOnly
      const result = await getUserLessons(user.uid, LESSONS_PER_PAGE, true, false);
      
      setLessons(result.lessons);
      setLastVisible(result.lastVisible);
      setHasMore(result.hasMore);
    } catch (error) {
      console.error("Error fetching lessons:", error);
    } finally {
      setLoading(false);
    }
  };
  
  // Load more lessons when user clicks "View More"
  const loadMoreLessons = async () => {
    if (!user || !lastVisible) return;
    
    try {
      setLoadingMore(true);
      
      // Get more lessons starting after the last visible document
      const result = await getUserLessons(user.uid, LESSONS_PER_PAGE, true, false, lastVisible);
      
      // Append new lessons to existing lessons
      setLessons([...lessons, ...result.lessons]);
      setLastVisible(result.lastVisible);
      setHasMore(result.hasMore);
    } catch (error) {
      console.error("Error loading more lessons:", error);
    } finally {
      setLoadingMore(false);
    }
  };
  
  // Toggle the expanded state of a lesson's notes
  const toggleNotes = (lessonId: string) => {
    setExpandedNotes(prev => ({
      ...prev,
      [lessonId]: !prev[lessonId]
    }));
  };
  
  // Show loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6 border-b">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold">My Lessons</h1>
                <p className="text-gray-600 mt-1">
                  View your completed tutoring sessions
                </p>
              </div>
              <Link
                href="/student/dashboard"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
          
          {/* Lessons list */}
          <div className="p-6">
            {loading ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="mt-2 text-gray-500">Loading lessons...</p>
              </div>
            ) : lessons.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">You don't have any completed lessons yet.</p>
                <Link
                  href="/search"
                  className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Find a Tutor
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {lessons.map((lesson) => {
                  // Use convertToDate utility for consistent date handling
                  const lessonDate = convertToDate(lesson.date || lesson.startTime);
                  const dayOfWeek = lessonDate.toLocaleDateString('en-US', { weekday: 'short' });
                  const dayOfMonth = lessonDate.getDate();
                  const month = lessonDate.toLocaleDateString('en-US', { month: 'short' });
                  const formattedTime = lessonDate.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  
                  // Format duration based on available data
                  let duration = "60 min"; // Default
                  if (lesson.duration) {
                    duration = `${lesson.duration} min`;
                  } else if (lesson.startTime && lesson.endTime) {
                    const start = convertToDate(lesson.startTime);
                    const end = convertToDate(lesson.endTime);
                    const durationInMinutes = Math.round((end.getTime() - start.getTime()) / 60000);
                    duration = `${durationInMinutes} min`;
                  }
                  
                  // Check if this lesson has any notes to display
                  const hasNotes = lesson.notes || lesson.completionNotes || lesson.cancellationReason || (lesson.originalDate && lesson.status === 'rescheduled');
                  const isExpanded = expandedNotes[lesson.id] || false;
                  
                  return (
                    <div
                      key={lesson.id}
                      className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200"
                    >
                      <div className="py-3 flex flex-wrap items-center border-l-4 pl-3 hover:bg-gray-50 transition-colors duration-150"
                        style={{ 
                          borderLeftColor: 
                            lesson.status === "cancelled" ? "#EF4444" :
                            "#10B981" // Default to green for past lessons
                        }}
                      >
                        {/* Date & Time - Left side */}
                        <div className="w-36 flex-shrink-0">
                          <div className="flex items-center">
                            <div className="text-gray-800 font-medium">
                              {dayOfWeek} {month} {dayOfMonth}
                            </div>
                          </div>
                          <div className="text-gray-600 text-sm">
                            {formattedTime} • {duration}
                          </div>
                        </div>
                        
                        {/* Tutor & Course - Middle */}
                        <div className="flex-grow px-4">
                          <div className="flex items-center">
                            <span className="font-medium text-gray-800">{lesson.tutorName || "Unknown Tutor"}</span>
                          </div>
                          <div className="text-gray-600 text-sm">{lesson.courseId || lesson.courseCode || "Unknown Course"}</div>
                          
                          {/* Notes toggle button - only show if there are notes */}
                          {hasNotes && (
                            <button
                              onClick={() => toggleNotes(lesson.id)}
                              className="mt-1 text-xs text-blue-600 hover:text-blue-800 inline-flex items-center px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                            >
                              {isExpanded ? "Hide Lesson Notes" : "View Lesson Notes"}
                              <svg 
                                xmlns="http://www.w3.org/2000/svg" 
                                viewBox="0 0 20 20" 
                                fill="currentColor" 
                                className={`h-4 w-4 ml-1 transform transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                              >
                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            </button>
                          )}
                        </div>
                        
                        {/* Actions - Right side */}
                        <div className="flex-shrink-0 flex space-x-2">
                          <Link
                            href={`/student/lessons/${lesson.id}`}
                            className="bg-white text-gray-800 border border-green-600 hover:bg-green-50 px-4 py-2 rounded-md text-sm font-medium transition-colors"
                          >
                            View Details
                          </Link>
                          
                          {lesson.reviewed ? (
                            <span className="bg-gray-100 text-gray-600 px-4 py-2 rounded-md text-sm font-medium flex items-center">
                              Reviewed ✓
                            </span>
                          ) : (
                            <Link
                              href={`/student/lessons/${lesson.id}`}
                              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                            >
                              Leave Review
                            </Link>
                          )}
                        </div>
                      </div>
                      
                      {/* Collapsible Notes Section */}
                      {hasNotes && isExpanded && (
                        <div className="bg-gray-50 px-5 py-3 border-t border-gray-200 transition-all duration-300 ease-in-out">
                          <div className="space-y-3">
                            {lesson.originalDate && lesson.status === 'rescheduled' && (
                              <div>
                                <h4 className="text-sm font-semibold text-gray-600 mb-1">Originally Scheduled For</h4>
                                <div className="text-sm text-gray-700 bg-gray-100 p-2 rounded-md">
                                  <span className="font-medium">Rescheduled from:</span>{" "}
                                  {convertToDate(lesson.originalDate).toLocaleString([], {
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </div>
                              </div>
                            )}
                            
                            {lesson.completionNotes && (
                              <div>
                                <h4 className="text-sm font-semibold text-gray-600 mb-1">Lesson Notes</h4>
                                <div className="text-sm text-gray-700 p-2 rounded-md">
                                  {lesson.completionNotes}
                                </div>
                              </div>
                            )}
                            
                            {lesson.cancellationReason && (
                              <div>
                                <h4 className="text-sm font-semibold text-gray-600 mb-1">Cancellation Reason</h4>
                                <div className="text-sm text-gray-700 bg-gray-100 p-2 rounded-md">
                                  {lesson.cancellationReason}
                                </div>
                              </div>
                            )}
                            
                            {lesson.notes && (
                              <div>
                                <h4 className="text-sm font-semibold text-gray-600 mb-1">Booking Notes</h4>
                                <div className="text-sm text-gray-700 bg-gray-100 p-2 rounded-md">
                                  {lesson.notes}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                
                {/* View More button */}
                {hasMore && (
                  <div className="mt-6 text-center">
                    <button
                      onClick={loadMoreLessons}
                      disabled={loadingMore}
                      className={`px-6 py-2 rounded-md ${
                        loadingMore ? "bg-gray-300 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 text-white"
                      }`}
                    >
                      {loadingMore ? (
                        <span className="flex items-center justify-center">
                          <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                          Loading...
                        </span>
                      ) : (
                        "View More Lessons"
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
} 