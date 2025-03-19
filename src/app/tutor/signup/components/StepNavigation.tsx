"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';
import { useTutorSignup } from '../TutorSignupContext';

type StepNavigationProps = {
  prevStep?: string;
  nextStep?: string;
  isLastStep?: boolean;
  validateStep?: () => boolean;
  buttonText?: string;
  disableNext?: boolean;
};

export default function StepNavigation({
  prevStep,
  nextStep,
  isLastStep = false,
  validateStep,
  buttonText,
  disableNext = false
}: StepNavigationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { saveProgress, submitProfile, isSubmitting, isStepComplete, markStepComplete, markStepIncomplete } = useTutorSignup();
  const [isFormLocked, setIsFormLocked] = useState(false);
  const [validationFailed, setValidationFailed] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formEdited, setFormEdited] = useState(false);

  // Check if the current step is completed
  useEffect(() => {
    if (pathname) {
      const completed = isStepComplete(pathname);
      setIsFormLocked(completed);
      // Reset form edited state when navigating to a new page
      setFormEdited(false);
    }
  }, [pathname, isStepComplete]);

  // Track form changes
  useEffect(() => {
    const handleFormChange = () => {
      if (isFormLocked) return; // Don't track changes when form is locked
      setFormEdited(true);
    };

    // Add event listeners to capture any form input changes
    const form = document.querySelector('form');
    if (form) {
      // Listen to input, change, and paste events
      form.addEventListener('input', handleFormChange);
      form.addEventListener('change', handleFormChange);
      
      return () => {
        // Clean up event listeners
        form.removeEventListener('input', handleFormChange);
        form.removeEventListener('change', handleFormChange);
      };
    }
  }, [isFormLocked]);

  const handleNext = async () => {
    if (isSaving || disableNext) return;
    
    // Reset validation state
    setValidationFailed(false);
    
    // If validation function is provided and it returns false, don't proceed
    if (validateStep && !validateStep()) {
      setValidationFailed(true);
      return;
    }

    try {
      setIsSaving(true);
      
      // Only save progress if the form has been edited or is not already completed
      if (formEdited || !isFormLocked) {
        await saveProgress();
      }
      
      // Only mark as complete if it's not already completed
      if (!isFormLocked && pathname) {
        await markStepComplete(pathname);
      }
      
      // If it's the last step, submit the profile
      if (isLastStep) {
        await submitProfile();
        router.push('/tutor/profile-pending');
        return;
      }
      
      // Otherwise, navigate to the next step
      if (nextStep) {
        router.push(nextStep);
      }
    } catch (error) {
      console.error("Error saving progress or marking step complete:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleBack = () => {
    if (prevStep) {
      router.push(prevStep);
    }
  };

  const handleEdit = async () => {
    if (!pathname || isSaving) return;
    
    try {
      setIsSaving(true);
      await markStepIncomplete(pathname);
      setIsFormLocked(false);
      // Reset edited state since we're starting fresh
      setFormEdited(false);
    } catch (error) {
      console.error("Error marking step as incomplete:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // Disable form inputs when locked
  useEffect(() => {
    if (!pathname) return;
    
    const form = document.querySelector('form');
    const inputs = document.querySelectorAll('input, select, textarea');
    
    if (isFormLocked) {
      inputs.forEach(input => {
        if (input instanceof HTMLElement) {
          input.setAttribute('disabled', 'true');
        }
      });
    } else {
      inputs.forEach(input => {
        if (input instanceof HTMLElement) {
          input.removeAttribute('disabled');
        }
      });
    }
    
    return () => {
      // Cleanup - ensure inputs are re-enabled when component unmounts
      inputs.forEach(input => {
        if (input instanceof HTMLElement) {
          input.removeAttribute('disabled');
        }
      });
    };
  }, [isFormLocked, pathname]);

  return (
    <div className="flex justify-between mt-6 pt-6 border-t border-gray-200">
      <button
        type="button"
        onClick={handleBack}
        disabled={!prevStep || isSubmitting || isSaving}
        className={`px-4 py-2 border rounded-md text-gray-700 bg-white ${(!prevStep || isSubmitting || isSaving) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`}
      >
        Back
      </button>
      
      {isFormLocked && (
        <button
          type="button"
          onClick={handleEdit}
          disabled={isSaving}
          className="px-4 py-2 border border-blue-300 text-blue-700 rounded-md hover:bg-blue-50 disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Edit'}
        </button>
      )}
      
      {/* Validation failed message */}
      {validationFailed && (
        <div className="absolute bottom-20 left-0 right-0 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm mx-6">
          Please fill out all required fields correctly before continuing.
        </div>
      )}
      
      <button
        type="button"
        onClick={handleNext}
        disabled={isSubmitting || isSaving || disableNext}
        className={`px-6 py-2 ${
          disableNext 
            ? 'bg-gray-400' 
            : isFormLocked 
              ? 'bg-green-600 hover:bg-green-700' 
              : 'bg-blue-600 hover:bg-blue-700'
        } text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {isSubmitting || isSaving
          ? 'Saving...' 
          : buttonText 
            ? buttonText 
            : isLastStep 
              ? 'Submit Profile' 
              : isFormLocked ? 'Next' : 'Continue'}
      </button>
    </div>
  );
} 