"use client";

import { useState } from 'react';
import { useTutorSignup } from '../TutorSignupContext';
import StepNavigation from '../components/StepNavigation';

export default function BasicInfoStep() {
  const { formData, updateFormData, isLoading } = useTutorSignup();
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  
  // Get current year for YOB validation
  const currentYear = new Date().getFullYear();
  // Calculate the minimum year for someone to be at least 18 years old
  const minYearForAdult = currentYear - 18;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name === 'phoneNumber' || name === 'yearOfBirth') {
      updateFormData(name, value);
      // Clear any error for this field
      if (errors[name]) {
        setErrors(prev => ({ ...prev, [name]: '' }));
      }
    } else {
      updateFormData(name, value);
      
      // Clear any error for this field
      if (errors[name]) {
        setErrors(prev => ({ ...prev, [name]: '' }));
      }
    }
  };

  const validateStep = (): boolean => {
    const newErrors: { [key: string]: string } = {};
    
    // Validate Year of Birth
    if (!formData.yearOfBirth) {
      newErrors.yearOfBirth = 'Year of Birth is required';
    } else {
      const yearOfBirth = Number(formData.yearOfBirth);
      // Check if it's a valid year and user is at least 18
      if (isNaN(yearOfBirth) || yearOfBirth < 1900 || yearOfBirth > minYearForAdult) {
        newErrors.yearOfBirth = `Year must be between 1900 and ${minYearForAdult} (minimum age: 18)`;
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Your Basic Information</h2>
      <p className="text-gray-600 mb-6">
        Let students know how to contact you.
      </p>

      <form onSubmit={(e) => e.preventDefault()} className="space-y-6 mb-6">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            readOnly
            className="w-full px-3 py-2 border border-gray-300 bg-gray-50 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="mt-1 text-sm text-gray-500">
            This email is linked to your account and cannot be changed. This may be visible to students.
          </p>
        </div>

        <div>
          <label htmlFor="yearOfBirth" className="block text-sm font-medium text-gray-700 mb-1">
            Year of Birth <span className="text-red-500">*</span>
          </label>
          <input
            id="yearOfBirth"
            name="yearOfBirth"
            type="number"
            min="1900"
            max={minYearForAdult}
            value={formData.yearOfBirth || ''}
            onChange={handleChange}
            placeholder={`e.g. ${minYearForAdult - 5}`}
            className={`w-full px-3 py-2 border ${errors.yearOfBirth ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
            required
          />
          <p className="mt-1 text-sm text-gray-500">
            You must be at least 18 years old to sign up as a tutor. This will be used to verify your age and will never be shared with students.
          </p>
          {errors.yearOfBirth && (
            <p className="mt-1 text-sm text-red-600">{errors.yearOfBirth}</p>
          )}
        </div>

        <div>
          <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
            Phone Number (Optional)
          </label>
          <input
            id="phoneNumber"
            name="phoneNumber"
            type="tel"
            value={formData.phoneNumber}
            onChange={handleChange}
            placeholder="e.g. (123) 456-7890"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="mt-1 text-sm text-gray-500">
            May be used by SwampTutor to contact you in case of emergencies. This will never be shared with students.
          </p>
        </div>
      </form>

      <StepNavigation 
        prevStep="/tutor/signup/subjects" 
        nextStep="/tutor/signup/education"
        validateStep={validateStep}
      />
    </div>
  );
} 