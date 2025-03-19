"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../../hooks/useAuth";
import { getDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "../../../firebase/config";
import { convertToDate } from "../../../utils/dateUtils";
import StudentLessonActions from "../../../components/StudentLessonActions";
import TutorLessonActions from "../../../components/TutorLessonActions";
import StarRating from "../../../components/StarRating";

// Define TypeScript interfaces
interface LessonData {
  id: string;
  tutorId: string;
  studentId: string;
  tutorName: string;
  studentName: string;
  status: string;
  date: string;
  duration: number;
  courseCode: string;
  notes?: string;
  location?: string;
  originalDate?: string;
  completionNotes?: string;
  cancellationReason?: string;
  paymentStatus?: string;
  price?: number;
  paymentCapturedAt?: string;
  reviewed?: boolean;
  review?: {
    rating: number;
    comment: string;
    studentId: string;
    createdAt: string;
  };
}

// Helper function to get a single lesson by ID
const getLessonById = async (lessonId: string): Promise<LessonData> => {
  try {
    const lessonDoc = await getDoc(doc(db, 'lessons', lessonId));
    
    if (!lessonDoc.exists()) {
      throw new Error('Lesson not found');
    }
    
    const lessonData = lessonDoc.data();
    
    // Get tutor data
    const tutorDoc = await getDoc(doc(db, 'users', lessonData.tutorId));
    const tutorData = tutorDoc.exists() ? tutorDoc.data() : null;
    
    // Get student data
    const studentDoc = await getDoc(doc(db, 'users', lessonData.studentId));
    const studentData = studentDoc.exists() ? studentDoc.data() : null;
    
    return {
      id: lessonDoc.id,
      ...lessonData,
      tutorName: tutorData?.displayName || 'Unknown Tutor',
      studentName: studentData?.displayName || 'Unknown Student',
    } as LessonData;
  } catch (error) {
    console.error('Error getting lesson by ID:', error);
    throw error;
  }
};

// Function to submit a review
const submitLessonReview = async (lessonId: string, tutorId: string, review: {
  rating: number;
  comment: string;
  studentId: string;
}) => {
  try {
    // Update the lesson with review data
    await updateDoc(doc(db, 'lessons', lessonId), {
      review: {
        ...review,
        createdAt: new Date().toISOString(),
      },
      reviewed: true
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error submitting review:', error);
    throw error;
  }
};

export default function LessonDetails() {
  // Use the useParams hook instead of receiving params as a prop
  const params = useParams();
  const lessonId = params.id as string;
  
  const router = useRouter();
  const { user, userRole, loading: authLoading } = useAuth();
  
  const [lesson, setLesson] = useState<LessonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Review form state (for student reviews)
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewSuccess, setReviewSuccess] = useState<string | null>(null);
  
  // Redirect to the appropriate role-specific URL
  useEffect(() => {
    // Skip if auth is still loading
    if (authLoading) return;
    
    // If user is logged in and has a role, redirect to the appropriate URL
    if (user && userRole) {
      // Get the current URL path
      const currentPath = window.location.pathname;
      
      // Check if we're already at the role-specific URL
      const isAtRoleSpecificUrl = currentPath.includes(`/student/lessons/`) || 
                                 currentPath.includes(`/tutor/lessons/`);
      
      if (!isAtRoleSpecificUrl) {
        if (userRole === 'student') {
          router.push(`/student/lessons/${lessonId}`);
        } else if (userRole === 'tutor') {
          router.push(`/tutor/lessons/${lessonId}`);
        }
      }
    }
  }, [user, userRole, lessonId, authLoading, router]);
  
  // Log for debugging
  useEffect(() => {
    if (lesson && userRole === 'student') {
      console.log('Debug student review state:', {
        userRole,
        lessonStatus: lesson.status,
        isStudentMatch: user?.uid === lesson.studentId,
        reviewed: lesson.reviewed,
        showReviewForm
      });
    }
  }, [lesson, userRole, user, showReviewForm]);
  
  // Check auth and fetch lesson details
  useEffect(() => {
    // Skip if auth is still loading
    if (authLoading) return;
    
    // Redirect if not logged in
    if (!user) {
      router.push("/login");
      return;
    }
    
    const fetchLessonDetails = async () => {
      try {
        setLoading(true);
        const lessonData = await getLessonById(lessonId);
        
        // Check if the user is authorized to view this lesson
        if (user.uid !== lessonData.studentId && user.uid !== lessonData.tutorId && userRole !== 'admin') {
          setError('You are not authorized to view this lesson');
          setLoading(false);
          return;
        }
        
        // Set the lesson data first
        setLesson(lessonData);
        
        // If this is a completed lesson for a student, check if they can review it
        if (userRole === 'student' && 
            lessonData.status === 'completed' && 
            user.uid === lessonData.studentId && 
            !lessonData.reviewed) {
          console.log('Setting showReviewForm to true - conditions met:',
            'userRole=', userRole,
            'status=', lessonData.status,
            'matchingIDs=', user.uid === lessonData.studentId,
            'not yet reviewed=', !lessonData.reviewed
          );
          setShowReviewForm(true);
        } else {
          console.log('Review form not shown. Conditions:',
            'userRole=', userRole,
            'status=', lessonData.status,
            'matchingIDs=', user?.uid === lessonData.studentId,
            'not yet reviewed=', !lessonData.reviewed
          );
          setShowReviewForm(false);
        }
        
        setError(null);
      } catch (error) {
        console.error("Error fetching lesson:", error);
        setError('Error loading lesson details. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    if (lessonId) {
      fetchLessonDetails();
    }
  }, [lessonId, user, userRole, authLoading, router]);
  
  // Handle review submission
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate input
    if (rating === 0) {
      setReviewError('Please select a rating');
      return;
    }
    
    if (comment.trim().length < 10) {
      setReviewError('Please provide a comment of at least 10 characters');
      return;
    }
    
    setIsSubmitting(true);
    setReviewError(null);
    
    try {
      if (!lesson) {
        throw new Error('Lesson data not available');
      }
      
      // Submit the review
      await submitLessonReview(lessonId, lesson.tutorId, {
        rating,
        comment,
        studentId: user!.uid
      });
      
      setReviewSuccess('Your review has been submitted successfully!');
      
      // Update the lesson data to show the review was submitted
      setLesson(prev => {
        if (!prev) return null;
        return {
          ...prev,
          reviewed: true,
          review: {
            rating,
            comment,
            studentId: user!.uid,
            createdAt: new Date().toISOString()
          }
        };
      });
      
      // Hide the review form
      setShowReviewForm(false);
    } catch (error: any) {
      console.error("Error submitting review:", error);
      setReviewError(error.message || 'Failed to submit review. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <p className="text-gray-700">Loading lesson details...</p>
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Error</h1>
          <p className="text-gray-700 mb-4">{error}</p>
          <Link href={userRole === 'student' ? '/student/lessons' : '/tutor/lessons'} className="text-blue-600 hover:underline">
            Return to Lessons
          </Link>
        </div>
      </div>
    );
  }
  
  // No lesson found state
  if (!lesson) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Lesson Not Found</h1>
          <p className="text-gray-700 mb-4">The lesson you're looking for does not exist or has been removed.</p>
          <Link href={userRole === 'student' ? '/student/lessons' : '/tutor/lessons'} className="text-blue-600 hover:underline">
            Return to Lessons
          </Link>
        </div>
      </div>
    );
  }
  
  // Format date and time
  const lessonDate = lesson ? convertToDate(lesson.date) : new Date();
  const formattedDate = lessonDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const formattedTime = lessonDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });
  
  // Determine status color classes
  const getStatusClass = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-600';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-600';
      case 'rescheduled':
        return 'bg-yellow-100 text-yellow-800 border-yellow-600';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-600';
    }
  };
  
  // Calculate statusColorClass only if lesson exists
  const statusColorClass = lesson ? getStatusClass(lesson.status) : '';
  
  // Determine if this is past and needs completion (for tutors)
  const isLessonPast = () => {
    if (!lesson) return false;
    
    const now = new Date();
    const lessonEndTime = new Date(lessonDate);
    lessonEndTime.setMinutes(lessonEndTime.getMinutes() + (lesson.duration || 60));
    return now > lessonEndTime;
  };
  
  const isPastAndNeedsCompletion = lesson && isLessonPast() && 
    (lesson.status === 'scheduled' || lesson.status === 'rescheduled') && 
    userRole === 'tutor';
  
  const isUpcoming = lesson && !isLessonPast() && 
    (lesson.status === 'scheduled' || lesson.status === 'rescheduled');
  
  // Function to refresh the lesson data
  const refreshLessonData = async () => {
    try {
      setLoading(true);
      const refreshedLesson = await getLessonById(lessonId);
      setLesson(refreshedLesson);
      
      // Check if the student can leave a review after refresh
      if (userRole === 'student' && refreshedLesson.status === 'completed' && user!.uid === refreshedLesson.studentId && !refreshedLesson.reviewed) {
        setShowReviewForm(true);
      } else {
        setShowReviewForm(false);
      }
    } catch (error) {
      console.error("Error refreshing lesson:", error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          {/* Back button */}
          <div className="mb-4">
            <Link
              href={userRole === 'student' ? '/student/lessons' : '/tutor/lessons'}
              className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Lessons
            </Link>
          </div>
          
          {/* Lesson details card */}
          <div className={`bg-white border border-gray-200 rounded-lg overflow-hidden shadow-md border-l-4 ${statusColorClass.split(' ').pop()}`}>
            <div className="p-6">
              {/* Header with status badge */}
              <div className="flex justify-between items-start mb-6">
                <h1 className="text-2xl font-bold text-gray-800">{lesson.courseCode}</h1>
                <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${statusColorClass}`}>
                  {lesson.status.charAt(0).toUpperCase() + lesson.status.slice(1)}
                </span>
              </div>
              
              {/* Main information grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Date & Time */}
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
                
                {/* Location */}
                {lesson.location && (
                  <div className="flex flex-col">
                    <div className="flex items-center mb-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <h3 className="text-sm font-semibold text-gray-600">Location</h3>
                    </div>
                    <p className="text-gray-800">{lesson.location}</p>
                  </div>
                )}
                
                {/* Tutor info */}
                <div className="flex flex-col">
                  <div className="flex items-center mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <h3 className="text-sm font-semibold text-gray-600">Tutor</h3>
                  </div>
                  <p className="text-gray-800 font-medium">{lesson.tutorName}</p>
                  {userRole === 'student' && (
                    <Link 
                      href={`/tutor/${lesson.tutorId}`}
                      className="text-blue-600 hover:text-blue-800 text-sm mt-1 inline-block"
                    >
                      View Tutor Profile
                    </Link>
                  )}
                </div>
                
                {/* Student info (visible to tutors and admin) */}
                {(userRole === 'tutor' || userRole === 'admin') && (
                  <div className="flex flex-col">
                    <div className="flex items-center mb-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                      <h3 className="text-sm font-semibold text-gray-600">Student</h3>
                    </div>
                    <p className="text-gray-800 font-medium">{lesson.studentName}</p>
                  </div>
                )}
                
                {/* Payment info (if available) */}
                {(lesson.paymentStatus || lesson.price) && (
                  <div className="flex flex-col">
                    <div className="flex items-center mb-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <h3 className="text-sm font-semibold text-gray-600">Payment</h3>
                    </div>
                    {lesson.price && (
                      <p className="text-gray-800 font-medium">
                        ${(lesson.price / 100).toFixed(2)}
                      </p>
                    )}
                    {lesson.paymentStatus && (
                      <p className={`text-sm mt-1 ${
                        lesson.paymentStatus === 'charged' ? 'text-green-600' : 
                        lesson.paymentStatus === 'pending' ? 'text-yellow-600' : 'text-gray-600'
                      }`}>
                        {lesson.paymentStatus.charAt(0).toUpperCase() + lesson.paymentStatus.slice(1)}
                      </p>
                    )}
                    {lesson.paymentCapturedAt && (
                      <p className="text-sm mt-1 text-gray-600">
                        {new Date(lesson.paymentCapturedAt).toLocaleDateString()} at {new Date(lesson.paymentCapturedAt).toLocaleTimeString()}
                      </p>
                    )}
                  </div>
                )}
              </div>
              
              {/* Notes section */}
              <div className="mt-6 pt-6 border-t border-gray-100 space-y-4">
                {/* Booking Notes */}
                {lesson.notes && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-600 mb-2">Booking Notes</h3>
                    <p className="text-gray-700 bg-gray-50 p-3 rounded">{lesson.notes}</p>
                  </div>
                )}
                
                {/* Rescheduled Info */}
                {lesson.originalDate && lesson.status === 'rescheduled' && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-600 mb-2">Rescheduled Information</h3>
                    <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
                      <p><span className="font-medium">Originally scheduled for:</span>{" "}
                        {convertToDate(lesson.originalDate).toLocaleString([], {
                          weekday: 'long',
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Lesson Notes */}
                {lesson.completionNotes && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-600 mb-2">Lesson Notes</h3>
                    <p className="text-gray-700 bg-gray-50 p-3 rounded">{lesson.completionNotes}</p>
                  </div>
                )}
                
                {/* Cancellation Reason */}
                {lesson.cancellationReason && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-600 mb-2">Cancellation Reason</h3>
                    <p className="text-gray-700 bg-gray-50 p-3 rounded">{lesson.cancellationReason}</p>
                  </div>
                )}
                
                {/* Review Section (if the lesson has been reviewed) */}
                {lesson.reviewed && lesson.review && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-600 mb-2">Student Review</h3>
                    <div className="bg-gray-50 p-3 rounded">
                      <div className="flex items-center mb-2">
                        <StarRating rating={lesson.review.rating} readOnly size="sm" />
                        <span className="ml-2 text-sm text-gray-600">
                          {lesson.review.rating} out of 5 stars
                        </span>
                      </div>
                      <p className="text-gray-700">{lesson.review.comment}</p>
                      <p className="text-xs text-gray-500 mt-2">
                        Submitted on {new Date(lesson.review.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Actions section (dependent on user role and lesson status) */}
            {userRole === 'student' && isUpcoming && (
              <div className="bg-gray-50 px-6 py-4 border-t">
                <StudentLessonActions 
                  lesson={lesson} 
                  onActionComplete={refreshLessonData} 
                />
              </div>
            )}
            
            {userRole === 'tutor' && (
              <TutorLessonActions 
                lesson={lesson} 
                onActionComplete={refreshLessonData}
                activeTab={isPastAndNeedsCompletion ? "awaiting" : "upcoming"}
              />
            )}
          </div>
          
          {/* Review form for students with completed lessons that haven't been reviewed yet */}
          {userRole === 'student' && 
           lesson && 
           lesson.status === 'completed' && 
           !lesson.reviewed && 
           showReviewForm && (
            <div className="mt-6 bg-white rounded-lg overflow-hidden shadow-md">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-800">Leave a Review</h2>
                <p className="text-gray-600 mt-1">
                  Share your experience with {lesson.tutorName} for this {lesson.courseCode} lesson
                </p>
              </div>
              
              {/* Review form */}
              <form onSubmit={handleSubmitReview} className="p-6">
                {reviewError && (
                  <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700">
                    <p>{reviewError}</p>
                  </div>
                )}
                
                {reviewSuccess && (
                  <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 text-green-700">
                    <p>{reviewSuccess}</p>
                  </div>
                )}
                
                {/* Rating */}
                <div className="mb-6">
                  <label className="block text-gray-700 font-medium mb-2">
                    Rate your experience
                  </label>
                  <div className="flex items-center">
                    <StarRating 
                      rating={rating} 
                      setRating={setRating} 
                      size="lg" 
                    />
                    <span className="ml-3 text-gray-600">
                      {rating > 0 ? `${rating} out of 5 stars` : 'Select a rating'}
                    </span>
                  </div>
                </div>
                
                {/* Comment */}
                <div className="mb-6">
                  <label className="block text-gray-700 font-medium mb-2" htmlFor="comment">
                    Your Review
                  </label>
                  <textarea
                    id="comment"
                    rows={5}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Share details about your experience with this tutor. What went well? What could have been better?"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    required
                    minLength={10}
                    disabled={isSubmitting}
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Minimum 10 characters required
                  </p>
                </div>
                
                {/* Submit button */}
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmitting || rating === 0 || comment.trim().length < 10}
                    className={`px-6 py-2 rounded-md text-white font-medium 
                      ${isSubmitting || rating === 0 || comment.trim().length < 10 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-blue-600 hover:bg-blue-700'}`}
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Review'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </main>
    </div>
  );
} 