"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { collection, query, where, getDocs, doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "../../../firebase/config";
import { useAuth } from "../../../hooks/useAuth";
import { ALL_COURSES } from "../../../constants/courses";
import { convertToDate } from "../../../utils/dateUtils";

// Define a type for tutor objects
interface TutorData {
  id: string;
  displayName?: string;
  email?: string;
  bio?: string;
  education?: any;
  hourlyRate?: number;
  createdAt?: any;
  reviewedAt?: any;
  coursesTaught?: string[];
  courses?: any[];
  [key: string]: any; // Allow other properties
}

export default function AdminTutorReview() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  
  const [pendingTutors, setPendingTutors] = useState<TutorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  // Track which course approval sections are expanded
  const [expandedTutors, setExpandedTutors] = useState<{[key: string]: boolean}>({});
  // Track courses selections
  const [selectedCourses, setSelectedCourses] = useState<{[key: string]: string[]}>({});
  // Track rejection reasons and modal state
  const [rejectionNotes, setRejectionNotes] = useState("");
  const [isPermanentReject, setIsPermanentReject] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [currentTutorId, setCurrentTutorId] = useState("");
  // Track active tab for each tutor
  const [activeTabs, setActiveTabs] = useState<{[key: string]: string}>({});

  // Function to set active tab for a tutor
  const setActiveTab = (tutorId: string, tab: string) => {
    setActiveTabs(prev => ({
      ...prev,
      [tutorId]: tab
    }));
  };

  // Get active tab for a tutor with 'application' as default
  const getActiveTab = (tutorId: string) => {
    return activeTabs[tutorId] || 'application';
  };

  useEffect(() => {
    // Redirect if not logged in or not an admin
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    
    // Check if user is an admin
    const checkAdmin = async () => {
      try {
        if (!user) {
          router.push('/login');
          return;
        }
        
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.data();
        
        if (!userData || userData.role !== 'admin') {
          // Redirect non-admins
          router.push('/');
          return;
        }
        
        // Fetch pending tutor profiles
        await fetchPendingTutors();
      } catch (error) {
        console.error("Error checking admin status:", error);
        setLoading(false);
      }
    };
    
    if (user) {
      checkAdmin();
    }
  }, [user, authLoading, router]);

  const fetchPendingTutors = async () => {
    setLoading(true);
    try {
      // Query for tutors with pending profile status
      const tutorsQuery = query(
        collection(db, 'tutors'),
        where('profileStatus', '==', 'pending')
      );
      
      const tutorsSnapshot = await getDocs(tutorsQuery);
      
      // Get user data for each tutor
      const tutorData = await Promise.all(
        tutorsSnapshot.docs.map(async (tutorDoc) => {
          const tutorId = tutorDoc.id;
          const tutorData = tutorDoc.data();
          
          // Get user document for additional info
          const userDoc = await getDoc(doc(db, 'users', tutorId));
          const userData = userDoc.data();
          
          // Get course details
          const courses = (tutorData.coursesTaught || []).map((courseId: string) => {
            const course = ALL_COURSES.find(c => c.id === courseId);
            return course || { id: courseId, description: "Unknown Course" };
          });
          
          // Create a properly typed tutor object
          const typedTutorData: TutorData = {
            id: tutorId,
            ...tutorData,
            ...userData,
            courses,
            coursesTaught: tutorData.coursesTaught || []
          };
          
          return typedTutorData;
        })
      );
      
      // Initialize selected courses for each tutor
      const initialSelectedCourses: {[key: string]: string[]} = {};
      tutorData.forEach(tutor => {
        // By default, select all courses for approval
        initialSelectedCourses[tutor.id] = tutor.coursesTaught || [];
      });
      setSelectedCourses(initialSelectedCourses);
      
      setPendingTutors(tutorData);
    } catch (error) {
      console.error("Error fetching pending tutors:", error);
      setFeedback({
        type: 'error',
        message: 'Failed to fetch pending tutor profiles.'
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleCourseSelection = (tutorId: string, courseId: string) => {
    setSelectedCourses(prev => {
      const currentSelected = prev[tutorId] || [];
      if (currentSelected.includes(courseId)) {
        // Remove course if already selected
        return {
          ...prev,
          [tutorId]: currentSelected.filter(id => id !== courseId)
        };
      } else {
        // Add course if not selected
        return {
          ...prev,
          [tutorId]: [...currentSelected, courseId]
        };
      }
    });
  };

  const toggleAllCourses = (tutorId: string, selectAll: boolean) => {
    const tutor = pendingTutors.find(t => t.id === tutorId);
    if (!tutor) return;
    
    setSelectedCourses(prev => ({
      ...prev,
      [tutorId]: selectAll ? [...(tutor.coursesTaught || [])] : []
    }));
  };

  const toggleExpand = (tutorId: string) => {
    setExpandedTutors(prev => ({
      ...prev,
      [tutorId]: !prev[tutorId]
    }));
  };

  const approveTutor = async (tutorId: string) => {
    try {
      // Get the selected courses for this tutor
      const approvedCourses = selectedCourses[tutorId] || [];
      
      await updateDoc(doc(db, 'tutors', tutorId), {
        profileStatus: 'approved',
        approvedCourses: approvedCourses, // Store the approved courses
      });
      
      // Remove from list
      setPendingTutors(prev => prev.filter(tutor => tutor.id !== tutorId));
      
      setFeedback({
        type: 'success',
        message: 'Tutor profile and selected courses approved successfully.'
      });
    } catch (error) {
      console.error("Error approving tutor:", error);
      setFeedback({
        type: 'error',
        message: 'Failed to approve tutor.'
      });
    }
  };

  const openRejectModal = (tutorId: string) => {
    setCurrentTutorId(tutorId);
    setRejectionNotes("");
    setIsPermanentReject(false);
    setIsRejectModalOpen(true);
  };

  const closeRejectModal = () => {
    setIsRejectModalOpen(false);
    setCurrentTutorId("");
  };

  const submitRejectTutor = async () => {
    if (!currentTutorId) return;
    
    try {
      await updateDoc(doc(db, 'tutors', currentTutorId), {
        profileStatus: isPermanentReject ? 'permanently_rejected' : 'rejected',
        approvedCourses: [], // No courses are approved for rejected tutors
        pendingCourses: [], // Clear pending courses
        rejectionReason: rejectionNotes,
        rejectionDate: new Date()
      });
      
      // Remove from list
      setPendingTutors(prev => prev.filter(tutor => tutor.id !== currentTutorId));
      
      setFeedback({
        type: 'success',
        message: `Tutor ${isPermanentReject ? 'permanently ' : ''}rejected.`
      });
      
      closeRejectModal();
    } catch (error) {
      console.error("Error rejecting tutor:", error);
      setFeedback({
        type: 'error',
        message: 'Failed to reject tutor.'
      });
    }
  };

  // Check if all courses have been reviewed for a tutor
  const areAllCoursesReviewed = (tutorId: string) => {
    const tutor = pendingTutors.find(t => t.id === tutorId);
    if (!tutor) return true;
    
    // Either the course is selected for approval or not selected (meaning rejected)
    // All courses have a clear decision
    return true;
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6 border-b">
            <h1 className="text-2xl font-bold">Tutor Profile Review</h1>
            <p className="text-gray-600 mt-1">
              Review tutor profiles and approve courses they can teach.
            </p>
            <div className="mt-3">
              <Link 
                href="/admin/course-review"
                className="text-blue-600 hover:text-blue-800"
              >
                View Course Approval Requests →
              </Link>
            </div>
          </div>

          {feedback.message && (
            <div className={`p-4 ${feedback.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {feedback.message}
            </div>
          )}

          <div className="p-6">
            {pendingTutors.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No pending tutor profiles to review.</p>
              </div>
            ) : (
              <div className="space-y-8">
                {pendingTutors.map((tutor) => (
                  <div key={tutor.id} className="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                    {/* Header Section with Title and Action Buttons */}
                    <div className="bg-white p-5 border-b">
                      <div className="flex justify-between items-center">
                        <h2 className="text-2xl font-bold text-gray-800">Applicant Details</h2>
                        <div className="flex space-x-3">
                          <button 
                            onClick={() => openRejectModal(tutor.id)}
                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-medium"
                          >
                            Decline
                          </button>
                          <button 
                            onClick={() => approveTutor(tutor.id)}
                            disabled={selectedCourses[tutor.id]?.length === 0}
                            className={`px-4 py-2 rounded-md font-medium ${
                              selectedCourses[tutor.id]?.length === 0 
                                ? 'bg-gray-400 text-white cursor-not-allowed' 
                                : 'bg-teal-600 text-white hover:bg-teal-700'
                            }`}
                          >
                            {selectedCourses[tutor.id]?.length === 0 
                              ? 'Approve (Select courses first)' 
                              : 'Approve Profile'}
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Main Content Grid */}
                    <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Applicant Info - Left Column (2/3 width) */}
                      <div className="lg:col-span-2 space-y-6">
                        {/* Applicant Basic Info */}
                        <div className="bg-white rounded-lg border p-5">
                          <h3 className="text-xl font-semibold mb-4">Applicant</h3>
                          <div className="flex items-start">
                            {tutor.profilePictureUrl ? (
                              <div className="bg-gray-100 rounded-full h-16 w-16 mr-4 flex-shrink-0 flex items-center justify-center overflow-hidden">
                                <img 
                                  src={tutor.profilePictureUrl} 
                                  alt={tutor.email || "Tutor"} 
                                  className="h-full w-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="bg-gray-200 rounded-full h-16 w-16 mr-4 flex-shrink-0 flex items-center justify-center text-2xl text-gray-500 font-semibold">
                                {tutor.email ? tutor.email.charAt(0).toUpperCase() : "?"}
                              </div>
                            )}
                            <div>
                              <h3 className="text-xl font-semibold">{tutor.profileHeadline || "Untitled Profile"}</h3>
                              <p className="text-gray-500">{tutor.email}</p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                <span className="px-3 py-1 bg-green-100 text-green-800 text-xs rounded-full">Profile Status: {tutor.profileStatus}</span>
                                {tutor.rating > 0 && (
                                  <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">Rating: {tutor.rating}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 mt-5 gap-y-3">
                            <div>
                              <span className="text-gray-500">Hourly Rate:</span>
                              <span className="ml-2">${tutor.hourlyRate || 0}/hour</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Phone Number:</span>
                              <span className="ml-2">{tutor.phoneNumber || "Not provided"}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Year of Birth:</span>
                              <span className="ml-2">{tutor.yearOfBirth || "Not specified"}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Terms Agreed:</span>
                              <span className="ml-2">{tutor.termsAgreed ? "Yes" : "No"}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Application Date:</span>
                              <span className="ml-2">{tutor.createdAt ? convertToDate(tutor.createdAt).toLocaleDateString() : "Unknown"}</span>
                            </div>
                            {tutor.availability && (
                              <div>
                                <span className="text-gray-500">Availability:</span>
                                <span className="ml-2">{Array.isArray(tutor.availability) ? tutor.availability.join(', ') : tutor.availability}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Tabbed content section */}
                        <div className="bg-white rounded-lg border overflow-hidden">
                          <div className="border-b flex overflow-x-auto">
                            <button 
                              onClick={() => setActiveTab(tutor.id, 'application')}
                              className={`px-5 py-3 whitespace-nowrap ${getActiveTab(tutor.id) === 'application' 
                                ? 'border-b-2 border-blue-600 text-blue-600 font-medium' 
                                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'}`}
                            >
                              Application
                            </button>
                            <button 
                              onClick={() => setActiveTab(tutor.id, 'education')}
                              className={`px-5 py-3 whitespace-nowrap ${getActiveTab(tutor.id) === 'education' 
                                ? 'border-b-2 border-blue-600 text-blue-600 font-medium' 
                                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'}`}
                            >
                              Education
                            </button>
                            <button 
                              onClick={() => setActiveTab(tutor.id, 'courses')}
                              className={`px-5 py-3 whitespace-nowrap ${getActiveTab(tutor.id) === 'courses' 
                                ? 'border-b-2 border-blue-600 text-blue-600 font-medium' 
                                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'}`}
                            >
                              Courses
                            </button>
                            <button 
                              onClick={() => setActiveTab(tutor.id, 'documents')}
                              className={`px-5 py-3 whitespace-nowrap ${getActiveTab(tutor.id) === 'documents' 
                                ? 'border-b-2 border-blue-600 text-blue-600 font-medium' 
                                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'}`}
                            >
                              Documents
                            </button>
                          </div>
                          
                          <div className="p-5">
                            {/* Application Tab Content */}
                            {getActiveTab(tutor.id) === 'application' && (
                              <div>
                                {/* Bio section */}
                                <div className="mb-6">
                                  <h4 className="text-base font-semibold mb-3">Bio</h4>
                                  <p className="text-gray-700">{tutor.bio || "No bio provided"}</p>
                                </div>
                                
                                {/* Profile Headline */}
                                <div className="mb-6">
                                  <h4 className="text-base font-semibold mb-3">Profile Headline</h4>
                                  <p className="text-gray-700">{tutor.profileHeadline || "No profile headline provided"}</p>
                                </div>

                                {/* Completed Steps */}
                                <div className="mb-6">
                                  <h4 className="text-base font-semibold mb-3">Completed Application Steps</h4>
                                  {tutor.completedSteps ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                      {Object.entries(tutor.completedSteps).map(([key, value]) => (
                                        <div key={key} className="flex items-center">
                                          <span className={`inline-flex items-center justify-center w-5 h-5 mr-2 rounded-full ${value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {value ? '✓' : '✗'}
                                          </span>
                                          <span className="text-gray-700">{key.replace('/tutor/signup/', '').replace(/-/g, ' ')}</span>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-gray-500 italic">No steps completion data</p>
                                  )}
                                </div>
                                
                                {/* Remove any fields that don't exist in Firebase */}
                              </div>
                            )}
                            
                            {/* Education Tab Content */}
                            {getActiveTab(tutor.id) === 'education' && (
                              <div>
                                {tutor.education ? (
                                  <div className="space-y-6">
                                    {tutor.education.undergraduate && (
                                      <div>
                                        <h4 className="text-base font-semibold mb-3">Undergraduate Education</h4>
                                        <div className="border-l-2 border-blue-200 pl-3 py-2">
                                          <ul className="text-gray-700 space-y-2">
                                            {tutor.education.undergraduate.college && (
                                              <li>
                                                <span className="text-gray-600 font-medium">College:</span> {tutor.education.undergraduate.college}
                                              </li>
                                            )}
                                            {tutor.education.undergraduate.major && (
                                              <li>
                                                <span className="text-gray-600 font-medium">Major:</span> {tutor.education.undergraduate.major}
                                              </li>
                                            )}
                                            {tutor.education.undergraduate.startYear && (
                                              <li>
                                                <span className="text-gray-600 font-medium">Start Year:</span> {tutor.education.undergraduate.startYear}
                                              </li>
                                            )}
                                            {tutor.education.undergraduate.endYear && (
                                              <li>
                                                <span className="text-gray-600 font-medium">End Year:</span> {tutor.education.undergraduate.endYear}
                                              </li>
                                            )}
                                          </ul>
                                        </div>
                                      </div>
                                    )}
                                    
                                    {tutor.education.graduate && Array.isArray(tutor.education.graduate) && tutor.education.graduate.length > 0 && (
                                      <div>
                                        <h4 className="text-base font-semibold mb-3">Graduate Education</h4>
                                        {tutor.education.graduate.map((grad, index) => (
                                          <div key={index} className="border-l-2 border-blue-200 pl-3 py-2 mb-4">
                                            <ul className="text-gray-700 space-y-2">
                                              {grad.college && (
                                                <li>
                                                  <span className="text-gray-600 font-medium">College:</span> {grad.college}
                                                </li>
                                              )}
                                              {grad.degreeType && (
                                                <li>
                                                  <span className="text-gray-600 font-medium">Degree Type:</span> {grad.degreeType}
                                                </li>
                                              )}
                                            </ul>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                    
                                    {tutor.education.teachingCertificate !== undefined && (
                                      <div>
                                        <h4 className="text-base font-semibold mb-3">Teaching Certificate</h4>
                                        <p className="text-gray-700">{tutor.education.teachingCertificate ? "Yes" : "No"}</p>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <p className="text-gray-500 italic">No education information provided</p>
                                )}
                              </div>
                            )}
                            
                            {/* Courses Tab Content */}
                            {getActiveTab(tutor.id) === 'courses' && (
                              <div>
                                <h4 className="text-base font-semibold mb-4">Course Selection</h4>
                                <p className="text-sm text-gray-600 mb-4">Select courses that you approve this tutor to teach:</p>
                                
                                <div className="flex justify-between mb-4">
                                  <div className="text-sm text-gray-600">
                                    {selectedCourses[tutor.id]?.length || 0} of {tutor.coursesTaught?.length || 0} courses selected
                                  </div>
                                  <div className="flex gap-3">
                                    <button 
                                      onClick={() => toggleAllCourses(tutor.id, true)}
                                      className="text-sm text-blue-600 hover:underline"
                                    >
                                      Select All
                                    </button>
                                    <button 
                                      onClick={() => toggleAllCourses(tutor.id, false)}
                                      className="text-sm text-blue-600 hover:underline"
                                    >
                                      Deselect All
                                    </button>
                                  </div>
                                </div>
                                
                                <div className="border rounded-md mb-4">
                                  <div className="space-y-0 max-h-80 overflow-y-auto divide-y">
                                    {tutor.courses && tutor.courses.length > 0 ? (
                                      tutor.courses.map((course: any) => (
                                        <div 
                                          key={course.id} 
                                          className="flex items-center p-3 hover:bg-gray-50"
                                        >
                                          <input
                                            type="checkbox"
                                            id={`course-${tutor.id}-${course.id}`}
                                            checked={selectedCourses[tutor.id]?.includes(course.id) || false}
                                            onChange={() => toggleCourseSelection(tutor.id, course.id)}
                                            className="mr-3 h-4 w-4 text-blue-600"
                                          />
                                          <label 
                                            htmlFor={`course-${tutor.id}-${course.id}`}
                                            className="flex-1 cursor-pointer"
                                          >
                                            <span className="font-medium">{course.id}</span>
                                            <span className="text-gray-600 ml-2">- {course.description}</span>
                                          </label>
                                        </div>
                                      ))
                                    ) : (
                                      <p className="text-gray-500 p-4">No courses selected</p>
                                    )}
                                  </div>
                                </div>
                                
                                {tutor.pendingCourses && tutor.pendingCourses.length > 0 && (
                                  <div className="mb-4">
                                    <h4 className="text-base font-semibold mb-2">Pending Courses</h4>
                                    <div className="flex flex-wrap gap-2">
                                      {tutor.pendingCourses.map((courseId: string) => (
                                        <span key={courseId} className="px-3 py-1 rounded-full text-sm bg-yellow-100 text-yellow-800 border border-yellow-200">
                                          {courseId}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                
                                <div>
                                  <h4 className="text-base font-semibold mb-3">Selected Courses</h4>
                                  <div className="flex flex-wrap gap-2">
                                    {selectedCourses[tutor.id] && selectedCourses[tutor.id].length > 0 ? (
                                      selectedCourses[tutor.id].map((courseId) => {
                                        const course = tutor.courses?.find((c: any) => c.id === courseId);
                                        return (
                                          <span 
                                            key={courseId} 
                                            className="px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800 border border-blue-200"
                                          >
                                            {courseId}
                                          </span>
                                        );
                                      })
                                    ) : (
                                      <p className="text-gray-500">No courses selected for approval</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            {/* Documents Tab Content */}
                            {getActiveTab(tutor.id) === 'documents' && (
                              <div>
                                <h4 className="text-base font-semibold mb-4">Uploaded Documents</h4>
                                
                                <div className="space-y-4">
                                  {tutor.resumeUrl && (
                                    <div className="border rounded-md p-3">
                                      <h5 className="font-medium text-gray-800 mb-1">Resume</h5>
                                      <a href={tutor.resumeUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                        </svg>
                                        View Resume
                                      </a>
                                    </div>
                                  )}
                                  
                                  {tutor.transcriptUrl && (
                                    <div className="border rounded-md p-3">
                                      <h5 className="font-medium text-gray-800 mb-1">Transcript</h5>
                                      <a href={tutor.transcriptUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                        </svg>
                                        View Transcript
                                      </a>
                                    </div>
                                  )}
                                  
                                  {!tutor.resumeUrl && !tutor.transcriptUrl && (
                                    <div className="text-gray-500 italic">
                                      <p>No documents have been uploaded by this tutor.</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Application Status - Right Column (1/3 width) */}
                      <div className="lg:col-span-1 space-y-6">
                        {/* Application Progress Card */}
                        <div className="bg-white rounded-lg border p-5">
                          <h3 className="text-xl font-semibold mb-4">Application Status</h3>
                          
                          <div className="mb-4">
                            <h4 className="font-medium mb-2">Profile Status:</h4>
                            <span className={`inline-block px-3 py-1 rounded-full text-sm ${
                              tutor.profileStatus === 'pending' 
                                ? 'bg-yellow-100 text-yellow-800' 
                                : tutor.profileStatus === 'approved' 
                                  ? 'bg-teal-100 text-teal-800'
                                  : 'bg-red-100 text-red-800'
                            }`}>
                              {tutor.profileStatus ? (tutor.profileStatus.charAt(0).toUpperCase() + tutor.profileStatus.slice(1)) : "Unknown"}
                            </span>
                          </div>
                          
                          <div className="mb-4">
                            <h4 className="font-medium mb-2">Application Date:</h4>
                            <span className="text-gray-700">
                              {tutor.createdAt ? convertToDate(tutor.createdAt).toLocaleDateString() : 'Unknown'}
                            </span>
                          </div>
                          
                          {tutor.reviewedAt && (
                            <div className="mb-4">
                              <h4 className="font-medium mb-2">Last Reviewed:</h4>
                              <span className="text-gray-700">
                                {convertToDate(tutor.reviewedAt).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                          
                          {tutor.rejectionReason && (
                            <div className="mb-4">
                              <h4 className="font-medium mb-2">Rejection Reason:</h4>
                              <p className="text-red-600 bg-red-50 p-2 rounded">
                                {tutor.rejectionReason}
                              </p>
                            </div>
                          )}
                          
                          {tutor.approvedCourses && tutor.approvedCourses.length > 0 && (
                            <div className="mb-4">
                              <h4 className="font-medium mb-2">Approved Courses:</h4>
                              <div className="flex flex-wrap gap-2">
                                {tutor.approvedCourses.map((courseId: string) => (
                                  <span key={courseId} className="px-2 py-1 bg-teal-100 text-teal-800 text-xs rounded-full">
                                    {courseId}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {/* Quick Summary */}
                        <div className="bg-white rounded-lg border p-5">
                          <h3 className="text-xl font-semibold mb-4">Quick Summary</h3>
                          
                          <ul className="space-y-3">
                            <li className="flex items-start">
                              <span className="text-gray-600 mr-2">• </span>
                              <span>Courses Requested: {tutor.coursesTaught?.length || 0}</span>
                            </li>
                            <li className="flex items-start">
                              <span className="text-gray-600 mr-2">• </span>
                              <span>Courses Selected: {selectedCourses[tutor.id]?.length || 0}</span>
                            </li>
                            {tutor.pendingCourses && tutor.pendingCourses.length > 0 && (
                              <li className="flex items-start">
                                <span className="text-gray-600 mr-2">• </span>
                                <span>Pending Courses: {tutor.pendingCourses.length}</span>
                              </li>
                            )}
                            {tutor.approvedCourses && tutor.approvedCourses.length > 0 && (
                              <li className="flex items-start">
                                <span className="text-gray-600 mr-2">• </span>
                                <span>Approved Courses: {tutor.approvedCourses.length}</span>
                              </li>
                            )}
                            <li className="flex items-start">
                              <span className="text-gray-600 mr-2">• </span>
                              <span>Hourly Rate: ${tutor.hourlyRate || 0}/hour</span>
                            </li>
                            {tutor.availability && (
                              <li className="flex items-start">
                                <span className="text-gray-600 mr-2">• </span>
                                <span>Availability: {Array.isArray(tutor.availability) ? tutor.availability.length + " days" : tutor.availability}</span>
                              </li>
                            )}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Rejection Modal */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-lg w-full mx-4 overflow-hidden">
            <div className="p-6 border-b">
              <h3 className="text-xl font-bold">Reject Tutor Profile</h3>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <label htmlFor="rejectionNotes" className="block mb-2 text-sm font-medium text-gray-700">
                  Rejection Reason (visible to tutor)
                </label>
                <textarea
                  id="rejectionNotes"
                  rows={4}
                  value={rejectionNotes}
                  onChange={(e) => setRejectionNotes(e.target.value)}
                  placeholder="Explain why this profile is being rejected..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div className="mb-6">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="permanentReject"
                    checked={isPermanentReject}
                    onChange={(e) => setIsPermanentReject(e.target.checked)}
                    className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                  />
                  <label htmlFor="permanentReject" className="ml-2 block text-sm text-gray-900">
                    Permanently reject (tutor cannot reapply)
                  </label>
                </div>
                {isPermanentReject && (
                  <p className="mt-1 text-sm text-red-600">
                    Warning: This action cannot be undone. The tutor will be permanently banned from reapplying.
                  </p>
                )}
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={closeRejectModal}
                  className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={submitRejectTutor}
                  disabled={!rejectionNotes.trim()}
                  className={`px-4 py-2 rounded ${
                    !rejectionNotes.trim() 
                      ? 'bg-gray-400 text-white cursor-not-allowed' 
                      : 'bg-red-600 text-white hover:bg-red-700'
                  }`}
                >
                  {isPermanentReject ? 'Permanently Reject' : 'Reject Profile'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 