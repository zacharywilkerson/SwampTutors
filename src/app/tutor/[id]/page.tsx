"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getTutorById } from "../../../firebase";
import { useAuth } from "../../../hooks/useAuth";
import { useTutorRedirect } from "../../../hooks/useTutorRedirect";
import { getCourseByCode, createLesson, checkExistingLessonBooking } from "../../../firebase/firestore";
import { ALL_COURSES } from "../../../constants/courses";
import TutorBookingCalendar from "../../../components/TutorBookingCalendar";
import { getStripe } from "../../../lib/stripe";

// Define the tutor type for better type safety
interface Tutor {
  id: string;
  displayName?: string;
  bio?: string;
  education?: {
    undergraduate?: {
      college?: string;
      major?: string;
      startYear?: string;
      endYear?: string;
    };
    graduate?: Array<{
      college?: string;
      degreeType?: string;
    }>;
    teachingCertificate?: boolean;
  } | string;
  hourlyRate?: number;
  rating?: number;
  reviewCount?: number;
  profileStatus?: string;
  coursesTaught?: string[];
  approvedCourses?: string[];
  pendingCourses?: string[];
}

export default function TutorProfile() {
  const { id } = useParams();
  const tutorId = id ? id.toString() : '';
  const router = useRouter();
  const { user, userRole, loading: authLoading } = useAuth();
  
  // Only apply redirect if the current user is viewing their own profile
  const isSelfView = user?.uid === tutorId;
  const { isLoading: redirectLoading, hasCheckedStatus } = useTutorRedirect(
    isSelfView ? ['/tutor/profile-setup', '/tutor/profile-pending'] : []
  );
  
  const [tutor, setTutor] = useState<Tutor | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [bookingStatus, setBookingStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [courseDetails, setCourseDetails] = useState<any[]>([]);
  const [selectedDateTime, setSelectedDateTime] = useState<Date | null>(null);

  // Check URL for booking status
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const bookingParam = urlParams.get('booking');
      const lessonId = urlParams.get('lesson_id');
      const reason = urlParams.get('reason');
      
      if (bookingParam === 'success' && lessonId) {
        setBookingStatus("success");
        
        // Optional: You could fetch the specific lesson details here if needed
        // const fetchLessonDetails = async () => {
        //   try {
        //     const lessonDetails = await getLessonById(lessonId);
        //     // Do something with lesson details if needed
        //   } catch (error) {
        //     console.error("Error fetching lesson details:", error);
        //   }
        // };
        // fetchLessonDetails();
      } else if (bookingParam === 'cancelled') {
        setBookingStatus("error");
        if (reason === 'timeout') {
          setErrorMessage("Your booking session has expired. Please try booking again.");
        } else {
          setErrorMessage("Payment was cancelled. Your lesson was not booked.");
        }
      }
      
      // Clear URL parameters after reading them
      if (bookingParam) {
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      }
    }
  }, []);

  useEffect(() => {
    // Only load tutor profile if we're not in the middle of a redirect check
    if (redirectLoading || (isSelfView && !hasCheckedStatus)) return;
    
    const fetchTutor = async () => {
      try {
        setLoading(true);
        
        if (!tutorId) {
          router.push('/404');
          return;
        }
        
        const tutorData = await getTutorById(tutorId);
        
        if (!tutorData) {
          // Handle case where tutor doesn't exist
          router.push('/404');
          return;
        }
        
        // Cast tutorData to Tutor type for type safety
        const typedTutorData = tutorData as Tutor;
        setTutor(typedTutorData);
        
        // Fetch course details
        const courseIds = typedTutorData.approvedCourses || [];
        const courseDetailsPromises = courseIds.map(async (courseId: string) => {
          const course = ALL_COURSES.find(c => c.id === courseId);
          return course || { id: courseId, description: "Unknown Course" };
        });
        
        const coursesData = await Promise.all(courseDetailsPromises);
        setCourseDetails(coursesData);
        
      } catch (error) {
        console.error("Error fetching tutor:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTutor();
  }, [tutorId, isSelfView, hasCheckedStatus, router, redirectLoading]);

  // Modified to redirect unauthenticated users to login
  const handleTimeSelected = async (dateTime: Date) => {
    setSelectedDateTime(dateTime);
    
    // Check if user is logged in
    if (!dateTime || !selectedCourse || !tutor) {
      setErrorMessage('Please select a course and time slot first');
      return;
    }
    
    // If user is not logged in, redirect to login
    if (!user) {
      router.push(`/login?returnUrl=${encodeURIComponent(`/tutor/${tutorId}`)}`);
      return;
    }
    
    // Start booking process for authenticated users
    proceedWithBooking(dateTime);
  };
  
  // Proceed with booking for authenticated users
  const proceedWithBooking = async (dateTime: Date) => {
    // Only proceed if we have all required data and user is authenticated
    if (!dateTime || !selectedCourse || !tutor || !user) {
      return;
    }
    
    // Start booking process
    setBookingStatus("loading");
    setErrorMessage('');

    try {
      console.log(`Starting booking process for ${dateTime.toISOString()}`);
      
      // Generate a booking key to prevent duplicate submissions
      const bookingKey = `booking_${tutor.id}_${user.uid}_${dateTime.toISOString()}`;
      const processingBooking = sessionStorage.getItem(bookingKey);
      
      if (processingBooking) {
        console.log(`Booking already in progress for this time slot: ${bookingKey}`);
        throw new Error('A booking is already in progress for this time slot. Please wait or refresh the page.');
      }
      
      // Set a marker to prevent duplicate submissions
      sessionStorage.setItem(bookingKey, 'true');
      
      // Calculate price
      const price = tutor.hourlyRate ? Number(tutor.hourlyRate) * 100 : 5000; // Default to $50
      
      // First, create a Payment Intent to collect payment information
      console.log('Creating payment intent');
      const createPIResponse = await fetch('/api/stripe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: price,
          metadata: {
            tutor_id: tutor.id,
            student_id: user.uid,
            course_code: selectedCourse,
            lesson_date: dateTime.toISOString(),
          }
        }),
      });
      
      const { clientSecret, paymentIntentId, error: piError } = await createPIResponse.json();
      
      if (piError) {
        console.error('Error creating payment intent:', piError);
        throw new Error(piError);
      }
      
      if (!clientSecret || !paymentIntentId) {
        throw new Error('No payment intent client secret received');
      }
      
      // Store payment intent details for redirect handling
      sessionStorage.setItem(`pi_${bookingKey}`, JSON.stringify({
        id: paymentIntentId,
        clientSecret,
        tutorId: tutor.id,
        studentId: user.uid,
        courseCode: selectedCourse,
        dateTime: dateTime.toISOString(),
        price
      }));
      
      // Load Stripe and present the payment form
      const stripe = await getStripe();
      
      if (!stripe) {
        throw new Error('Failed to load Stripe');
      }
      
      // Redirect to the payment page using the redirect method instead of confirmPayment
      // This is the correct approach for manual capture payment intents
      window.location.href = `/payment?payment_intent=${paymentIntentId}&client_secret=${clientSecret}&booking_key=${encodeURIComponent(bookingKey)}`;

    } catch (error) {
      console.error('Error booking lesson:', error);
      setBookingStatus("error");
      
      // Clear any booking marker in case of error
      if (typeof window !== 'undefined' && sessionStorage) {
        const bookingKeys = Object.keys(sessionStorage).filter(key => key.startsWith('booking_'));
        bookingKeys.forEach(key => sessionStorage.removeItem(key));
      }
      
      setErrorMessage(error instanceof Error ? error.message : 'An error occurred while booking your lesson');
      // Show error for 3 seconds, then reset to idle
      setTimeout(() => {
        setBookingStatus("idle");
      }, 3000);
    }
  };

  // Show a loading state if we're checking for redirects
  if ((isSelfView && redirectLoading) || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p>Loading tutor profile...</p>
      </div>
    );
  }

  // Check if profile needs to be set up
  if (!tutor) {
    // If the user is the owner of this profile and is a tutor
    if (user && user.uid === tutorId) {
      return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
          <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
            <h2 className="text-xl font-bold mb-4">Complete Your Profile</h2>
            <p className="text-gray-600 mb-6">
              Your tutor profile needs to be set up before students can find you.
            </p>
            <Link href="/tutor/signup/how-it-works" className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md">
              Set Up Profile
            </Link>
          </div>
        </div>
      );
    }

    // For other users
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <p className="text-xl mb-4">Tutor not found</p>
        <Link href="/" className="text-blue-600 hover:text-blue-800">
          Return to Home
        </Link>
      </div>
    );
  }

  // Check if the profile is pending review
  if (tutor.profileStatus === 'pending') {
    // If the user is the owner of this profile
    if (user && user.uid === tutorId) {
      return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
          <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
            <h2 className="text-xl font-bold mb-4">Profile Under Review</h2>
            <p className="text-gray-600 mb-6">
              Your tutor profile is currently being reviewed. You'll be notified once it's approved.
            </p>
            <Link href="/" className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md">
              Return to Home
            </Link>
          </div>
        </div>
      );
    }

    // For other users
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <p className="text-xl mb-4">This tutor profile is not available yet</p>
        <Link href="/" className="text-blue-600 hover:text-blue-800">
          Return to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Box - Tutor Basic Info */}
          <div className="bg-white rounded-lg shadow-md p-6 col-span-1">
            <div className="flex flex-col items-center text-center">
              <div className="w-32 h-32 bg-blue-200 rounded-full flex items-center justify-center text-blue-800 text-4xl font-bold mb-4">
                {tutor.displayName?.charAt(0) || "T"}
              </div>
              <h1 className="text-2xl font-bold mb-2">{tutor.displayName}</h1>
              <div className="flex items-center mt-2 mb-3">
                <span className="text-yellow-500 mr-1">★</span>
                <span>{tutor.rating?.toFixed(1) || "New"}</span>
                <span className="text-gray-400 ml-1">
                  ({tutor.reviewCount || 0} reviews)
                </span>
              </div>
              <div className="bg-gray-50 rounded-md py-2 px-4 w-full">
                <p className="font-semibold">Rate</p>
                <p className="text-lg">
                  {userRole === 'tutor' 
                    ? '$50/hour' 
                    : `$${tutor.hourlyRate || 65}/hour`
                  }
                </p>
              </div>
            </div>
          </div>
          
          {/* Right Box - Tutor Details */}
          <div className="bg-white rounded-lg shadow-md p-6 col-span-1 md:col-span-2">
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-2">About Test</h2>
                <p className="text-gray-700">
                  {tutor.bio || "No bio available"}
                </p>
              </div>
              
              <div>
                <h2 className="text-xl font-semibold mb-2">Availability</h2>
                <p className="text-gray-700">
                  No general availability information provided.
                </p>
              </div>
              
              <div>
                <h2 className="text-xl font-semibold mb-2">Education</h2>
                {tutor.education && typeof tutor.education === 'object' ? (
                  <div className="space-y-2">
                    {tutor.education.undergraduate && (
                      <div className="mb-2">
                        <h3 className="text-base font-medium">Undergraduate</h3>
                        <p className="text-gray-700">
                          {tutor.education.undergraduate.college || ""}
                          {tutor.education.undergraduate.major && tutor.education.undergraduate.college && " - "}
                          {tutor.education.undergraduate.major || ""}
                          {tutor.education.undergraduate.startYear && tutor.education.undergraduate.endYear && (
                            <span className="ml-1">({tutor.education.undergraduate.startYear} - {tutor.education.undergraduate.endYear})</span>
                          )}
                        </p>
                      </div>
                    )}
                    
                    {tutor.education.graduate && Array.isArray(tutor.education.graduate) && tutor.education.graduate.length > 0 && (
                      <div className="mb-2">
                        <h3 className="text-base font-medium">Graduate</h3>
                        {tutor.education.graduate.map((grad, index: number) => (
                          <p key={index} className="text-gray-700">
                            {grad.college || ""}
                            {grad.college && grad.degreeType && " - "}
                            {grad.degreeType || ""}
                          </p>
                        ))}
                      </div>
                    )}
                    
                    {tutor.education.teachingCertificate !== undefined && (
                      <div>
                        <h3 className="text-base font-medium">Teaching Certificate</h3>
                        <p className="text-gray-700">{tutor.education.teachingCertificate ? "Yes" : "No"}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-700">
                    {typeof tutor.education === 'string' ? tutor.education : "University of Florida"}
                  </p>
                )}
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-3">Courses</h3>
                <div className="flex flex-wrap gap-2">
                  {courseDetails.map((course: any) => (
                    <span 
                      key={course.id} 
                      className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full"
                    >
                      {course.id} - {course.description.replace(/\s\d+\sCredits?$/, '')}
                    </span>
                  ))}
                </div>
                
                {isSelfView && tutor.profileStatus === 'approved' && (
                  <div className="mt-4">
                    <Link 
                      href="/tutor/course-request" 
                      className="text-blue-600 hover:text-blue-800 flex items-center"
                    >
                      <span className="mr-1">+</span> Request to teach more courses
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Authentication Check - Show sign-up message for non-authenticated users */}
          {!user && !authLoading ? (
            <div className="bg-white rounded-lg shadow-md p-6 col-span-1 md:col-span-3">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-blue-800 mb-3">Sign in to book a lesson with {tutor.displayName}</h2>
                <p className="text-gray-700 mb-4">
                  Creating an account offers several benefits:
                </p>
                <ul className="list-disc list-inside text-gray-700 space-y-2 mb-5">
                  <li>Track and manage all your upcoming and past lessons</li>
                  <li>Access secure payment processing and transaction history</li>
                  {/* <li>Receive lesson reminders and important notifications</li> */}
                  <li>Leave reviews for tutors after completing lessons</li>
                  {/* <li>Access your personalized dashboard for a better learning experience</li> */}
                </ul>
                <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
                  <Link href={`/login?returnUrl=${encodeURIComponent(`/tutor/${tutorId}`)}`} className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg text-center transition-colors">
                    Sign In
                  </Link>
                  <Link href={`/student/register?returnUrl=${encodeURIComponent(`/tutor/${tutorId}`)}`} className="bg-white border border-blue-600 hover:bg-blue-50 text-blue-600 font-medium py-3 px-6 rounded-lg text-center transition-colors">
                    Create Account
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            // Booking Section - Only show for authenticated users who are not tutors
            userRole !== 'tutor' && (
              <div className="bg-white rounded-lg shadow-md p-6 col-span-1 md:col-span-3">
                <h2 className="text-xl font-semibold mb-4">Course Selection</h2>
                
                {bookingStatus === "success" ? (
                  <div className="bg-green-100 text-green-800 p-4 rounded mb-4">
                    <p className="font-medium">Lesson booked successfully!</p>
                    <p className="mt-2">Your request has been sent to {tutor.displayName}. You can view your upcoming lessons on your dashboard.</p>
                    <button 
                      onClick={() => {
                        setBookingStatus("idle");
                        setSelectedDateTime(null);
                        setSelectedCourse('');
                      }}
                      className="mt-3 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
                    >
                      Book Another Lesson
                    </button>
                  </div>
                ) : (
                  <form onSubmit={(e) => { 
                    e.preventDefault(); 
                    if (selectedDateTime) {
                      handleTimeSelected(selectedDateTime);
                    }
                  }}>
                    {bookingStatus === "error" && (
                      <div className="bg-red-100 text-red-800 p-4 rounded mb-4">
                        <p>{errorMessage || "An error occurred while booking your lesson. Please try again."}</p>
                      </div>
                    )}
                    
                    <div className="mb-6">
                      <label className="block text-gray-700 mb-2 text-base" htmlFor="course">
                        Select a course:
                      </label>
                      <div className="relative w-full">
                        <select 
                          id="course"
                          value={selectedCourse}
                          onChange={(e) => setSelectedCourse(e.target.value)}
                          className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 appearance-none bg-white text-base"
                          required
                          style={{ fontSize: '16px' }} /* Prevents zoom on iOS */
                        >
                          <option value="">Select a course</option>
                          {courseDetails.map((course) => (
                            <option key={course.id} value={course.id}>
                              {course.id} - {course.description.replace(/\s\d+\sCredits?$/, '')}
                            </option>
                          ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3">
                          <svg className="fill-current h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                          </svg>
                        </div>
                      </div>
                    </div>
                    
                    {/* Calendar display section */}
                    {selectedCourse && (
                      <div className="mt-6 w-full mx-auto">
                        <h3 className="text-xl font-semibold mb-4">Select a Date & Time</h3>
                        <TutorBookingCalendar
                          tutorId={tutor.id}
                          courseId={selectedCourse}
                          onTimeSelected={handleTimeSelected}
                          isTutorView={false}
                          tutorName={tutor.displayName}
                          tutorRate={tutor.hourlyRate}
                          courseCode={selectedCourse}
                          courseDescription={courseDetails.find(c => c.id === selectedCourse)?.description}
                          isLoading={bookingStatus === "loading"}
                        />
                      </div>
                    )}
                    
                    {/* Error message outside the calendar */}
                    {bookingStatus === "error" && errorMessage && (
                      <div className="mt-6 w-full max-w-4xl mx-auto">
                        <p className="text-red-600 mt-2">
                          {errorMessage}
                        </p>
                      </div>
                    )}
                  </form>
                )}
              </div>
            )
          )}
          
        </div>
      </main>
    </div>
  );
} 