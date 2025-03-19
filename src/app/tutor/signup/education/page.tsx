"use client";

import { useState } from 'react';
import { useTutorSignup } from '../TutorSignupContext';
import StepNavigation from '../components/StepNavigation';

export default function EducationStep() {
  const { formData, updateFormData, updateEducationField, isLoading } = useTutorSignup();
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name.startsWith('undergraduate.')) {
      // Handle undergraduate fields
      const [section, field] = name.split('.');
      updateEducationField(section, field, value);
      // Clear any error
      if (errors[name] || errors.education) {
        setErrors(prev => ({ 
          ...prev, 
          [name]: '',
          education: ''
        }));
      }
    } else if (name.startsWith('graduate[')) {
      // Handle graduate fields
      const matches = name.match(/graduate\[(\d+)\]\.(.+)/);
      if (matches && matches.length === 3) {
        const index = parseInt(matches[1]);
        const field = matches[2];
        updateEducationField('graduate', field, value, index);
      }
    } else if (name === 'teachingCertificate') {
      // Handle teaching certificate checkbox
      updateEducationField('teachingCertificate', '', (e.target as HTMLInputElement).checked.toString());
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
    
    // Validate undergraduate education
    if (!formData.education.undergraduate.college) {
      newErrors['undergraduate.college'] = 'College/University is required';
    }
    
    if (!formData.education.undergraduate.major) {
      newErrors['undergraduate.major'] = 'Major is required';
    }

    if (!formData.education.undergraduate.startYear) {
      newErrors['undergraduate.startYear'] = 'Start year is required';
    } else if (
      isNaN(Number(formData.education.undergraduate.startYear)) || 
      Number(formData.education.undergraduate.startYear) < 1900 || 
      Number(formData.education.undergraduate.startYear) > new Date().getFullYear()
    ) {
      newErrors['undergraduate.startYear'] = 'Please enter a valid start year';
    }

    if (formData.education.undergraduate.endYear) {
      if (
        isNaN(Number(formData.education.undergraduate.endYear)) || 
        Number(formData.education.undergraduate.endYear) < 1900 || 
        Number(formData.education.undergraduate.endYear) > new Date().getFullYear() + 10
      ) {
        newErrors['undergraduate.endYear'] = 'Please enter a valid end year';
      } else if (
        Number(formData.education.undergraduate.startYear) > 
        Number(formData.education.undergraduate.endYear)
      ) {
        newErrors['undergraduate.endYear'] = 'End year must be after start year';
      }
    }
    
    // Validate transcript URL - required field
    if (!formData.transcriptUrl) {
      newErrors.transcriptUrl = 'Link to unofficial transcript is required';
    } else if (!isValidUrl(formData.transcriptUrl)) {
      newErrors.transcriptUrl = 'Please enter a valid URL';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Simple URL validation
  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
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
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Your Education</h2>
      <p className="text-gray-600 mb-6">
        Tell students about your educational background and qualifications.
      </p>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Undergraduate Education <span className="text-red-500">*</span>
          </label>
          
          <div className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="undergraduate.college" className="block text-sm font-medium text-gray-700 mb-1">
                  College/University <span className="text-red-500">*</span>
                </label>
                <input
                  id="undergraduate.college"
                  name="undergraduate.college"
                  type="text"
                  required
                  value={formData.education.undergraduate.college}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border ${errors['undergraduate.college'] ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                />
                {errors['undergraduate.college'] && (
                  <p className="mt-1 text-sm text-red-600">{errors['undergraduate.college']}</p>
                )}
              </div>
              <div>
                <label htmlFor="undergraduate.major" className="block text-sm font-medium text-gray-700 mb-1">
                  Major <span className="text-red-500">*</span>
                </label>
                <input
                  id="undergraduate.major"
                  name="undergraduate.major"
                  type="text"
                  required
                  value={formData.education.undergraduate.major}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border ${errors['undergraduate.major'] ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                />
                {errors['undergraduate.major'] && (
                  <p className="mt-1 text-sm text-red-600">{errors['undergraduate.major']}</p>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label htmlFor="undergraduate.startYear" className="block text-sm font-medium text-gray-700 mb-1">
                  Start Year <span className="text-red-500">*</span>
                </label>
                <input
                  id="undergraduate.startYear"
                  name="undergraduate.startYear"
                  type="number"
                  placeholder="e.g. 2020"
                  required
                  min="1900"
                  max={new Date().getFullYear()}
                  value={formData.education.undergraduate.startYear}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border ${errors['undergraduate.startYear'] ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                />
                {errors['undergraduate.startYear'] && (
                  <p className="mt-1 text-sm text-red-600">{errors['undergraduate.startYear']}</p>
                )}
              </div>
              <div>
                <label htmlFor="undergraduate.endYear" className="block text-sm font-medium text-gray-700 mb-1">
                  End Year <span className="text-sm font-normal text-gray-500">(leave blank if still attending)</span>
                </label>
                <input
                  id="undergraduate.endYear"
                  name="undergraduate.endYear"
                  type="number"
                  placeholder="e.g. 2024"
                  min="1900"
                  max={new Date().getFullYear() + 10}
                  value={formData.education.undergraduate.endYear}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        </div>
          
        <div className="pt-4 border-t border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Graduate Education (Optional)
          </label>
            
          {/* First graduate degree */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            <div>
              <label htmlFor="graduate[0].college" className="block text-sm font-medium text-gray-700 mb-1">
                College/University
              </label>
              <input
                id="graduate[0].college"
                name="graduate[0].college" 
                type="text"
                value={formData.education.graduate[0].college}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label htmlFor="graduate[0].degreeType" className="block text-sm font-medium text-gray-700 mb-1">
                Degree Type
              </label>
              <select
                id="graduate[0].degreeType"
                name="graduate[0].degreeType"
                value={formData.education.graduate[0].degreeType}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select a degree type</option>
                <option value="Masters">Masters (MA, MS, MEd, etc.)</option>
                <option value="PhD">PhD</option>
                <option value="Professional">Professional Degree (JD, MD, etc.)</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
            
          <div className="mt-4">
            <p className="text-sm text-gray-600 mb-3">Additional Graduate Degree (Optional)</p>
            {/* Second graduate degree */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="graduate[1].college" className="block text-sm font-medium text-gray-700 mb-1">
                  College/University
                </label>
                <input
                  id="graduate[1].college"
                  name="graduate[1].college"
                  type="text"
                  value={formData.education.graduate[1].college}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label htmlFor="graduate[1].degreeType" className="block text-sm font-medium text-gray-700 mb-1">
                  Degree Type
                </label>
                <select
                  id="graduate[1].degreeType"
                  name="graduate[1].degreeType"
                  value={formData.education.graduate[1].degreeType}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a degree type</option>
                  <option value="Masters">Masters (MA, MS, MEd, etc.)</option>
                  <option value="PhD">PhD</option>
                  <option value="Professional">Professional Degree (JD, MD, etc.)</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
          </div>
        </div>
          
        <div className="mt-2 mb-5">
          <div className="flex items-center">
            <input
              id="teachingCertificate"
              name="teachingCertificate"
              type="checkbox"
              checked={formData.education.teachingCertificate}
              onChange={handleChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="teachingCertificate" className="ml-2 block text-sm text-gray-900">
              I have a teaching certificate
            </label>
          </div>
        </div>

        {/* Transcript URL Field */}
        <div className="pt-4 border-t border-gray-200">
          <label htmlFor="transcriptUrl" className="block text-sm font-medium text-gray-700 mb-1">
            Link to Unofficial Transcript <span className="text-red-500">*</span>
          </label>
          <input
            id="transcriptUrl"
            name="transcriptUrl"
            type="url"
            value={formData.transcriptUrl}
            onChange={handleChange}
            placeholder="e.g. https://drive.google.com/file/your-transcript"
            className={`w-full px-3 py-2 border ${errors.transcriptUrl ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
            required
          />
          <p className="mt-1 text-sm text-gray-500">
            Provide a link to your unofficial transcript (e.g., Google Drive, Dropbox)
          </p>
          {errors.transcriptUrl && (
            <p className="mt-1 text-sm text-red-600">{errors.transcriptUrl}</p>
          )}
        </div>
      </div>

      <StepNavigation 
        prevStep="/tutor/signup/basic-info" 
        nextStep="/tutor/signup/profile"
        validateStep={validateStep}
      />
    </div>
  );
} 