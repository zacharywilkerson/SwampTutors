"use client";

import { useState } from 'react';
import { useTutorSignup } from '../TutorSignupContext';
import StepNavigation from '../components/StepNavigation';

export default function ProfileStep() {
  const { formData, updateFormData, isLoading } = useTutorSignup();
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name === 'hourlyRate') {
      if (value === '') {
        // Allow empty input temporarily
        updateFormData(name, value);
      } else {
        // Only convert to number and validate if there's actually input
        const rate = Math.max(1, Math.min(120, Number(value) || 65));
        updateFormData(name, rate);
      }
      
      // Clear any error when user makes changes
      if (errors.hourlyRate) {
        setErrors(prev => ({ ...prev, hourlyRate: '' }));
      }
    } else {
      updateFormData(name, value);
      
      // Clear any error for this field
      if (errors[name]) {
        setErrors(prev => ({ ...prev, [name]: '' }));
      }
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    
    if (file) {
      // For now, we're just storing the image as a data URL
      // In a real application, you'd upload this to storage and save the URL
      const reader = new FileReader();
      reader.onloadend = () => {
        updateFormData('profilePictureUrl', reader.result as string);
        
        // Clear any error
        if (errors.profilePictureUrl) {
          setErrors(prev => ({ ...prev, profilePictureUrl: '' }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const validateStep = (): boolean => {
    const newErrors: { [key: string]: string } = {};
    
    // Validate bio
    if (!formData.bio || formData.bio.trim().length < 50) {
      newErrors.bio = 'Please provide a detailed bio (at least 50 characters)';
    }
    
    // Validate profile headline
    if (!formData.profileHeadline) {
      newErrors.profileHeadline = 'Profile headline is required';
    }
    
    // Validate hourly rate
    if (typeof formData.hourlyRate === 'string' && formData.hourlyRate !== '') {
      const rate = Number(formData.hourlyRate);
      if (isNaN(rate) || rate < 1 || rate > 120) {
        newErrors.hourlyRate = 'Hourly rate must be between $1 and $120';
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
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Your Personalized Profile</h2>
      <p className="text-gray-600 mb-6">
        Make your profile stand out with a professional photo and engaging bio.
      </p>

      <div className="space-y-6">
        {/* Profile Picture */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Profile Picture</label>
          <div className="flex items-center space-x-6">
            <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-100 border border-gray-200 flex items-center justify-center">
              {formData.profilePictureUrl ? (
                <img 
                  src={formData.profilePictureUrl} 
                  alt="Profile Preview" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-gray-400 text-5xl">
                  {formData.profileHeadline?.charAt(0) || "?"}
                </span>
              )}
            </div>
            <div>
              <label htmlFor="profilePicture" className="cursor-pointer px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 inline-block">
                Upload Photo
              </label>
              <input 
                id="profilePicture" 
                type="file" 
                accept="image/*" 
                onChange={handleImageUpload}
                className="sr-only"
              />
              <p className="text-xs text-gray-500 mt-1">
                JPG or PNG. Maximum size 5MB.
              </p>
            </div>
          </div>
        </div>

        {/* Profile Headline */}
        <div>
          <label htmlFor="profileHeadline" className="block text-sm font-medium text-gray-700 mb-1">
            Profile Headline <span className="text-red-500">*</span>
          </label>
          <input
            id="profileHeadline"
            name="profileHeadline"
            type="text"
            value={formData.profileHeadline}
            onChange={handleChange}
            placeholder="e.g., Computer Science Tutor | UF Senior | Data Structures Expert"
            className={`w-full px-3 py-2 border ${errors.profileHeadline ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
          />
          <p className="mt-1 text-sm text-gray-500">
            A concise summary of who you are as a tutor (shown in search results).
          </p>
          {errors.profileHeadline && (
            <p className="mt-1 text-sm text-red-600">{errors.profileHeadline}</p>
          )}
        </div>

        {/* Bio */}
        <div>
          <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
            About Me (Bio) <span className="text-red-500">*</span>
          </label>
          <textarea
            id="bio"
            name="bio"
            rows={5}
            value={formData.bio}
            onChange={handleChange}
            placeholder="Tell students about your academic background, tutoring experience, teaching style, and any other relevant information..."
            className={`w-full px-3 py-2 border ${errors.bio ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
          />
          <p className="mt-1 text-sm text-gray-500">
            Minimum 50 characters. Be specific about your qualifications and teaching approach.
          </p>
          {errors.bio && (
            <p className="mt-1 text-sm text-red-600">{errors.bio}</p>
          )}
        </div>

        {/* Hourly Rate */}
        <div>
          <label htmlFor="hourlyRate" className="block text-sm font-medium text-gray-700 mb-1">
            Hourly Rate (USD) <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center">
            <span className="px-3 py-2 bg-gray-100 border border-gray-300 border-r-0 rounded-l-md">$</span>
            <input
              id="hourlyRate"
              name="hourlyRate"
              type="number"
              min="1"
              max="120"
              value={formData.hourlyRate}
              onChange={handleChange}
              className={`w-full px-3 py-2 border ${errors.hourlyRate ? 'border-red-300' : 'border-gray-300'} rounded-r-md shadow-sm text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
            />
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Set your hourly tutoring rate between $1 and $120. The platform fee is 20%.
          </p>
          {errors.hourlyRate && (
            <p className="mt-1 text-sm text-red-600">{errors.hourlyRate}</p>
          )}
        </div>
      </div>

      <StepNavigation 
        prevStep="/tutor/signup/education" 
        nextStep="/tutor/signup/terms"
        validateStep={validateStep}
      />
    </div>
  );
} 