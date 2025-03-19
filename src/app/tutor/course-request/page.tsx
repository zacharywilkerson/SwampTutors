"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "../../../firebase/config";
import { useAuth } from "../../../hooks/useAuth";
import { ALL_COURSES } from "../../../constants/courses";
import Link from "next/link";

export default function CourseRequest() {
  const router = useRouter();
  const { user, loading: authLoading, userRole } = useAuth();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredCourses, setFilteredCourses] = useState<any[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [existingCourses, setExistingCourses] = useState<string[]>([]);
  const [approvedCourses, setApprovedCourses] = useState<string[]>([]);
  const [pendingCourses, setPendingCourses] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState("");
  
  useEffect(() => {
    // Redirect if not logged in or not a tutor
    if (!authLoading && (!user || userRole !== 'tutor')) {
      router.push('/');
      return;
    }
    
    const fetchTutorData = async () => {
      if (user) {
        try {
          const tutorDoc = await getDoc(doc(db, 'tutors', user.uid));
          if (tutorDoc.exists()) {
            const tutorData = tutorDoc.data();
            
            // Only allow access if tutor is approved
            if (tutorData.profileStatus !== 'approved') {
              router.push('/tutor/profile-pending');
              return;
            }
            
            // Set existing courses
            const courses = tutorData.coursesTaught || [];
            setExistingCourses(courses);
            
            // Set approved courses
            const approved = tutorData.approvedCourses || [];
            setApprovedCourses(approved);
            
            // Set pending courses
            const pending = tutorData.pendingCourses || [];
            setPendingCourses(pending);
          } else {
            // Redirect to profile setup if tutor doc doesn't exist
            router.push('/tutor/signup/how-it-works');
          }
        } catch (error) {
          console.error("Error fetching tutor data:", error);
        } finally {
          setLoading(false);
        }
      }
    };
    
    if (user && !authLoading) {
      fetchTutorData();
    }
  }, [user, authLoading, router, userRole]);
  
  const handleCourseSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    if (value.length > 0) {
      // Filter out courses that are already selected or in existing courses
      const filteredResults = ALL_COURSES.filter(course => {
        const alreadySelected = selectedCourses.includes(course.id);
        const alreadyInProfile = existingCourses.includes(course.id);
        const alreadyPending = pendingCourses.includes(course.id);
        
        if (alreadySelected || alreadyInProfile || alreadyPending) return false;
        
        // Search by course ID or description
        return (
          course.id.toLowerCase().includes(value.toLowerCase()) ||
          course.description.toLowerCase().includes(value.toLowerCase())
        );
      }).slice(0, 10); // Limit to 10 results
      
      setFilteredCourses(filteredResults);
      setShowSuggestions(true);
    } else {
      setFilteredCourses([]);
      setShowSuggestions(false);
    }
  };
  
  const addCourse = (course: any) => {
    if (!selectedCourses.includes(course.id) && !existingCourses.includes(course.id) && !pendingCourses.includes(course.id)) {
      setSelectedCourses(prev => [...prev, course.id]);
    }
    setSearchTerm("");
    setShowSuggestions(false);
  };
  
  const removeCourse = (courseId: string) => {
    setSelectedCourses(prev => prev.filter(id => id !== courseId));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    
    if (selectedCourses.length === 0) {
      setSubmitError("Please select at least one course to request approval for.");
      return;
    }
    
    setLoading(true);
    setSubmitError("");
    
    try {
      // Update the tutor document to add pendingCourses
      await updateDoc(doc(db, 'tutors', user.uid), {
        pendingCourses: arrayUnion(...selectedCourses)
      });
      
      setSubmitSuccess(true);
      setSelectedCourses([]);
      
      // Update local state to reflect the new pending courses
      setPendingCourses(prev => [...prev, ...selectedCourses]);
      
    } catch (error) {
      console.error("Error submitting course request:", error);
      setSubmitError("Failed to submit course request. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  
  // Get course details for display
  const getSelectedCourseDetails = () => {
    return selectedCourses.map(courseId => {
      const course = ALL_COURSES.find(c => c.id === courseId);
      return course || { id: courseId, description: "Unknown Course" };
    });
  };
  
  const getExistingCourseDetails = (courseIds: string[], isApproved = false) => {
    return courseIds.map(courseId => {
      const course = ALL_COURSES.find(c => c.id === courseId);
      return {
        ...(course || { id: courseId, description: "Unknown Course" }),
        approved: isApproved || approvedCourses.includes(courseId)
      };
    });
  };
  
  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-6 border-b">
              <h1 className="text-2xl font-bold">Request to Teach New Courses</h1>
              <p className="text-gray-600 mt-1">
                Select additional courses that you'd like to teach. Each course will need to be approved before it appears on your profile.
              </p>
              <div className="mt-3">
                <Link 
                  href="/tutor/profile-edit"
                  className="text-blue-600 hover:text-blue-800"
                >
                  ← Back to Profile
                </Link>
              </div>
            </div>
            
            <div className="p-6">
              {submitSuccess && (
                <div className="mb-6 bg-green-100 text-green-800 p-4 rounded">
                  Your course request has been submitted successfully. Admin will review your request and approve the courses.
                </div>
              )}
              
              {submitError && (
                <div className="mb-6 bg-red-100 text-red-800 p-4 rounded">
                  {submitError}
                </div>
              )}
              
              <div className="mb-8">
                <h2 className="text-lg font-semibold mb-4">Your Current Courses</h2>
                {existingCourses.length > 0 ? (
                  <div className="space-y-4">
                    {getExistingCourseDetails(existingCourses).map(course => (
                      <div 
                        key={course.id} 
                        className={`p-3 rounded-lg border ${course.approved ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}`}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="font-medium">{course.id}</span>
                            <span className="ml-2 text-gray-600">{course.description}</span>
                          </div>
                          <span className={`px-2 py-1 text-xs rounded ${course.approved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                            {course.approved ? 'Approved' : 'Pending Approval'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">You haven't added any courses yet.</p>
                )}
              </div>
              
              {pendingCourses.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-lg font-semibold mb-4">Pending Course Requests</h2>
                  <div className="space-y-2">
                    {getExistingCourseDetails(pendingCourses).map(course => (
                      <div key={course.id} className="p-3 rounded-lg border border-yellow-200 bg-yellow-50">
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="font-medium">{course.id}</span>
                            <span className="ml-2 text-gray-600">{course.description}</span>
                          </div>
                          <span className="px-2 py-1 text-xs rounded bg-yellow-100 text-yellow-800">
                            Awaiting Review
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <form onSubmit={handleSubmit}>
                <h2 className="text-lg font-semibold mb-4">Request New Courses</h2>
                
                <div className="mb-6">
                  <label htmlFor="courseSearch" className="block text-sm font-medium text-gray-700 mb-1">
                    Search for courses to add
                  </label>
                  
                  <div className="relative">
                    <input
                      id="courseSearch"
                      type="text"
                      placeholder="Search for courses by code or name..."
                      value={searchTerm}
                      onChange={handleCourseSearch}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                    
                    {showSuggestions && filteredCourses.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white shadow-lg rounded-md border border-gray-200 max-h-60 overflow-y-auto">
                        {filteredCourses.map((course) => (
                          <div
                            key={course.id}
                            onClick={() => addCourse(course)}
                            className="px-4 py-2 hover:bg-blue-50 cursor-pointer"
                          >
                            <div className="font-medium">{course.id}</div>
                            <div className="text-sm text-gray-600">{course.description}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Selected Courses</h3>
                  
                  {selectedCourses.length > 0 ? (
                    <div className="space-y-2">
                      {getSelectedCourseDetails().map(course => (
                        <div key={course.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                          <div>
                            <span className="font-medium">{course.id}</span>
                            <span className="ml-2 text-gray-600">{course.description}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeCourse(course.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">No courses selected. Search and select courses above.</p>
                  )}
                </div>
                
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={selectedCourses.length === 0 || loading}
                    className={`px-4 py-2 rounded-md font-medium text-white ${
                      selectedCourses.length === 0 || loading
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {loading ? 'Submitting...' : 'Submit Course Request'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 