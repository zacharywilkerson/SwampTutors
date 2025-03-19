"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { collection, query, where, getDocs, doc, updateDoc, getDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { db } from "../../../firebase/config";
import { useAuth } from "../../../hooks/useAuth";
import { ALL_COURSES } from "../../../constants/courses";

export default function AdminCourseReview() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  
  const [pendingTutors, setPendingTutors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  
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
        
        // Fetch tutors with pending course requests
        await fetchTutorsWithPendingCourses();
      } catch (error) {
        console.error("Error checking admin status:", error);
        setLoading(false);
      }
    };
    
    if (user) {
      checkAdmin();
    }
  }, [user, authLoading, router]);

  const fetchTutorsWithPendingCourses = async () => {
    setLoading(true);
    try {
      // Query for tutors with pending course requests
      // We need to find all tutors that have at least one pending course
      const tutorsQuery = query(
        collection(db, 'tutors'),
        where('profileStatus', '==', 'approved')
      );
      
      const tutorsSnapshot = await getDocs(tutorsQuery);
      
      // Get user data for each tutor with pending courses
      const tutorData = await Promise.all(
        tutorsSnapshot.docs
          .filter(tutorDoc => {
            const data = tutorDoc.data();
            // Only include tutors with pendingCourses array that has items
            return data.pendingCourses && data.pendingCourses.length > 0;
          })
          .map(async (tutorDoc) => {
            const tutorId = tutorDoc.id;
            const tutorData = tutorDoc.data();
            
            // Get user document for additional info
            const userDoc = await getDoc(doc(db, 'users', tutorId));
            const userData = userDoc.data();
            
            // Get pending course details
            const pendingCourses = (tutorData.pendingCourses || []).map((courseId: string) => {
              const course = ALL_COURSES.find(c => c.id === courseId);
              return course || { id: courseId, description: "Unknown Course" };
            });
            
            // Get already approved course details
            const approvedCourses = (tutorData.approvedCourses || []).map((courseId: string) => {
              const course = ALL_COURSES.find(c => c.id === courseId);
              return course || { id: courseId, description: "Unknown Course" };
            });
            
            return {
              id: tutorId,
              ...tutorData,
              ...userData,
              pendingCourses,
              approvedCourses
            };
          })
      );
      
      setPendingTutors(tutorData);
    } catch (error) {
      console.error("Error fetching tutors with pending courses:", error);
      setFeedback({
        type: 'error',
        message: 'Failed to fetch tutors with pending course requests.'
      });
    } finally {
      setLoading(false);
    }
  };

  const approveCourse = async (tutorId: string, courseId: string) => {
    try {
      const tutorRef = doc(db, 'tutors', tutorId);
      
      // Update the tutor document
      await updateDoc(tutorRef, {
        // Add to approvedCourses
        approvedCourses: arrayUnion(courseId),
        // Remove from pendingCourses
        pendingCourses: arrayRemove(courseId)
      });
      
      // Update local state
      setPendingTutors(prev => prev.map(tutor => {
        if (tutor.id === tutorId) {
          // Move the course from pending to approved
          const updatedPendingCourses = tutor.pendingCourses.filter(
            (course: any) => course.id !== courseId
          );
          
          const courseToApprove = tutor.pendingCourses.find(
            (course: any) => course.id === courseId
          );
          
          return {
            ...tutor,
            pendingCourses: updatedPendingCourses,
            approvedCourses: [...tutor.approvedCourses, courseToApprove]
          };
        }
        return tutor;
      }));
      
      // Remove tutor from list if they have no more pending courses
      setPendingTutors(prev => prev.filter(tutor => tutor.pendingCourses.length > 0));
      
      setFeedback({
        type: 'success',
        message: 'Course approved successfully.'
      });
    } catch (error) {
      console.error("Error approving course:", error);
      setFeedback({
        type: 'error',
        message: 'Failed to approve course.'
      });
    }
  };

  const rejectCourse = async (tutorId: string, courseId: string) => {
    try {
      const tutorRef = doc(db, 'tutors', tutorId);
      
      // Update the tutor document to remove from pendingCourses
      await updateDoc(tutorRef, {
        pendingCourses: arrayRemove(courseId)
      });
      
      // Update local state
      setPendingTutors(prev => prev.map(tutor => {
        if (tutor.id === tutorId) {
          return {
            ...tutor,
            pendingCourses: tutor.pendingCourses.filter(
              (course: any) => course.id !== courseId
            )
          };
        }
        return tutor;
      }));
      
      // Remove tutor from list if they have no more pending courses
      setPendingTutors(prev => prev.filter(tutor => tutor.pendingCourses.length > 0));
      
      setFeedback({
        type: 'success',
        message: 'Course rejected successfully.'
      });
    } catch (error) {
      console.error("Error rejecting course:", error);
      setFeedback({
        type: 'error',
        message: 'Failed to reject course.'
      });
    }
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
            <h1 className="text-2xl font-bold">Course Approval Requests</h1>
            <p className="text-gray-600 mt-1">
              Review and approve new course requests from existing tutors.
            </p>
            <div className="mt-3">
              <Link 
                href="/admin/tutor-review"
                className="text-blue-600 hover:text-blue-800"
              >
                ← Back to Tutor Review
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
                <p className="text-gray-500">No pending course requests to review.</p>
              </div>
            ) :
              <div className="space-y-8">
                {pendingTutors.map((tutor) => (
                  <div key={tutor.id} className="border rounded-lg overflow-hidden">
                    <div className="bg-gray-50 p-4 border-b">
                      <div className="flex justify-between items-start">
                        <div>
                          <h2 className="text-xl font-semibold">{tutor.displayName}</h2>
                          <div className="text-sm text-gray-600">{tutor.email}</div>
                        </div>
                        <Link
                          href={`/tutor/${tutor.id}`}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                          target="_blank"
                        >
                          View Profile
                        </Link>
                      </div>
                    </div>

                    <div className="p-4">
                      <h3 className="font-medium mb-4">Currently Approved Courses ({tutor.approvedCourses.length})</h3>
                      <div className="flex flex-wrap gap-2 mb-6">
                        {tutor.approvedCourses.length > 0 ? (
                          tutor.approvedCourses.map((course: any) => (
                            <span 
                              key={course.id} 
                              className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm"
                            >
                              {course.id}
                            </span>
                          ))
                        ) : (
                          <p className="text-gray-500">No approved courses</p>
                        )}
                      </div>

                      <h3 className="font-medium mb-4">Pending Course Requests ({tutor.pendingCourses.length})</h3>
                      <div className="space-y-4">
                        {tutor.pendingCourses.map((course: any) => (
                          <div key={course.id} className="border rounded-lg p-4 bg-yellow-50">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div>
                                <div className="font-medium">{course.id}</div>
                                <div className="text-gray-600">{course.description}</div>
                              </div>
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => rejectCourse(tutor.id, course.id)}
                                  className="px-3 py-1 border border-red-600 text-red-600 rounded hover:bg-red-50"
                                >
                                  Reject
                                </button>
                                <button 
                                  onClick={() => approveCourse(tutor.id, course.id)}
                                  className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                                >
                                  Approve
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            }
          </div>
        </div>
      </main>
    </div>
  );
} 