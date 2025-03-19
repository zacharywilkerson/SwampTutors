"use client";

import { useState, useEffect } from 'react';
import { useTutorSignup } from '../TutorSignupContext';
import StepNavigation from '../components/StepNavigation';
import { ALL_COURSES } from '../../../../constants/courses';
import { usePathname } from 'next/navigation';

export default function ReviewStep() {
  const pathname = usePathname();
  const { 
    formData, 
    submitProfile, 
    isLoading, 
    isSubmitting, 
    submitError, 
    submitSuccess,
    areAllStepsCompleteExcept,
    completedSteps,
    isStepComplete
  } = useTutorSignup();
  
  const [allStepsComplete, setAllStepsComplete] = useState(false);
  const [incompleteSteps, setIncompleteSteps] = useState<string[]>([]);
  
  // Check if all other steps are complete and identify incomplete steps
  useEffect(() => {
    if (pathname) {
      const requiredSteps = [
        { path: '/tutor/signup/how-it-works', label: 'How It Works' },
        { path: '/tutor/signup/subjects', label: 'Select Subjects' },
        { path: '/tutor/signup/basic-info', label: 'Basic Information' },
        { path: '/tutor/signup/education', label: 'Education' },
        { path: '/tutor/signup/profile', label: 'Profile' },
        { path: '/tutor/signup/terms', label: 'Terms of Tutoring' },
        { path: '/tutor/signup/verification', label: 'Email Verification' }
      ];
      
      // Get incomplete steps
      const incomplete = requiredSteps
        .filter(step => !isStepComplete(step.path))
        .map(step => step.label);
        
      setIncompleteSteps(incomplete);
      setAllStepsComplete(areAllStepsCompleteExcept(pathname));
    }
  }, [pathname, areAllStepsCompleteExcept, isStepComplete]);
  
  // Get course details for display
  const getSelectedCourses = () => {
    return formData.coursesTaught.map(courseId => {
      const course = ALL_COURSES.find(c => c.id === courseId);
      return course || { id: courseId, description: "Unknown Course" };
    });
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
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Review Your Profile</h2>
      <p className="text-gray-600 mb-6">
        Please review your information before submitting your profile for approval.
      </p>

      {!allStepsComplete && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-md mb-6">
          <p className="font-medium">Missing Information</p>
          <p>You need to complete all previous steps before you can submit your profile for review.</p>
          {incompleteSteps.length > 0 && (
            <div className="mt-2">
              <p className="font-medium">Incomplete sections:</p>
              <ul className="list-disc list-inside ml-2 mt-1">
                {incompleteSteps.map((step, index) => (
                  <li key={index}>{step}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {submitSuccess && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md mb-6">
          <p className="font-medium">Profile submitted successfully!</p>
          <p>Your profile will be reviewed by our team. You'll be notified once it's approved.</p>
        </div>
      )}

      {submitError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
          <p className="font-medium">Error submitting profile:</p>
          <p>{submitError}</p>
        </div>
      )}

      <div className="space-y-8">
        {/* Basic Information Section */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">Email</h4>
                <p className="text-gray-900">{formData.email}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">Phone Number</h4>
                <p className="text-gray-900">{formData.phoneNumber}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">Year of Birth</h4>
                <p className="text-gray-900">{formData.yearOfBirth}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">Hourly Rate</h4>
                <p className="text-gray-900">${formData.hourlyRate}/hour</p>
              </div>
            </div>
          </div>
        </div>

        {/* Education Section */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Education</h3>
          </div>
          <div className="p-6">
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-3">Undergraduate</h4>
                <div className="ml-2 space-y-2">
                  <div>
                    <span className="text-sm font-medium text-gray-600">College:</span>{" "}
                    <span className="text-gray-900">{formData.education.undergraduate.college}</span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600">Major:</span>{" "}
                    <span className="text-gray-900">{formData.education.undergraduate.major}</span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600">Years:</span>{" "}
                    <span className="text-gray-900">
                      {formData.education.undergraduate.startYear} - {formData.education.undergraduate.endYear}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-3">Graduate (if applicable)</h4>
                {formData.education.graduate.some(grad => grad.college || grad.degreeType) ? (
                  <div className="space-y-4">
                    {formData.education.graduate.map((grad, index) => (
                      grad.college || grad.degreeType ? (
                        <div key={index} className="ml-2 pb-2 border-b border-gray-100 space-y-2">
                          <div>
                            <span className="text-sm font-medium text-gray-600">College:</span>{" "}
                            <span className="text-gray-900">{grad.college}</span>
                          </div>
                          <div>
                            <span className="text-sm font-medium text-gray-600">Degree Type:</span>{" "}
                            <span className="text-gray-900">{grad.degreeType}</span>
                          </div>
                        </div>
                      ) : null
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 italic ml-2">No graduate education entered</p>
                )}
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">Teaching Certificate</h4>
                <p className="text-gray-900">
                  {formData.education.teachingCertificate ? "Yes" : "No"}
                </p>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">Unofficial Transcript</h4>
                <p className="text-gray-900">
                  {formData.transcriptUrl ? (
                    <a href={formData.transcriptUrl} target="_blank" rel="noopener noreferrer" 
                      className="text-blue-600 hover:text-blue-800 hover:underline">
                      View Transcript
                    </a>
                  ) : (
                    <span className="text-gray-500 italic">Not provided</span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Section */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Profile</h3>
          </div>
          <div className="p-6">
            <div className="flex flex-col md:flex-row md:space-x-6">
              <div className="md:w-1/4 flex-shrink-0 mb-4 md:mb-0">
                {formData.profilePictureUrl ? (
                  <img
                    src={formData.profilePictureUrl}
                    alt="Profile"
                    className="w-32 h-32 rounded-full mx-auto object-cover"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full mx-auto bg-gray-200 flex items-center justify-center">
                    <span className="text-gray-400 text-3xl">
                      {formData.profileHeadline?.charAt(0) || "?"}
                    </span>
                  </div>
                )}
              </div>
              <div className="md:w-3/4">
                <h4 className="text-sm font-medium text-gray-500 mb-1">Profile Headline</h4>
                <p className="text-gray-900 mb-4">{formData.profileHeadline}</p>
                
                <h4 className="text-sm font-medium text-gray-500 mb-1">Bio</h4>
                <p className="text-gray-900 whitespace-pre-line">{formData.bio}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Courses Section */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Courses You'll Teach</h3>
          </div>
          <div className="p-6">
            {formData.coursesTaught.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {getSelectedCourses().map(course => (
                  <div key={course.id} className="bg-blue-50 border border-blue-200 rounded-md p-3">
                    <p className="font-medium text-blue-800">{course.id}</p>
                    <p className="text-sm text-blue-700">{course.description}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 italic">No courses selected</p>
            )}
          </div>
        </div>

        {/* Legal Section */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Legal</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">Terms Agreement</h4>
                <p className="text-gray-900">
                  {formData.termsAgreed ? 
                    "✅ You have agreed to the Tutor Agreement, Terms of Service, and Privacy Policy." :
                    "❌ You have not agreed to the terms."
                  }
                </p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">Email Verification</h4>
                <p className="text-gray-900">
                  {formData.emailVerified ? 
                    "✅ Your email has been verified." :
                    "❌ Your email has not been verified. We strongly recommend verifying your email before submitting."
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <StepNavigation 
        prevStep="/tutor/signup/verification" 
        isLastStep={true}
        buttonText={allStepsComplete ? "Submit Profile for Review" : "Missing Information"}
        disableNext={!allStepsComplete}
      />
    </div>
  );
} 