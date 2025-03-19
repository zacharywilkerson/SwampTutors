"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../../hooks/useAuth";
import { 
  getUserLessons, 
  rescheduleLesson, 
  canLessonBeRescheduled, 
  cancelLessonForStudent, 
  canLessonBeCancelledByStudent 
} from "../../../firebase";
import { ALL_COURSES } from "../../../constants/courses";
import { convertToDate } from "../../../utils/dateUtils";
import TutorBookingCalendar from "../../../components/TutorBookingCalendar";

// RescheduleModal component
interface RescheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  lesson: any;
  onRescheduleComplete: () => void;
}

function RescheduleModal({ isOpen, onClose, lesson, onRescheduleComplete }: RescheduleModalProps) {
  const [selectedDateTime, setSelectedDateTime] = useState<Date | null>(null);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Reset state when modal opens
    if (isOpen) {
      setSelectedDateTime(null);
      setError('');
      setSuccessMessage('');
      setIsSubmitting(false);
    }
  }, [isOpen]);

  // Handle selecting a new date/time for rescheduling
  const handleTimeSelected = (dateTime: Date) => {
    setSelectedDateTime(dateTime);
    setError('');
  };

  // Handle rescheduling action
  const handleRescheduleLesson = async () => {
    if (!selectedDateTime) {
      setError('Please select a new date and time before rescheduling.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      await rescheduleLesson(lesson.id, selectedDateTime);
      setSuccessMessage('Lesson rescheduled successfully!');
      
      // Give the user time to see the success message
      setTimeout(() => {
        onClose();
        onRescheduleComplete();
      }, 1500);
    } catch (error: any) {
      console.error('Error rescheduling lesson:', error);
      setError(error.message || 'Failed to reschedule the lesson. Please try again.');
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl mx-4 overflow-hidden">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Reschedule Lesson</h2>
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {successMessage ? (
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-green-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-green-700 font-medium">{successMessage}</p>
            </div>
          ) : (
            <>
              {error && (
                <div className="bg-red-50 p-3 rounded-lg mb-4">
                  <p className="text-red-600">{error}</p>
                </div>
              )}
              
              <div className="mb-4">
                <p className="text-gray-700 mb-2">Current date and time:</p>
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="font-medium">
                    {new Date(lesson.date).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      month: 'long', 
                      day: 'numeric' 
                    })} at {new Date(lesson.date).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </p>
                </div>
              </div>
              
              <div className="mb-4">
                <p className="text-gray-700 mb-2">Please select a new date and time:</p>
                <div className="border rounded-lg overflow-hidden">
                  <TutorBookingCalendar 
                    tutorId={lesson.tutorId}
                    onTimeSelected={handleTimeSelected}
                    isTutorView={false}
                  />
                </div>
              </div>
              
              {selectedDateTime && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-medium text-green-800 mb-1">New Selected Time</h4>
                  <p>
                    {selectedDateTime.toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      month: 'long', 
                      day: 'numeric',
                      year: 'numeric'
                    })} at {selectedDateTime.toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true
                    })}
                  </p>
                </div>
              )}
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleRescheduleLesson}
                  disabled={!selectedDateTime || isSubmitting}
                  className={`px-4 py-2 rounded flex items-center ${
                    !selectedDateTime || isSubmitting
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                      : 'bg-orange-400 hover:bg-orange-500 text-white cursor-pointer'
                  }`}
                >
                  {isSubmitting && (
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  Confirm Reschedule
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function StudentDashboard() {
  const { user, userRole, loading: authLoading, logout } = useAuth();
  const router = useRouter();
  
  const [upcomingLessons, setUpcomingLessons] = useState<any[]>([]);
  const [pastLessons, setPastLessons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Array<{id: string, description: string, department?: string}>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // State for reschedule modal
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<any>(null);
  const [rescheduleableLeasons, setRescheduleableLeasons] = useState<{[key: string]: boolean}>({});
  const [cancelableLeasons, setCancelableLeasons] = useState<{[key: string]: boolean}>({});

  // Generate unique list of departments from ALL_COURSES
  const departments = [...new Set(ALL_COURSES.map(course => course.department))].sort();

  // Add logging on component mount
  useEffect(() => {
    console.log("StudentDashboard mounted");
    return () => console.log("StudentDashboard unmounted");
  }, []);

  useEffect(() => {
    // Debug logging
    console.log("StudentDashboard auth state:", { 
      isLoggedIn: !!user, 
      userRole, 
      isLoading: authLoading 
    });
    
    // Don't do anything while still loading
    if (authLoading) {
      console.log("StudentDashboard: Still loading auth state, waiting...");
      return;
    }
    
    // Redirect if not logged in or not a student
    if (!user || userRole !== "student") {
      console.log("StudentDashboard redirecting to login:", { 
        reason: !user ? "No user" : "Not a student role", 
        currentRole: userRole 
      });
      router.push("/login");
      return;
    }

    // Fetch user lessons
    const fetchLessons = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        
        // Fetch upcoming lessons (all of them, as there likely aren't too many)
        const upcomingLessonsResult = await getUserLessons(user.uid, undefined, false, true);
        setUpcomingLessons(upcomingLessonsResult.lessons);
        
        // Fetch only 3 past lessons for the dashboard
        const pastLessonsResult = await getUserLessons(user.uid, 3, true, false);
        setPastLessons(pastLessonsResult.lessons);
      } catch (error) {
        console.error("Error fetching lessons:", error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchLessons();
    }
  }, [user, userRole, authLoading, router]);

  useEffect(() => {
    // Check which lessons can be rescheduled or canceled
    const checkActionStatus = async () => {
      if (!upcomingLessons.length) return;
      
      const reschedulePromises = upcomingLessons.map(lesson => 
        canLessonBeRescheduled(lesson.id)
          .then(canReschedule => ({ lessonId: lesson.id, canReschedule }))
          .catch(() => ({ lessonId: lesson.id, canReschedule: false }))
      );
      
      const cancelPromises = upcomingLessons.map(lesson => 
        canLessonBeCancelledByStudent(lesson.id)
          .then(canCancel => ({ lessonId: lesson.id, canCancel }))
          .catch(() => ({ lessonId: lesson.id, canCancel: false }))
      );
      
      const [rescheduleResults, cancelResults] = await Promise.all([
        Promise.all(reschedulePromises),
        Promise.all(cancelPromises)
      ]);
      
      const rescheduleMap: {[key: string]: boolean} = {};
      rescheduleResults.forEach(result => {
        rescheduleMap[result.lessonId] = result.canReschedule;
      });
      
      const cancelMap: {[key: string]: boolean} = {};
      cancelResults.forEach(result => {
        cancelMap[result.lessonId] = result.canCancel;
      });
      
      setRescheduleableLeasons(rescheduleMap);
      setCancelableLeasons(cancelMap);
    };
    
    checkActionStatus();
  }, [upcomingLessons]);

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node) && 
          inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Handle search input change
  const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    
    if (value.trim() === '') {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    
    const searchTerm = value.toLowerCase();
    let filteredCourses: typeof ALL_COURSES = [];
    
    // Different search approach based on length of search term
    if (searchTerm.length <= 3) {
      // For short search terms (likely course code prefixes), prioritize code matching
      
      // 1. First, find exact course code prefix matches
      const exactPrefixMatches = ALL_COURSES.filter(course => 
        course.id.toLowerCase().startsWith(searchTerm) &&
        (selectedDepartment ? course.department === selectedDepartment : true)
      );
      
      // 2. Then, find courses where the search term is a complete word in the description
      const wordMatches = ALL_COURSES.filter(course => 
        !exactPrefixMatches.includes(course) && 
        (course.description.toLowerCase().split(/\s+/).includes(searchTerm) ||
         course.department?.toLowerCase().includes(searchTerm)) &&
        (selectedDepartment ? course.department === selectedDepartment : true)
      );
      
      // 3. Lastly, find partial matches in course code (not prefix) or description
      const partialMatches = ALL_COURSES.filter(course => 
        !exactPrefixMatches.includes(course) && 
        !wordMatches.includes(course) &&
        (course.id.toLowerCase().includes(searchTerm) || 
         course.description.toLowerCase().includes(searchTerm)) &&
        (selectedDepartment ? course.department === selectedDepartment : true)
      );
      
      filteredCourses = [...exactPrefixMatches, ...wordMatches, ...partialMatches];
    } else {
      // For longer search terms, prioritize meaningful content matches over code matches
      
      // 1. Course description contains the search term as a complete word (highest priority for longer terms)
      const exactWordMatches = ALL_COURSES.filter(course => 
        new RegExp(`\\b${searchTerm}\\b`, 'i').test(course.description.toLowerCase()) &&
        (selectedDepartment ? course.department === selectedDepartment : true)
      );
      
      // 2. Department name contains the search term as a complete word
      const deptMatches = ALL_COURSES.filter(course => 
        !exactWordMatches.includes(course) &&
        new RegExp(`\\b${searchTerm}\\b`, 'i').test(course.department?.toLowerCase() || '') &&
        (selectedDepartment ? course.department === selectedDepartment : true)
      );
      
      // 3. Exact match in course ID (rare but still high priority)
      const exactIdMatches = ALL_COURSES.filter(course => 
        !exactWordMatches.includes(course) &&
        !deptMatches.includes(course) &&
        course.id.toLowerCase() === searchTerm &&
        (selectedDepartment ? course.department === selectedDepartment : true)
      );
      
      // 4. Course description contains the search term as a partial match
      const descPartialMatches = ALL_COURSES.filter(course => 
        !exactWordMatches.includes(course) && 
        !deptMatches.includes(course) &&
        !exactIdMatches.includes(course) &&
        course.description.toLowerCase().includes(searchTerm) &&
        (selectedDepartment ? course.department === selectedDepartment : true)
      );
      
      // 5. Department contains the search term as a partial match
      const deptPartialMatches = ALL_COURSES.filter(course => 
        !exactWordMatches.includes(course) && 
        !deptMatches.includes(course) &&
        !exactIdMatches.includes(course) &&
        !descPartialMatches.includes(course) &&
        course.department?.toLowerCase().includes(searchTerm) &&
        (selectedDepartment ? course.department === selectedDepartment : true)
      );
      
      // 6. Course ID contains the search term (lowest priority for longer terms)
      const codeMatches = ALL_COURSES.filter(course => 
        !exactWordMatches.includes(course) && 
        !deptMatches.includes(course) &&
        !exactIdMatches.includes(course) &&
        !descPartialMatches.includes(course) &&
        !deptPartialMatches.includes(course) &&
        course.id.toLowerCase().includes(searchTerm) &&
        (selectedDepartment ? course.department === selectedDepartment : true)
      );
      
      filteredCourses = [...exactWordMatches, ...deptMatches, ...exactIdMatches, ...descPartialMatches, ...deptPartialMatches, ...codeMatches];
    }
    
    // Limit to 10 suggestions
    setSuggestions(filteredCourses.slice(0, 10));
    setShowSuggestions(filteredCourses.length > 0);
  };

  const handleSuggestionClick = (courseId: string) => {
    router.push(`/search?q=${encodeURIComponent(courseId)}${selectedDepartment ? `&dept=${encodeURIComponent(selectedDepartment)}` : ''}`);
  };

  const handleDepartmentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedDepartment(e.target.value);
    // Clear and update suggestions based on new department
    if (searchQuery.trim() !== '') {
      const searchTerm = searchQuery.toLowerCase();
      let filteredCourses: typeof ALL_COURSES = [];
      
      // Use the same improved search logic here
      if (searchTerm.length <= 3) {
        // For short search terms (likely course code prefixes), prioritize code matching
        
        // 1. First, find exact course code prefix matches
        const exactPrefixMatches = ALL_COURSES.filter(course => 
          course.id.toLowerCase().startsWith(searchTerm) &&
          (e.target.value ? course.department === e.target.value : true)
        );
        
        // 2. Then, find courses where the search term is a complete word in the description
        const wordMatches = ALL_COURSES.filter(course => 
          !exactPrefixMatches.includes(course) && 
          (course.description.toLowerCase().split(/\s+/).includes(searchTerm) ||
           course.department?.toLowerCase().includes(searchTerm)) &&
          (e.target.value ? course.department === e.target.value : true)
        );
        
        // 3. Lastly, find partial matches in course code (not prefix) or description
        const partialMatches = ALL_COURSES.filter(course => 
          !exactPrefixMatches.includes(course) && 
          !wordMatches.includes(course) &&
          (course.id.toLowerCase().includes(searchTerm) || 
           course.description.toLowerCase().includes(searchTerm)) &&
          (e.target.value ? course.department === e.target.value : true)
        );
        
        filteredCourses = [...exactPrefixMatches, ...wordMatches, ...partialMatches];
      } else {
        // For longer search terms, prioritize meaningful content matches over code matches
        
        // 1. Course description contains the search term as a complete word (highest priority for longer terms)
        const exactWordMatches = ALL_COURSES.filter(course => 
          new RegExp(`\\b${searchTerm}\\b`, 'i').test(course.description.toLowerCase()) &&
          (e.target.value ? course.department === e.target.value : true)
        );
        
        // 2. Department name contains the search term as a complete word
        const deptMatches = ALL_COURSES.filter(course => 
          !exactWordMatches.includes(course) &&
          new RegExp(`\\b${searchTerm}\\b`, 'i').test(course.department?.toLowerCase() || '') &&
          (e.target.value ? course.department === e.target.value : true)
        );
        
        // 3. Exact match in course ID (rare but still high priority)
        const exactIdMatches = ALL_COURSES.filter(course => 
          !exactWordMatches.includes(course) &&
          !deptMatches.includes(course) &&
          course.id.toLowerCase() === searchTerm &&
          (e.target.value ? course.department === e.target.value : true)
        );
        
        // 4. Course description contains the search term as a partial match
        const descPartialMatches = ALL_COURSES.filter(course => 
          !exactWordMatches.includes(course) && 
          !deptMatches.includes(course) &&
          !exactIdMatches.includes(course) &&
          course.description.toLowerCase().includes(searchTerm) &&
          (e.target.value ? course.department === e.target.value : true)
        );
        
        // 5. Department contains the search term as a partial match
        const deptPartialMatches = ALL_COURSES.filter(course => 
          !exactWordMatches.includes(course) && 
          !deptMatches.includes(course) &&
          !exactIdMatches.includes(course) &&
          !descPartialMatches.includes(course) &&
          course.department?.toLowerCase().includes(searchTerm) &&
          (e.target.value ? course.department === e.target.value : true)
        );
        
        // 6. Course ID contains the search term (lowest priority for longer terms)
        const codeMatches = ALL_COURSES.filter(course => 
          !exactWordMatches.includes(course) && 
          !deptMatches.includes(course) &&
          !exactIdMatches.includes(course) &&
          !descPartialMatches.includes(course) &&
          !deptPartialMatches.includes(course) &&
          course.id.toLowerCase().includes(searchTerm) &&
          (e.target.value ? course.department === e.target.value : true)
        );
        
        filteredCourses = [...exactWordMatches, ...deptMatches, ...exactIdMatches, ...descPartialMatches, ...deptPartialMatches, ...codeMatches];
      }
      
      // Limit to 10 suggestions
      setSuggestions(filteredCourses.slice(0, 10));
      setShowSuggestions(filteredCourses.length > 0);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const query = formData.get("q") as string;
    
    if (!query.trim()) return;
    
    const searchTerm = query.toLowerCase();
    
    // Use the same improved search strategy for the main search
    if (searchTerm.length <= 3) {
      // For short prefixes, prioritize course code matches
      
      // First, try to find a course where the ID starts with the search term
      const exactPrefixMatch = ALL_COURSES.find(course => 
        course.id.toLowerCase().startsWith(searchTerm) &&
        (selectedDepartment ? course.department === selectedDepartment : true)
      );
      
      if (exactPrefixMatch) {
        router.push(`/search?q=${encodeURIComponent(exactPrefixMatch.id)}${selectedDepartment ? `&dept=${encodeURIComponent(selectedDepartment)}` : ''}`);
        return;
      }
    } else {
      // For longer terms, prioritize meaningful content matches
      
      // 1. Try exact word match in description (highest priority for longer terms)
      const wordMatch = ALL_COURSES.find(course => 
        new RegExp(`\\b${searchTerm}\\b`, 'i').test(course.description.toLowerCase()) &&
        (selectedDepartment ? course.department === selectedDepartment : true)
      );
      
      if (wordMatch) {
        router.push(`/search?q=${encodeURIComponent(wordMatch.id)}${selectedDepartment ? `&dept=${encodeURIComponent(selectedDepartment)}` : ''}`);
        return;
      }
      
      // 2. Try exact word match in department name
      const deptWordMatch = ALL_COURSES.find(course => 
        new RegExp(`\\b${searchTerm}\\b`, 'i').test(course.department?.toLowerCase() || '') &&
        (selectedDepartment ? course.department === selectedDepartment : true)
      );
      
      if (deptWordMatch) {
        router.push(`/search?q=${encodeURIComponent(deptWordMatch.id)}${selectedDepartment ? `&dept=${encodeURIComponent(selectedDepartment)}` : ''}`);
        return;
      }
      
      // 3. Try exact course ID match
      const exactIdMatch = ALL_COURSES.find(course => 
        course.id.toLowerCase() === searchTerm &&
        (selectedDepartment ? course.department === selectedDepartment : true)
      );
      
      if (exactIdMatch) {
        router.push(`/search?q=${encodeURIComponent(exactIdMatch.id)}${selectedDepartment ? `&dept=${encodeURIComponent(selectedDepartment)}` : ''}`);
        return;
      }
      
      // 4. Try partial match in description
      const descMatch = ALL_COURSES.find(course => 
        course.description.toLowerCase().includes(searchTerm) &&
        (selectedDepartment ? course.department === selectedDepartment : true)
      );
      
      if (descMatch) {
        router.push(`/search?q=${encodeURIComponent(descMatch.id)}${selectedDepartment ? `&dept=${encodeURIComponent(selectedDepartment)}` : ''}`);
        return;
      }
      
      // 5. Try partial match in department
      const deptMatch = ALL_COURSES.find(course => 
        course.department?.toLowerCase().includes(searchTerm) &&
        (selectedDepartment ? course.department === selectedDepartment : true)
      );
      
      if (deptMatch) {
        router.push(`/search?q=${encodeURIComponent(deptMatch.id)}${selectedDepartment ? `&dept=${encodeURIComponent(selectedDepartment)}` : ''}`);
        return;
      }
      
      // 6. Try partial match in course ID (lowest priority)
      const codeMatch = ALL_COURSES.find(course => 
        course.id.toLowerCase().includes(searchTerm) &&
        (selectedDepartment ? course.department === selectedDepartment : true)
      );
      
      if (codeMatch) {
        router.push(`/search?q=${encodeURIComponent(codeMatch.id)}${selectedDepartment ? `&dept=${encodeURIComponent(selectedDepartment)}` : ''}`);
        return;
      }
    }
    
    // If no appropriate matches found, just search with the query as is
    router.push(`/search?q=${encodeURIComponent(query)}${selectedDepartment ? `&dept=${encodeURIComponent(selectedDepartment)}` : ''}`);
  };

  const handleLogout = async () => {
    try {
      await logout(() => {
        router.push('/');
      });
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  // Function to open reschedule modal for a lesson
  const openRescheduleModal = (lesson: any) => {
    setSelectedLesson(lesson);
    setIsRescheduleModalOpen(true);
  };

  // Function to handle after rescheduling is complete
  const handleRescheduleComplete = async () => {
    try {
      setLoading(true);
      
      // Fetch updated lessons data
      const upcomingLessonsResult = await getUserLessons(user!.uid, undefined, false, true);
      setUpcomingLessons(upcomingLessonsResult.lessons);
      
      // Fetch only 3 past lessons for the dashboard
      const pastLessonsResult = await getUserLessons(user!.uid, 3, true, false);
      setPastLessons(pastLessonsResult.lessons);
    } catch (error) {
      console.error("Error refreshing lessons:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelLesson = async (lessonId: string) => {
    // Confirm cancellation with the user
    const confirmed = window.confirm("Are you sure you want to cancel this lesson? This action cannot be undone.");
    if (!confirmed) return;
    
    try {
      await cancelLessonForStudent(lessonId);
      // Refresh lessons
      if (user) {
        // Re-fetch lessons to update the UI
        const upcomingLessonsResult = await getUserLessons(user.uid, undefined, false, true);
        setUpcomingLessons(upcomingLessonsResult.lessons);
      }
    } catch (error) {
      console.error("Error cancelling lesson:", error);
      alert("Failed to cancel lesson. Please try again later.");
    }
  };

  if (authLoading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  if (!user || userRole !== "student") {
    return <div className="flex justify-center items-center min-h-screen">Redirecting...</div>; // Return a loading state instead of null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Student Dashboard</h1>
        
        <div className="grid grid-cols-1 gap-8">
          {/* Search for Tutors - Full Width */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-4">
            <h2 className="text-xl font-bold mb-4">Find a Tutor</h2>
            <form onSubmit={handleSearch} className="space-y-4">
              {/* Department Filter */}
              <div>
                <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-1">
                  Filter by Department (Optional)
                </label>
                <select
                  id="department"
                  name="department"
                  value={selectedDepartment}
                  onChange={handleDepartmentChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  <option value="">All Departments</option>
                  {departments.map((department) => (
                    <option key={department} value={department}>
                      {department}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Search Input */}
              <div className="flex flex-col sm:flex-row gap-4 relative">
                <div className="flex-grow relative">
                  <input
                    ref={inputRef}
                    type="text"
                    name="q"
                    value={searchQuery}
                    onChange={handleSearchInput}
                    onFocus={() => searchQuery.trim() !== '' && suggestions.length > 0 && setShowSuggestions(true)}
                    placeholder="Search by course code or name (e.g., COP3502 or Programming)"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                    autoComplete="off"
                  />
                  
                  {/* Course Suggestions */}
                  {showSuggestions && suggestions.length > 0 && (
                    <div 
                      ref={suggestionsRef}
                      className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-md shadow-lg mt-1 z-10 max-h-60 overflow-y-auto"
                    >
                      {suggestions.map(course => (
                        <div 
                          key={course.id}
                          className="px-4 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-0"
                          onClick={() => handleSuggestionClick(course.id)}
                        >
                          <div className="font-medium">{course.id}</div>
                          <div className="text-sm text-gray-600">{course.description}</div>
                          {course.department && (
                            <div className="text-xs text-gray-500">{course.department}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium"
                >
                  Search
                </button>
              </div>
            </form>
          </div>
          
          {/* Lessons Row - Two Column Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Upcoming Lessons */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
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
                    <p className="text-sm text-blue-800 font-medium">Rescheduling Policy</p>
                    <p className="text-xs text-gray-600">
                      Lessons can only be rescheduled up to 24 hours before the scheduled start time. 
                      This policy ensures tutors can plan their schedules effectively while giving 
                      students flexibility to make changes when needed.
                    </p>
                  </div>
                </div>
              </div>
              
              {loading ? (
                <p>Loading your lessons...</p>
              ) : upcomingLessons.length > 0 ? (
                <div className="space-y-4">
                  {upcomingLessons.map((lesson) => {
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
                    
                    const canReschedule = rescheduleableLeasons[lesson.id] === true;
                    const canCancel = cancelableLeasons[lesson.id] === true;
                    
                    return (
                      <div
                        key={lesson.id}
                        className="py-3 flex flex-wrap items-center border-l-4 pl-3 hover:bg-gray-50 transition-colors duration-150"
                        style={{ 
                          borderLeftColor: 
                            lesson.status === "completed" ? "#10B981" :
                            lesson.status === "cancelled" ? "#EF4444" :
                            lesson.status === "rescheduled" ? "#F59E0B" :
                            "#3B82F6"
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
                        </div>
                        
                        {/* Actions - Right side for upcoming lessons */}
                        <div className="flex-shrink-0 flex flex-col space-y-2 mt-2 sm:mt-0 min-w-[200px]">
                          <Link
                            href={`/student/lessons/${lesson.id}`}
                            className="w-full text-center bg-white text-gray-800 border border-blue-600 hover:bg-blue-50 px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer"
                          >
                            View Details
                          </Link>
                          
                          <div className="flex space-x-2">
                            {canReschedule ? (
                              <button
                                onClick={() => openRescheduleModal(lesson)}
                                className="flex-1 bg-orange-400 hover:bg-orange-500 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer"
                              >
                                Reschedule
                              </button>
                            ) : (
                              <button
                                disabled
                                className="flex-1 bg-white text-gray-400 border border-gray-300 px-4 py-2 rounded-md text-sm font-medium cursor-not-allowed"
                                title="Lessons can only be rescheduled 24+ hours in advance"
                              >
                                Reschedule
                              </button>
                            )}
                            
                            {canCancel ? (
                              <button
                                onClick={() => handleCancelLesson(lesson.id)}
                                className="flex-1 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer"
                              >
                                Cancel
                              </button>
                            ) : (
                              <button
                                disabled
                                className="flex-1 bg-white text-gray-400 border border-gray-300 px-4 py-2 rounded-md text-sm font-medium cursor-not-allowed"
                                title="Lessons can only be cancelled 24+ hours in advance"
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p>You have no upcoming lessons scheduled.</p>
              )}
              
              {!loading && upcomingLessons.length === 0 && (
                <div className="mt-4">
                  <p className="mb-2">Ready to book a lesson?</p>
                  <Link 
                    href="/search"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium inline-block"
                  >
                    Find a Tutor
                  </Link>
                </div>
              )}
            </div>
            
            {/* Past Lessons */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold mb-4">Past Lessons</h2>
              {loading ? (
                <p>Loading your lessons...</p>
              ) : pastLessons.length > 0 ? (
                <div className="space-y-4">
                  {/* No need to slice - we're already limiting on the backend */}
                  {pastLessons.map((lesson) => {
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
                    
                    // Use green coloring for past lessons
                    const statusText = lesson.status ? 
                      lesson.status.charAt(0).toUpperCase() + lesson.status.slice(1) : 
                      "Completed";
                    
                    return (
                      <div
                        key={lesson.id}
                        className="py-3 flex flex-wrap items-center border-l-4 pl-3 hover:bg-gray-50 transition-colors duration-150"
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
                        </div>
                        
                        {/* Actions - Right side for past lessons */}
                        <div className="flex-shrink-0 flex flex-col space-y-2 mt-2 sm:mt-0 min-w-[200px]">
                          <Link
                            href={`/student/lessons/${lesson.id}`}
                            className="w-full text-center bg-white text-gray-800 border border-green-600 hover:bg-green-50 px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer"
                          >
                            View Details
                          </Link>
                          
                          {lesson.reviewed ? (
                            <span className="bg-gray-100 text-gray-600 px-4 py-2 rounded-md text-sm font-medium flex items-center justify-center">
                              Reviewed ✓
                            </span>
                          ) : (
                            <Link
                              href={`/student/lessons/${lesson.id}`}
                              className="w-full text-center bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer"
                            >
                              Leave Review
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p>You have no past lessons.</p>
              )}
              
              {/* View all past lessons link - always show this now since we're only loading 3 */}
              {!loading && pastLessons.length > 0 && (
                <div className="mt-4 text-center">
                  <Link
                    href="/student/lessons"
                    className="text-green-600 hover:text-green-800 font-medium inline-flex items-center"
                  >
                    View all past lessons
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      
      {/* Reschedule Modal */}
      {selectedLesson && (
        <RescheduleModal 
          isOpen={isRescheduleModalOpen}
          onClose={() => setIsRescheduleModalOpen(false)}
          lesson={selectedLesson}
          onRescheduleComplete={handleRescheduleComplete}
        />
      )}
    </div>
  );
} 