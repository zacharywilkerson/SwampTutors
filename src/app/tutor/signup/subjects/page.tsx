"use client";

import { useState, useEffect } from 'react';
import { useTutorSignup } from '../TutorSignupContext';
import StepNavigation from '../components/StepNavigation';
import { ALL_COURSES } from '../../../../constants/courses';

export default function SubjectsStep() {
  const { formData, updateCourses, isLoading } = useTutorSignup();
  const [coursesByDepartment, setCoursesByDepartment] = useState<Record<string, any[]>>({});
  const [expandedDepartments, setExpandedDepartments] = useState<Record<string, boolean>>({});
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [showValidationError, setShowValidationError] = useState(false);

  // Group courses by department and initialize selected courses
  useEffect(() => {
    if (isLoading) return;

    // Initialize selected courses from form data
    setSelectedCourses(formData.coursesTaught);
    
    // Group courses by department
    const groupedCourses: Record<string, any[]> = {};
    
    ALL_COURSES.forEach(course => {
      const dept = course.department || 'Other';
      if (!groupedCourses[dept]) {
        groupedCourses[dept] = [];
      }
      groupedCourses[dept].push(course);
    });
    
    setCoursesByDepartment(groupedCourses);
  }, [isLoading, formData.coursesTaught]);

  const toggleDepartment = (department: string) => {
    setExpandedDepartments(prev => ({
      ...prev,
      [department]: !prev[department]
    }));
  };

  const toggleCourse = (courseId: string) => {
    setSelectedCourses(prev => {
      if (prev.includes(courseId)) {
        return prev.filter(id => id !== courseId);
      } else {
        return [...prev, courseId];
      }
    });
    
    // Update the form data when courses change
    updateCourses(
      selectedCourses.includes(courseId) 
        ? selectedCourses.filter(id => id !== courseId)
        : [...selectedCourses, courseId]
    );
    
    setShowValidationError(false);
  };

  const validateStep = (): boolean => {
    if (selectedCourses.length === 0) {
      setShowValidationError(true);
      return false;
    }
    return true;
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[300px]">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Select Subjects to Teach</h2>
      <p className="text-gray-600 mb-6">
        Choose the subjects you're qualified to teach. You can select multiple courses across departments.
      </p>

      <form onSubmit={(e) => e.preventDefault()} className="mb-6">
        {showValidationError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm mb-6">
            Please select at least one course to teach.
          </div>
        )}

        <div className="mb-6">
          <div className="font-medium text-gray-700 mb-2">Selected Courses: {selectedCourses.length}</div>
          <div className="flex flex-wrap gap-2">
            {selectedCourses.length > 0 ? (
              selectedCourses.map(courseId => {
                const course = ALL_COURSES.find(c => c.id === courseId);
                return (
                  <div 
                    key={courseId}
                    className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center"
                  >
                    <span>{course?.id || courseId}</span>
                    <button
                      type="button"
                      onClick={() => toggleCourse(courseId)}
                      className="ml-2 text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </div>
                );
              })
            ) : (
              <p className="text-gray-500 italic">No courses selected yet</p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {Object.entries(coursesByDepartment).map(([department, courses]) => (
            <div 
              key={department}
              className="border border-gray-200 rounded-md overflow-hidden"
            >
              <div 
                className="bg-gray-50 px-4 py-3 cursor-pointer flex justify-between items-center"
                onClick={() => toggleDepartment(department)}
              >
                <h3 className="font-medium text-gray-800">{department} ({courses.length})</h3>
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className={`h-5 w-5 text-gray-500 transition-transform ${expandedDepartments[department] ? 'transform rotate-180' : ''}`} 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              
              {expandedDepartments[department] && (
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[300px] overflow-y-auto">
                  {courses.map(course => (
                    <div key={course.id} className="flex items-start space-x-2">
                      <input
                        type="checkbox"
                        id={course.id}
                        checked={selectedCourses.includes(course.id)}
                        onChange={() => toggleCourse(course.id)}
                        className="mt-1"
                      />
                      <label htmlFor={course.id} className="text-sm">
                        <div className="font-medium">{course.id}</div>
                        <div className="text-gray-600">{course.description}</div>
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </form>

      <StepNavigation 
        prevStep="/tutor/signup/how-it-works"
        nextStep="/tutor/signup/basic-info"
        validateStep={validateStep}
      />
    </div>
  );
} 