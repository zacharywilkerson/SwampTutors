"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../firebase/config';

type TutorSignupContextType = {
  formData: {
    bio: string;
    email: string;
    phoneNumber: string;
    yearOfBirth: string;
    education: {
      undergraduate: {
        college: string;
        major: string;
        startYear: string;
        endYear: string;
      };
      graduate: Array<{
        college: string;
        degreeType: string;
      }>;
      teachingCertificate: boolean;
    };
    hourlyRate: number | string;
    coursesTaught: string[];
    profileHeadline: string;
    profilePictureUrl: string;
    transcriptUrl: string;
    termsAgreed: boolean;
    emailVerified: boolean;
  };
  updateFormData: (field: string, value: any) => void;
  updateEducationField: (section: string, field: string, value: string, index?: number) => void;
  updateCourses: (courseIds: string[]) => void;
  addCourse: (courseId: string) => void;
  removeCourse: (courseId: string) => void;
  isLoading: boolean;
  saveProgress: () => Promise<void>;
  submitProfile: () => Promise<void>;
  isSubmitting: boolean;
  submitError: string;
  submitSuccess: boolean;
  completedSteps: Record<string, boolean>;
  markStepComplete: (stepPath: string) => void;
  markStepIncomplete: (stepPath: string) => void;
  isStepComplete: (stepPath: string) => boolean;
  areAllStepsCompleteExcept: (excludedStepPath: string) => boolean;
};

const TutorSignupContext = createContext<TutorSignupContextType | undefined>(undefined);

