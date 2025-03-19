"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { getTutorDashboardLessons } from "@/firebase/firestore";
import { convertToDate } from "@/utils/dateUtils";
import TutorLessonActions from "./TutorLessonActions";

// Define the TutorLesson interface based on what's actually used in the component
interface TutorLesson {
  id: string;
  date: any; // Date or Timestamp
  status: string;
  duration: number;
  studentId?: string;
  studentName?: string;
  courseCode?: string;
  course?: string;
  tutorId?: string;
}

interface TutorLessonsComponentProps {
  tutorId: string;
  showAllLessonsLink?: boolean;
}

export default function TutorLessonsComponent({
  tutorId,
  showAllLessonsLink = true,
}: TutorLessonsComponentProps) {
  const [awaitingLessons, setAwaitingLessons] = useState<any[]>([]);
  const [upcomingLessons, setUpcomingLessons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Load lessons from Firestore with optimized queries
  const loadLessons = useCallback(async () => {
    try {
      console.log(`Loading dashboard lessons for tutor ${tutorId}...`);
      setLoading(true);
      setError("");
      
      // Use the new optimized function that fetches both lesson types in separate queries
      const result = await getTutorDashboardLessons(tutorId);
      
      console.log(`Loaded ${result.awaitingLessons.length} awaiting lessons and ${result.upcomingLessons.length} upcoming lessons`);
      
      setAwaitingLessons(result.awaitingLessons);
      setUpcomingLessons(result.upcomingLessons);
    } catch (error) {
      console.error("Error loading lessons:", error);
      setError("Failed to load lessons. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [tutorId]);
  
  // Function to refresh lessons (e.g., after completing or cancelling a lesson)
  const refreshLessons = async () => {
    try {
      await loadLessons();
    } catch (error) {
      console.error("Error refreshing lessons:", error);
      setError("Failed to refresh lessons.");
    }
  };
  
  // Load lessons when tutorId changes or when component mounts
  useEffect(() => {
    if (tutorId) {
      loadLessons();
    }
    
    // Clean up function to handle component unmount
    return () => {
      // Clear any session storage caching if needed
      if (typeof window !== "undefined" && window.sessionStorage) {
        try {
          const cacheKeys = Object.keys(sessionStorage);
          for (const key of cacheKeys) {
            if (key.startsWith(`tutor_lessons_${tutorId}_`)) {
              console.log(`Cleaning up cache key: ${key}`);
              setTimeout(() => {
                try {
                  sessionStorage.removeItem(key);
                } catch (err) {
                  console.warn("Error clearing cache:", err);
                }
              }, 500);
            }
          }
        } catch (err) {
          console.warn("Error clearing cache:", err);
        }
      }
    }
  }, [tutorId, loadLessons]);
  
  // Render function with stacked layout
  return (
    <div className="grid grid-cols-1 gap-8">
      {/* Awaiting Submission Section */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-4">
          <h2 className="text-xl font-bold mb-4">Lessons Awaiting Submission</h2>

          {loading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="mt-2 text-gray-500">Loading lessons...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="text-red-500 mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <p className="text-red-600 font-medium">{error}</p>
              <button 
                onClick={refreshLessons} 
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Try Again
              </button>
            </div>
          ) : awaitingLessons.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No lessons awaiting submission found.</p>
            </div>
          ) : (
            <div>
              {/* Awaiting lessons list */}
              <div className="divide-y divide-gray-200">
                {awaitingLessons.map((lesson) => {
                  // Safety check for invalid lessons
                  if (!lesson || !lesson.date) return null;
                  
                  const lessonDate = convertToDate(lesson.date);
                  const dayOfWeek = lessonDate.toLocaleDateString('en-US', { weekday: 'short' });
                  const dayOfMonth = lessonDate.getDate();
                  const month = lessonDate.toLocaleDateString('en-US', { month: 'short' });
                  const formattedTime = lessonDate.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  
                  // Status indicator classes
                  const statusClasses = "bg-orange-100 text-orange-800";
                  const statusText = "Awaiting Submission";
                    
                  return (
                    <div
                      key={lesson.id}
                      className="py-3 flex flex-wrap items-center border-l-4 pl-3 hover:bg-gray-50 transition-colors duration-150"
                      style={{ borderLeftColor: "#F97316" }}
                    >
                      {/* Date & Time - Left side */}
                      <div className="w-36 flex-shrink-0">
                        <div className="flex items-center">
                          <div className="text-gray-800 font-medium">
                            {dayOfWeek} {month} {dayOfMonth}
                          </div>
                        </div>
                        <div className="text-gray-600 text-sm">
                          {formattedTime} • {lesson.duration} min
                        </div>
                      </div>
                      
                      {/* Student & Course - Middle */}
                      <div className="flex-grow px-4">
                        <div className="flex items-center">
                          <span className="font-medium text-gray-800">{lesson.studentName || "Unknown Student"}</span>
                        </div>
                        <div className="text-gray-600 text-sm">{lesson.courseCode || lesson.course}</div>
                      </div>
                      
                      {/* Actions - Right side */}
                      <div className="flex-shrink-0 flex flex-col space-y-2 mt-2 sm:mt-0 min-w-[200px]">
                        <Link href={`/tutor/lessons/${lesson.id}`} className="w-full text-center bg-white text-gray-800 border border-orange-600 hover:bg-orange-50 px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer">
                          View Details
                        </Link>
                        <div>
                          <TutorLessonActions 
                            lesson={lesson} 
                            onActionComplete={refreshLessons} 
                            compact={true}
                            activeTab="awaiting"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Upcoming Lessons Section */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-4">
          <h2 className="text-xl font-bold mb-4">Upcoming Lessons</h2>
          
          {/* Policy Info Panel */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 pt-0.5">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-2">
                <p className="text-sm text-blue-800 font-medium">Cancellation Policy</p>
                <p className="text-xs text-gray-600">
                  You may cancel lessons up to 24 hours before the scheduled start time. 
                  Within the 24-hour window, cancellation is not available. This policy helps 
                  ensure students can rely on their scheduled lessons while giving you flexibility 
                  when needed.
                </p>
              </div>
            </div>
          </div>
          
          {loading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="mt-2 text-gray-500">Loading lessons...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="text-red-500 mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <p className="text-red-600 font-medium">{error}</p>
              <button 
                onClick={refreshLessons} 
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Try Again
              </button>
            </div>
          ) : upcomingLessons.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No upcoming lessons found.</p>
            </div>
          ) : (
            <div>
              {/* Upcoming lessons list */}
              <div className="divide-y divide-gray-200">
                {upcomingLessons.map((lesson) => {
                  // Safety check for invalid lessons
                  if (!lesson || !lesson.date) return null;
                  
                  const lessonDate = convertToDate(lesson.date);
                  const dayOfWeek = lessonDate.toLocaleDateString('en-US', { weekday: 'short' });
                  const dayOfMonth = lessonDate.getDate();
                  const month = lessonDate.toLocaleDateString('en-US', { month: 'short' });
                  const formattedTime = lessonDate.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  
                  // Status indicator classes
                  const statusClasses = 
                    lesson.status === "rescheduled" ? "bg-yellow-100 text-yellow-800" : "bg-blue-100 text-blue-800";
                  
                  const statusText = lesson.status === "rescheduled" 
                    ? "Rescheduled" 
                    : "Scheduled";
                    
                  return (
                    <div
                      key={lesson.id}
                      className="py-3 flex flex-wrap items-center border-l-4 pl-3 hover:bg-gray-50 transition-colors duration-150"
                      style={{ 
                        borderLeftColor: lesson.status === "rescheduled" ? "#F59E0B" : "#3B82F6"
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
                          {formattedTime} • {lesson.duration} min
                        </div>
                      </div>
                      
                      {/* Student & Course - Middle */}
                      <div className="flex-grow px-4">
                        <div className="flex items-center">
                          <span className="font-medium text-gray-800">{lesson.studentName || "Unknown Student"}</span>
                        </div>
                        <div className="text-gray-600 text-sm">{lesson.courseCode || lesson.course}</div>
                      </div>
                      
                      {/* Actions - Right side */}
                      <div className="flex-shrink-0 flex flex-col space-y-2 mt-2 sm:mt-0 min-w-[200px]">
                        <Link href={`/tutor/lessons/${lesson.id}`} className="w-full text-center bg-white text-gray-800 border border-blue-600 hover:bg-blue-50 px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer">
                          View Details
                        </Link>
                        <div>
                          <TutorLessonActions 
                            lesson={lesson} 
                            onActionComplete={refreshLessons} 
                            compact={true}
                            activeTab="upcoming"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Link to all lessons */}
              {showAllLessonsLink && (
                <div className="mt-4 text-center">
                  <Link href="/tutor/lessons" className="text-blue-600 hover:text-blue-800 font-medium inline-flex items-center">
                    View all upcoming lessons
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 