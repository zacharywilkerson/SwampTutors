"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useState, useRef, useEffect } from "react";
import FeaturedTutors from "../components/FeaturedTutors";
import { ALL_COURSES } from "../constants/courses";
import { useRouter } from "next/navigation";
import { useAuth } from "../hooks/useAuth";
import { useTutorRedirect } from "../hooks/useTutorRedirect";
import Footer from "../components/Footer";

export default function HomePage() {
  const router = useRouter();
  const { user, userRole } = useAuth();
  // Check if tutor has completed profile
  const { isLoading: redirectLoading, hasCheckedStatus } = useTutorRedirect(['/tutor/profile-setup', '/tutor/profile-pending']);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Array<{id: string, description: string, department?: string}>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Generate unique list of departments from ALL_COURSES
  const departments = [...new Set(ALL_COURSES.map(course => course.department))].sort();

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
    
    // Use the same improved search logic for the main search
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

  // Get popular courses from constants file
  const popularCourses = ALL_COURSES
    .filter(course => 
      ["COP3502", "MAC2311", "PHY2048", "CHM2045", "BSC2010", "ECO2013"]
      .includes(course.id)
    );

  // Show loading state if still checking tutor profile
  if (userRole === 'tutor' && redirectLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section with Search */}
      <section className="bg-gradient-to-r from-blue-800 to-blue-900 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">Find Your Perfect Tutor</h1>
            <p className="text-xl mb-8">Connect with experienced tutors for any University of Florida course</p>
            
            {/* Search Bar */}
            <div className="bg-white rounded-lg shadow-xl p-6">
              <form onSubmit={handleSearch} className="space-y-4">
                <h2 className="text-gray-800 text-xl font-semibold mb-4 text-left">What do you need help with?</h2>
                {/* Department Filter */}
                <div>
                  <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-1 text-left">
                    Filter by Department (Optional)
                  </label>
                  <select
                    id="department"
                    name="department"
                    value={selectedDepartment}
                    onChange={handleDepartmentChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                      placeholder="Search by course code or name (e.g., PHY2048 or Calculus)"
                      className="w-full px-6 py-4 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoComplete="off"
                    />
                    
                    {/* Course Suggestions */}
                    {showSuggestions && suggestions.length > 0 && (
                      <div 
                        ref={suggestionsRef}
                        className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-lg shadow-lg mt-2 z-10 max-h-80 overflow-y-auto text-left"
                      >
                        {suggestions.map(course => (
                          <div 
                            key={course.id}
                            className="px-6 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-0"
                            onClick={() => handleSuggestionClick(course.id)}
                          >
                            <div className="font-medium text-gray-900">{course.id}</div>
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
                    className="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-4 px-8 rounded-md shadow-sm"
                  >
                    Find Tutors
                  </button>
                </div>

                {/* Popular Courses */}
                <div className="pt-3 text-left">
                  <p className="text-sm text-gray-600 mb-2">Popular courses:</p>
                  <div className="flex flex-wrap gap-2">
                    {popularCourses.map((course) => (
                      <button
                        key={course.id}
                        type="button"
                        onClick={() => handleSuggestionClick(course.id)}
                        className="inline-block px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-sm text-gray-800"
                      >
                        {course.id}
                      </button>
                    ))}
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>
      
      {/* How It Works Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-4">How It Works</h2>
          <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">Our simple process gets you connected with qualified tutors in minutes</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-6 bg-blue-50 rounded-lg">
              <div className="bg-blue-600 text-white rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 text-2xl font-bold shadow-md">1</div>
              <h3 className="text-xl font-bold mb-2">Search</h3>
              <p className="text-gray-700">Find the perfect tutor for your specific University of Florida course. Filter by subject, department, or course code.</p>
            </div>
            <div className="text-center p-6 bg-blue-50 rounded-lg">
              <div className="bg-blue-600 text-white rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 text-2xl font-bold shadow-md">2</div>
              <h3 className="text-xl font-bold mb-2">Book</h3>
              <p className="text-gray-700">Schedule an online session at a time that works for you, and only get charged after the lesson is completed.</p>
            </div>
            <div className="text-center p-6 bg-blue-50 rounded-lg">
              <div className="bg-blue-600 text-white rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 text-2xl font-bold shadow-md">3</div>
              <h3 className="text-xl font-bold mb-2">Learn</h3>
              <p className="text-gray-700">Connect with your tutor and get the help you need to excel in your University of Florida courses.</p>
            </div>
          </div>

          <div className="mt-10 text-center">
            <Link href="/how-it-works" className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium">
              Learn more about how SwampTutors works
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </Link>
          </div>
        </div>

        {/* 24-Hour Policy Highlight */}
        {/* <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-10 max-w-3xl mx-auto">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-bold text-blue-800 mb-2">24-Hour Cancellation & Rescheduling Policy</h3>
                  <p className="text-gray-700 mb-2">
                    We maintain a fair 24-hour policy for both students and tutors:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm">
                    <li>Students can reschedule lessons up to 24 hours before the scheduled time</li>
                    <li>Tutors can cancel lessons up to 24 hours before the scheduled time</li>
                  </ul>
                  <p className="text-sm text-gray-600 mt-2">
                    This policy ensures reliability for everyone while providing reasonable flexibility.
                  </p>
                </div>
              </div>
            </div> */}
      </section>
      
      {/* Featured Tutors Section */}
      {/* <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-4">Top-Rated Tutors</h2>
          <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">Our tutors are experienced students and alumni with proven track records</p>
          <Suspense fallback={<div className="text-center">Loading featured tutors...</div>}>
            <FeaturedTutors />
          </Suspense>
        </div>
      </section> */}
      
      {/* Subject Categories */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-4">Browse by Subject</h2>
          <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">Find tutors specialized in your area of study</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <Link href="/search?dept=Computer Science" className="bg-blue-50 hover:bg-blue-100 p-6 rounded-lg text-center">
              <div className="text-blue-800 font-semibold">Computer Science</div>
            </Link>
            <Link href="/search?dept=Mathematics" className="bg-blue-50 hover:bg-blue-100 p-6 rounded-lg text-center">
              <div className="text-blue-800 font-semibold">Mathematics</div>
            </Link>
            <Link href="/search?dept=Physics" className="bg-blue-50 hover:bg-blue-100 p-6 rounded-lg text-center">
              <div className="text-blue-800 font-semibold">Physics</div>
            </Link>
            <Link href="/search?dept=Chemistry" className="bg-blue-50 hover:bg-blue-100 p-6 rounded-lg text-center">
              <div className="text-blue-800 font-semibold">Chemistry</div>
            </Link>
            <Link href="/search?dept=Biology" className="bg-blue-50 hover:bg-blue-100 p-6 rounded-lg text-center">
              <div className="text-blue-800 font-semibold">Biology</div>
            </Link>
            <Link href="/search?dept=Economics" className="bg-blue-50 hover:bg-blue-100 p-6 rounded-lg text-center">
              <div className="text-blue-800 font-semibold">Economics</div>
            </Link>
            <Link href="/search?dept=Accounting" className="bg-blue-50 hover:bg-blue-100 p-6 rounded-lg text-center">
              <div className="text-blue-800 font-semibold">Accounting</div>
            </Link>
            <Link href="/search" className="bg-orange-50 hover:bg-orange-100 p-6 rounded-lg text-center">
              <div className="text-orange-700 font-semibold">View All Subjects</div>
            </Link>
          </div>
        </div>
      </section>
      
      {/* Testimonials (Placeholder) */}
      <section className="py-16 bg-blue-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-4">What Students Say</h2>
          <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">Hear from students who found academic success with our tutors</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex items-center mb-4">
                <span className="text-yellow-500 text-xl">★★★★★</span>
                <span className="ml-2 text-gray-600">5.0</span>
              </div>
              <p className="text-gray-700 italic mb-4">"My tutor helped me understand calculus concepts I'd been struggling with all semester. I went from a C to an A in just a few weeks!"</p>
              <p className="font-semibold">- Sarah K., Freshman</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex items-center mb-4">
                <span className="text-yellow-500 text-xl">★★★★★</span>
                <span className="ml-2 text-gray-600">5.0</span>
              </div>
              <p className="text-gray-700 italic mb-4">"Finding a CS tutor who could explain data structures clearly made all the difference. Now I actually enjoy coding assignments!"</p>
              <p className="font-semibold">- James L., Junior</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex items-center mb-4">
                <span className="text-yellow-500 text-xl">★★★★★</span>
                <span className="ml-2 text-gray-600">5.0</span>
              </div>
              <p className="text-gray-700 italic mb-4">"My organic chemistry tutor knew exactly where I was getting stuck and had great tricks for remembering reaction mechanisms."</p>
              <p className="font-semibold">- Maria G., Senior</p>
            </div>
          </div>
        </div>
      </section>
      
      {/* Call-to-Action */}
      <section className="py-16 bg-gradient-to-r from-blue-800 to-blue-900 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to Excel in Your Courses?</h2>
          <p className="text-xl mb-4 max-w-2xl mx-auto">Join our platform today and get connected with top university tutors</p>
          
          {/* <div className="bg-white text-blue-900 rounded-lg p-4 mb-8 inline-block mx-auto">
            <p className="font-bold text-lg">All lessons at a flat rate of $65/hour.</p>
            <p className="text-sm">No hidden fees. No platform fees. Just quality tutoring.</p>
          </div> */}
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/tutor/register" className="bg-white text-blue-900 hover:bg-gray-100 px-8 py-4 rounded-md font-bold shadow-md">
              Become a Tutor
            </Link>
            <Link href="/student/register" className="bg-orange-500 text-white hover:bg-orange-600 px-8 py-4 rounded-md font-bold shadow-md">
              Find a Tutor
            </Link>
          </div>
        </div>
      </section>
      
      <Footer />
    </div>
  );
}