export function TutorSignupProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>({});
  
  const [formData, setFormData] = useState({
    bio: "",
    email: "",
    phoneNumber: "",
    yearOfBirth: "",
    education: {
      undergraduate: {
        college: "University of Florida",
        major: "",
        startYear: "",
        endYear: ""
      },
      graduate: [
        { college: "", degreeType: "" },
        { college: "", degreeType: "" }
      ],
      teachingCertificate: false
    },
    hourlyRate: 65,
    coursesTaught: [] as string[],
    profileHeadline: "",
    profilePictureUrl: "",
    transcriptUrl: "",
    termsAgreed: false,
    emailVerified: false
  });

  useEffect(() => {
    const fetchExistingData = async () => {
      if (!user) return;
      
      try {
        setIsLoading(true);
        const tutorDoc = await getDoc(doc(db, 'tutors', user.uid));
        
        // Set email from Firebase user
        setFormData(prev => ({
          ...prev,
          email: user.email || ""
        }));

        if (tutorDoc.exists()) {
          const tutorData = tutorDoc.data();
          
          // Load completed steps if they exist
          if (tutorData.completedSteps && typeof tutorData.completedSteps === 'object') {
            setCompletedSteps(tutorData.completedSteps);
          }
          
          // Convert old education string format to new object format if needed
          let educationData = {
            undergraduate: {
              college: "University of Florida",
              major: "",
              startYear: "",
              endYear: ""
            },
            graduate: [
              { college: "", degreeType: "" },
              { college: "", degreeType: "" }
            ],
            teachingCertificate: false
          };
          
          // If existing data is in the new format, use it
          if (tutorData.education && typeof tutorData.education === 'object') {
            educationData = tutorData.education;
          } 
          // If it's in the old string format, use it as the undergraduate college
          else if (tutorData.education) {
            educationData.undergraduate.college = tutorData.education;
          }

          setFormData(prev => ({
            ...prev,
            bio: tutorData.bio || "",
            email: user.email || tutorData.email || "",
            phoneNumber: tutorData.phoneNumber || "",
            yearOfBirth: tutorData.yearOfBirth || "",
            education: educationData,
            hourlyRate: tutorData.hourlyRate || 65,
            coursesTaught: tutorData.coursesTaught || [],
            profileHeadline: tutorData.profileHeadline || "",
            profilePictureUrl: tutorData.profilePictureUrl || "",
            transcriptUrl: tutorData.transcriptUrl || "",
            termsAgreed: tutorData.termsAgreed || false,
            emailVerified: !!user.emailVerified
          }));
        }
      } catch (error) {
        console.error("Error loading tutor data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchExistingData();
  }, [user]);

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const updateEducationField = (section: string, field: string, value: string, index?: number) => {
    setFormData(prev => {
      const newFormData = { ...prev };
      
      if (section === 'undergraduate') {
        // Handle undergraduate fields
        newFormData.education = {
          ...newFormData.education,
          undergraduate: {
            ...newFormData.education.undergraduate,
            [field]: value
          }
        };
      } else if (section === 'graduate' && typeof index === 'number') {
        // Handle graduate fields with index
        newFormData.education = {
          ...newFormData.education,
          graduate: newFormData.education.graduate.map((grad, i) => 
            i === index ? { ...grad, [field]: value } : grad
          )
        };
      } else if (section === 'teachingCertificate') {
        // Handle teaching certificate checkbox
        newFormData.education = {
          ...newFormData.education,
          teachingCertificate: value === 'true'
        };
      }
      
      return newFormData;
    });
  };

  const updateCourses = (courseIds: string[]) => {
    setFormData(prev => ({
      ...prev,
      coursesTaught: courseIds
    }));
  };

  const addCourse = (courseId: string) => {
    if (!formData.coursesTaught.includes(courseId)) {
      setFormData(prev => ({
        ...prev,
        coursesTaught: [...prev.coursesTaught, courseId]
      }));
    }
  };

  const removeCourse = (courseId: string) => {
    setFormData(prev => ({
      ...prev,
      coursesTaught: prev.coursesTaught.filter(id => id !== courseId)
    }));
  };

  const saveProgress = async () => {
    if (!user) return;
    
    try {
      // Validate hourly rate before saving
      const validatedFormData = {
        ...formData,
        hourlyRate: typeof formData.hourlyRate === 'string' || formData.hourlyRate < 1 ? 65 : formData.hourlyRate
      };
      
      // Data to be saved to Firebase - using any to allow for dynamic properties
      const dataToSave: Record<string, any> = {
        bio: validatedFormData.bio,
        email: validatedFormData.email,
        phoneNumber: validatedFormData.phoneNumber,
        yearOfBirth: validatedFormData.yearOfBirth,
        education: validatedFormData.education,
        hourlyRate: validatedFormData.hourlyRate,
        coursesTaught: validatedFormData.coursesTaught,
        profileHeadline: validatedFormData.profileHeadline,
        profilePictureUrl: validatedFormData.profilePictureUrl,
        transcriptUrl: validatedFormData.transcriptUrl,
        termsAgreed: validatedFormData.termsAgreed,
        profileStatus: 'incomplete' // Still in progress
      };
      
      // Only include completedSteps if they've changed from the last save
      const hasCompletedSteps = Object.keys(completedSteps).length > 0;
      if (hasCompletedSteps) {
        dataToSave.completedSteps = completedSteps;
      }
      
      await updateDoc(doc(db, 'tutors', user.uid), dataToSave);
    } catch (error) {
      console.error("Error saving progress:", error);
    }
  };

  const submitProfile = async () => {
    if (!user) return;
    
    setIsSubmitting(true);
    setSubmitError("");
    
    try {
      // Validate hourly rate before submission
      const validatedFormData = {
        ...formData,
        hourlyRate: typeof formData.hourlyRate === 'string' || formData.hourlyRate < 1 ? 65 : formData.hourlyRate
      };
      
      // Data to be saved to Firebase
      const dataToSave: Record<string, any> = {
        bio: validatedFormData.bio,
        email: validatedFormData.email,
        phoneNumber: validatedFormData.phoneNumber,
        yearOfBirth: validatedFormData.yearOfBirth,
        education: validatedFormData.education,
        hourlyRate: validatedFormData.hourlyRate,
        coursesTaught: validatedFormData.coursesTaught,
        profileHeadline: validatedFormData.profileHeadline,
        profilePictureUrl: validatedFormData.profilePictureUrl,
        transcriptUrl: validatedFormData.transcriptUrl,
        termsAgreed: validatedFormData.termsAgreed,
        profileStatus: 'pending' // Pending review by admin
      };
      
      // Always include completedSteps for the final submission
      dataToSave.completedSteps = completedSteps;
      
      await updateDoc(doc(db, 'tutors', user.uid), dataToSave);
      
      setSubmitSuccess(true);
    } catch (error) {
      console.error("Error submitting profile:", error);
      setSubmitError("Failed to submit profile. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const markStepComplete = async (stepPath: string) => {
    // Check if the step is already marked as complete
    if (completedSteps[stepPath]) {
      return; // Skip the operation if already complete
    }
    
    // Update local state
    setCompletedSteps(prev => ({
      ...prev,
      [stepPath]: true
    }));
    
    // Save step completion status to Firebase
    if (user) {
      try {
        const updatedCompletedSteps = {
          ...completedSteps,
          [stepPath]: true
        };
        
        await updateDoc(doc(db, 'tutors', user.uid), {
          completedSteps: updatedCompletedSteps
        });
      } catch (error) {
        console.error("Error saving step completion status:", error);
      }
    }
  };

  const markStepIncomplete = async (stepPath: string) => {
    // Check if the step is already marked as incomplete
    if (!completedSteps[stepPath]) {
      return; // Skip the operation if already incomplete
    }
    
    // Update local state
    setCompletedSteps(prev => ({
      ...prev,
      [stepPath]: false
    }));
    
    // Update step completion status in Firebase
    if (user) {
      try {
        const updatedCompletedSteps = {
          ...completedSteps,
          [stepPath]: false
        };
        
        await updateDoc(doc(db, 'tutors', user.uid), {
          completedSteps: updatedCompletedSteps
        });
      } catch (error) {
        console.error("Error saving step completion status:", error);
      }
    }
  };

  const isStepComplete = (stepPath: string) => {
    return completedSteps[stepPath] || false;
  };

  const areAllStepsCompleteExcept = (excludedStepPath: string) => {
    // Define all required steps in the tutor signup flow
    const requiredSteps = [
      '/tutor/signup/how-it-works',
      '/tutor/signup/subjects',
      '/tutor/signup/basic-info',
      '/tutor/signup/education',
      '/tutor/signup/profile',
      '/tutor/signup/terms',
      '/tutor/signup/verification',
      '/tutor/signup/review'
    ];
    
    // Filter out the excluded step
    const stepsToCheck = requiredSteps.filter(step => step !== excludedStepPath);
    
    // Check if all required steps (except the excluded one) are marked as complete
    return stepsToCheck.every(step => completedSteps[step] === true);
  };

  return (
    <TutorSignupContext.Provider
      value={{
        formData,
        updateFormData,
        updateEducationField,
        updateCourses,
        addCourse,
        removeCourse,
        isLoading,
        saveProgress,
        submitProfile,
        isSubmitting,
        submitError,
        submitSuccess,
        completedSteps,
        markStepComplete,
        markStepIncomplete,
        isStepComplete,
        areAllStepsCompleteExcept
      }}
    >
      {children}
    </TutorSignupContext.Provider>
  );
}

export function useTutorSignup() {
  const context = useContext(TutorSignupContext);
  if (context === undefined) {
    throw new Error('useTutorSignup must be used within a TutorSignupProvider');
  }
  return context;
} 