"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../../../hooks/useAuth";
import { TutorSignupProvider, useTutorSignup } from "./TutorSignupContext";

// Define the steps in our signup process
const SIGNUP_STEPS = [
  { path: "/tutor/signup/how-it-works", label: "How It Works" },
  { path: "/tutor/signup/subjects", label: "Select Subjects" },
  { path: "/tutor/signup/basic-info", label: "Basic Information" },
  { path: "/tutor/signup/education", label: "Education" },
  { path: "/tutor/signup/profile", label: "Personalized Profile" },
  { path: "/tutor/signup/terms", label: "Terms of Tutoring" },
  { path: "/tutor/signup/verification", label: "Email Verification" },
  { path: "/tutor/signup/review", label: "Review & Submit" }
];

// Inner layout component that uses tutor signup context
function TutorSignupLayoutInner({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { completedSteps, areAllStepsCompleteExcept } = useTutorSignup();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    // Find current step index
    const currentStep = SIGNUP_STEPS.findIndex(step => step.path === pathname);
    if (currentStep !== -1) {
      setCurrentStepIndex(currentStep);
    }
  }, [pathname]);

  // Function to navigate to a step
  const navigateToStep = (stepPath: string, index: number) => {
    // Allow navigation to any step, including Review step
    router.push(stepPath);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-center text-gray-900">Complete Your Tutor Profile</h1>
            <p className="text-center text-gray-600 mt-2">
              Complete the following steps to start tutoring
            </p>
          </div>

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="relative">
              {/* Progress Bar Steps */}
              <div className="flex justify-between mb-2">
                {SIGNUP_STEPS.map((step, index) => {
                  const isCompleted = completedSteps[step.path];
                  const isClickable = true; // Make all steps clickable at all times
                  
                  return (
                    <div 
                      key={index} 
                      className="relative flex flex-col items-center"
                    >
                      <div 
                        onClick={() => isClickable ? navigateToStep(step.path, index) : null}
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2 z-10
                          ${isCompleted ? 'bg-green-600 border-green-600 text-white' :
                            index === currentStepIndex ? 'bg-white border-blue-600 text-blue-600' : 
                            'bg-white border-gray-300 text-gray-500'}
                          ${isClickable ? 'cursor-pointer hover:opacity-80' : 'cursor-not-allowed opacity-60'}`}
                      >
                        {isCompleted ? (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          index + 1
                        )}
                      </div>
                      <span 
                        onClick={() => isClickable ? navigateToStep(step.path, index) : null}
                        className={`text-xs mt-1 whitespace-nowrap 
                          ${isCompleted ? 'font-medium text-green-700' :
                            index === currentStepIndex ? 'font-medium text-blue-600' : 
                            'text-gray-500'}
                          ${isClickable ? 'cursor-pointer hover:opacity-80' : 'cursor-not-allowed opacity-60'}`}
                      >
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
              
              {/* Progress Bar Line */}
              <div className="absolute top-4 left-0 transform -translate-y-1/2 h-1 bg-gray-300 w-full -z-10"></div>
              <div 
                className="absolute top-4 left-0 transform -translate-y-1/2 h-1 bg-green-600 -z-10"
                style={{ width: `${(Object.keys(completedSteps).length / (SIGNUP_STEPS.length - 1)) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Page Content */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TutorSignupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Redirect if not logged in
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  if (authLoading) {
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
    <TutorSignupProvider>
      <TutorSignupLayoutInner>
        {children}
      </TutorSignupLayoutInner>
    </TutorSignupProvider>
  );
} 