"use client";

import { useState } from 'react';
import { useTutorSignup } from '../TutorSignupContext';
import StepNavigation from '../components/StepNavigation';

export default function TermsStep() {
  const { formData, updateFormData, isLoading } = useTutorSignup();
  const [showError, setShowError] = useState(false);

  const handleAgreementChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateFormData('termsAgreed', e.target.checked);
    if (e.target.checked) {
      setShowError(false);
    }
  };

  const validateStep = (): boolean => {
    if (!formData.termsAgreed) {
      setShowError(true);
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
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Terms of Tutoring</h2>
      <p className="text-gray-600 mb-6">
        Please review and agree to our platform rules and tutoring policies.
      </p>

      {showError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm mb-6">
          You must agree to the terms and conditions to continue.
        </div>
      )}

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Tutor Agreement</h3>
        
        <div className="prose prose-sm max-w-none text-gray-700 mb-6 h-80 overflow-y-auto border border-gray-200 bg-white rounded p-4">
          <h4>1. Introduction</h4>
          <p>
            This Tutor Agreement ("Agreement") is entered into between you ("Tutor") and SwampTutors ("Platform"). 
            By checking the "I Agree" box, you acknowledge that you have read, understood, and agree to be bound by the terms of this Agreement.
          </p>

          <h4>2. Tutor Services</h4>
          <p>
            2.1. As a Tutor, you agree to provide tutoring services in the subjects you have indicated in your profile.
          </p>
          <p>
            2.2. You agree to provide accurate information about your qualifications, expertise, and experience.
          </p>
          <p>
            2.3. You agree to conduct all tutoring sessions in a professional, respectful, and ethical manner.
          </p>

          <h4>3. Academic Integrity</h4>
          <p>
            3.1. You agree not to complete assignments for students or provide answers to exams or quizzes.
          </p>
          <p>
            3.2. You will focus on helping students understand concepts and develop their own answers.
          </p>
          <p>
            3.3. You will uphold the academic integrity policies of the University of Florida.
          </p>

          <h4>4. Scheduling and Availability</h4>
          <p>
            4.1. You agree to maintain an up-to-date availability calendar on the Platform.
          </p>
          <p>
            4.2. You agree to honor all confirmed appointments unless rescheduled or canceled according to the Platform's policies.
          </p>
          <p>
            4.3. You will give reasonable notice for any necessary cancellations or rescheduling.
          </p>

          <h4>5. Fees and Payment</h4>
          <p>
            5.1. You agree that the Platform will collect payment from students for your services.
          </p>
          <p>
            5.2. You acknowledge that the Platform will retain a 20% service fee from each tutoring session payment.
          </p>
          <p>
            5.3. You agree to establish your hourly rate within the Platform's guidelines ($1-$120).
          </p>
          <p>
            5.4. Payments will be processed and transferred to your account according to the Platform's payment schedule.
          </p>

          <h4>6. Communication</h4>
          <p>
            6.1. You agree to communicate with students primarily through the Platform's messaging system.
          </p>
          <p>
            6.2. You agree not to share personal contact information with students for the purpose of bypassing the Platform.
          </p>

          <h4>7. Confidentiality</h4>
          <p>
            7.1. You agree to maintain the confidentiality of all student information.
          </p>
          <p>
            7.2. You will not share, disclose, or discuss student information with any third parties.
          </p>

          <h4>8. Non-Circumvention</h4>
          <p>
            8.1. You agree not to circumvent the Platform by arranging direct payment or services with students you meet through the Platform.
          </p>
          <p>
            8.2. You acknowledge that violation of this provision may result in termination of your account and potential legal action.
          </p>

          <h4>9. Term and Termination</h4>
          <p>
            9.1. This Agreement is effective upon your acceptance and continues until terminated.
          </p>
          <p>
            9.2. Either party may terminate this Agreement with written notice.
          </p>
          <p>
            9.3. The Platform reserves the right to suspend or terminate your account for violations of this Agreement or Platform policies.
          </p>

          <h4>10. Changes to Agreement</h4>
          <p>
            10.1. The Platform may modify this Agreement at any time with reasonable notice.
          </p>
          <p>
            10.2. Continued use of the Platform after such modifications constitutes acceptance of the updated Agreement.
          </p>

          <h4>11. Governing Law</h4>
          <p>
            This Agreement shall be governed by the laws of the State of Florida.
          </p>
        </div>

        <div className="flex items-start space-x-3">
          <input
            id="termsAgreed"
            name="termsAgreed"
            type="checkbox"
            checked={formData.termsAgreed}
            onChange={handleAgreementChange}
            className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="termsAgreed" className="text-gray-700">
            I have read, understood, and agree to the <span className="font-medium">Tutor Agreement</span>, <span className="font-medium">Terms of Service</span>, and <span className="font-medium">Privacy Policy</span>. I understand that violation of these terms may result in termination of my tutor account.
          </label>
        </div>
      </div>

      <StepNavigation 
        prevStep="/tutor/signup/profile" 
        nextStep="/tutor/signup/verification"
        validateStep={validateStep}
      />
    </div>
  );
} 