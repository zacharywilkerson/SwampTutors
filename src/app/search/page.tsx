"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { getTutorsByCourse } from "../../firebase";
import { ALL_COURSES } from "../../constants/courses";
import { useAuth } from "../../hooks/useAuth";
import { useTutorRedirect } from "../../hooks/useTutorRedirect";
import ClientSearchParamsProvider from "../../components/ClientSearchParamsProvider";

export default function SearchPage() {
  return (
    <ClientSearchParamsProvider
      render={({ getParam }) => {
        return <SearchPageContent 
          query={getParam('q')} 
          deptFilter={getParam('dept')} 
        />;
      }}
    />
  );
}

function SearchPageContent({ 
  query, 
  deptFilter 
}: { 
  query: string | null, 
  deptFilter: string | null 
}) {
  const { user, userRole } = useAuth();
  // Check if tutor has completed profile
  const { isLoading: redirectLoading, hasCheckedStatus } = useTutorRedirect(['/tutor/profile-setup', '/tutor/profile-pending']);
  
  const [tutors, setTutors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(query || "");
  const [suggestions, setSuggestions] = useState<Array<{id: string, description: string, department?: string}>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState(deptFilter || "");
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Generate unique list of departments from ALL_COURSES
  const departments = [...new Set(ALL_COURSES.map(course => course.department))].sort();

  // Get popular courses from constants file instead of fetching from Firebase
  const popularCourses = ALL_COURSES
    .filter(course => 
      ["COP3502", "MAC2311", "PHY2048", "CHM2045", "BSC2010", "ECO2013", "COP3530", "MAC2312"]
      .includes(course.id)
    );

  useEffect(() => {
    // Don't fetch data until we've checked redirect status
    if (userRole === 'tutor' && !hasCheckedStatus) return;
    
    const fetchTutors = async () => {
      if (query) {
        setLoading(true);
        try {
          const tutorsData = await getTutorsByCourse(query);
          setTutors(tutorsData);
        } catch (error) {
          console.error("Error fetching tutors:", error);
        } finally {
          setLoading(false);
        }
      } else {
        setTutors([]);
        setLoading(false);
      }
    };

    fetchTutors();
  }, [query, userRole, hasCheckedStatus]);

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

  // Update suggestions as user types
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
    const url = new URL(window.location.href);
    url.searchParams.set("q", courseId);
    if (selectedDepartment) {
      url.searchParams.set("dept", selectedDepartment);
    } else {
      url.searchParams.delete("dept");
    }
    window.location.href = url.toString();
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
        const url = new URL(window.location.href);
        url.searchParams.set("q", exactPrefixMatch.id);
        if (selectedDepartment) {
          url.searchParams.set("dept", selectedDepartment);
        } else {
          url.searchParams.delete("dept");
        }
        window.location.href = url.toString();
        return;
      }
    } else {
      // For longer terms, prioritize meaningful content matches over code matches
      
      // 1. Try exact word match in description (highest priority for longer terms)
      const wordMatch = ALL_COURSES.find(course => 
        new RegExp(`\\b${searchTerm}\\b`, 'i').test(course.description.toLowerCase()) &&
        (selectedDepartment ? course.department === selectedDepartment : true)
      );
      
      if (wordMatch) {
        const url = new URL(window.location.href);
        url.searchParams.set("q", wordMatch.id);
        if (selectedDepartment) {
          url.searchParams.set("dept", selectedDepartment);
        } else {
          url.searchParams.delete("dept");
        }
        window.location.href = url.toString();
        return;
      }
      
      // 2. Try exact word match in department name
      const deptWordMatch = ALL_COURSES.find(course => 
        new RegExp(`\\b${searchTerm}\\b`, 'i').test(course.department?.toLowerCase() || '') &&
        (selectedDepartment ? course.department === selectedDepartment : true)
      );
      
      if (deptWordMatch) {
        const url = new URL(window.location.href);
        url.searchParams.set("q", deptWordMatch.id);
        if (selectedDepartment) {
          url.searchParams.set("dept", selectedDepartment);
        } else {
          url.searchParams.delete("dept");
        }
        window.location.href = url.toString();
        return;
      }
      
      // 3. Try exact course ID match
      const exactIdMatch = ALL_COURSES.find(course => 
        course.id.toLowerCase() === searchTerm &&
        (selectedDepartment ? course.department === selectedDepartment : true)
      );
      
      if (exactIdMatch) {
        const url = new URL(window.location.href);
        url.searchParams.set("q", exactIdMatch.id);
        if (selectedDepartment) {
          url.searchParams.set("dept", selectedDepartment);
        } else {
          url.searchParams.delete("dept");
        }
        window.location.href = url.toString();
        return;
      }
      
      // 4. Try partial match in description
      const descMatch = ALL_COURSES.find(course => 
        course.description.toLowerCase().includes(searchTerm) &&
        (selectedDepartment ? course.department === selectedDepartment : true)
      );
      
      if (descMatch) {
        const url = new URL(window.location.href);
        url.searchParams.set("q", descMatch.id);
        if (selectedDepartment) {
          url.searchParams.set("dept", selectedDepartment);
        } else {
          url.searchParams.delete("dept");
        }
        window.location.href = url.toString();
        return;
      }
      
      // 5. Try partial match in department
      const deptMatch = ALL_COURSES.find(course => 
        course.department?.toLowerCase().includes(searchTerm) &&
        (selectedDepartment ? course.department === selectedDepartment : true)
      );
      
      if (deptMatch) {
        const url = new URL(window.location.href);
        url.searchParams.set("q", deptMatch.id);
        if (selectedDepartment) {
          url.searchParams.set("dept", selectedDepartment);
        } else {
          url.searchParams.delete("dept");
        }
        window.location.href = url.toString();
        return;
      }
      
      // 6. Try partial match in course ID (lowest priority)
      const codeMatch = ALL_COURSES.find(course => 
        course.id.toLowerCase().includes(searchTerm) &&
        (selectedDepartment ? course.department === selectedDepartment : true)
      );
      
      if (codeMatch) {
        const url = new URL(window.location.href);
        url.searchParams.set("q", codeMatch.id);
        if (selectedDepartment) {
          url.searchParams.set("dept", selectedDepartment);
        } else {
          url.searchParams.delete("dept");
        }
        window.location.href = url.toString();
        return;
      }
    }
    
    // If no appropriate matches found, just search with the query as is
    const url = new URL(window.location.href);
    url.searchParams.set("q", query);
    if (selectedDepartment) {
      url.searchParams.set("dept", selectedDepartment);
    } else {
      url.searchParams.delete("dept");
    }
    window.location.href = url.toString();
  };

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
      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Search Box */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h1 className="text-2xl font-bold mb-4">Find a Tutor</h1>
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
          
          {/* Popular Courses */}
          {popularCourses.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-gray-700 mb-2">Popular courses:</p>
              <div className="flex flex-wrap gap-2">
                {popularCourses.map((course) => (
                  <Link
                    key={course.id}
                    href={`/search?q=${encodeURIComponent(course.id)}`}
                    className="inline-block px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-sm"
                  >
                    {course.id} - {course.description.length > 20 
                      ? `${course.description.substring(0, 20)}...`
                      : course.description}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Search Results */}
        {query ? (
          loading ? (
            <div className="text-center py-12">
              <p className="text-gray-600">Loading tutors...</p>
            </div>
          ) : tutors.length > 0 ? (
            <div>
              <h2 className="text-xl font-bold mb-4">Tutors for {query}</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tutors.map((tutor) => (
                  <Link key={tutor.id} href={`/tutor/${tutor.id}`} className="group">
                    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 h-full flex flex-col">
                      <div className="p-5 flex flex-col h-full">
                        {/* Tutor Header with Image and Basic Info */}
                        <div className="flex items-center mb-4">
                          {tutor.profilePictureUrl ? (
                            <div className="w-14 h-14 rounded-full overflow-hidden mr-3 border-2 border-gray-200">
                              <img 
                                src={tutor.profilePictureUrl} 
                                alt={tutor.displayName || "Tutor"}
                                className="w-full h-full object-cover" 
                              />
                            </div>
                          ) : (
                            <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-xl mr-3 border-2 border-gray-200">
                              {tutor.displayName?.charAt(0) || "T"}
                            </div>
                          )}
                          <div className="flex-1">
                            <h3 className="text-lg font-bold text-gray-800 group-hover:text-blue-600 transition-colors duration-200">{tutor.displayName}</h3>
                            <div className="flex items-center space-x-3">
                              <div className="flex items-center">
                                <span className="text-yellow-500 mr-1">★</span>
                                <span className="text-gray-700">{tutor.rating?.toFixed(1) || "New"}</span>
                              </div>
                              <p className="text-teal-600 font-medium">${tutor.hourlyRate || 65}/hr</p>
                            </div>
                          </div>
                        </div>
                        
                        {/* Profile headline */}
                        {tutor.profileHeadline && (
                          <p className="text-gray-800 font-medium mb-2">{tutor.profileHeadline}</p>
                        )}
                        
                        {/* Bio preview */}
                        <p className="text-gray-600 mb-3 line-clamp-2 text-sm flex-grow">
                          {tutor.bio || "No bio available"}
                        </p>
                        
                        {/* Education */}
                        {tutor.education && typeof tutor.education === 'object' && (
                          <div className="mb-3">
                            <p className="text-xs text-gray-500 uppercase font-medium mb-1">Education</p>
                            <div className="flex flex-wrap gap-1">
                              {tutor.education.undergraduate?.college && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                                  {tutor.education.undergraduate.college}
                                </span>
                              )}
                              {tutor.education.graduate && Array.isArray(tutor.education.graduate) && tutor.education.graduate.map((grad: {college?: string; degreeType?: string}, idx: number) => (
                                grad.college && (
                                  <span key={idx} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                                    {grad.college}
                                  </span>
                                )
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Courses: Show only approved courses */}
                        <div>
                          <p className="text-xs text-gray-500 uppercase font-medium mb-1">Courses</p>
                          <div className="flex flex-wrap gap-1.5">
                            {tutor.approvedCourses?.slice(0, 5).map((course: string) => (
                              <span key={course} className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-md">
                                {course}
                              </span>
                            ))}
                            {(tutor.approvedCourses?.length || 0) > 5 && (
                              <span className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-md">
                                +{(tutor.approvedCourses?.length || 0) - 5} more
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {/* View Profile Button */}
                        <div className="mt-4">
                          <div className="block text-center bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded text-sm transition-colors duration-200">
                            View Profile
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-600">No tutors found for {query}.</p>
              <p className="mt-2">
                <Link href="/" className="text-blue-600 hover:underline">
                  Try a different course
                </Link>
              </p>
            </div>
          )
        ) : null}
      </main>
    </div>
  );
}