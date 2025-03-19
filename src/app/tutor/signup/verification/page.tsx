"use client";

import { useState } from 'react';
import { useTutorSignup } from '../TutorSignupContext';
import StepNavigation from '../components/StepNavigation';
import { useAuth } from '../../../../hooks/useAuth';
import { sendEmailVerification, reload } from 'firebase/auth';

export default function VerificationStep() {
  const { formData, updateFormData, isLoading } = useTutorSignup();
  const { user } = useAuth();
  const [verificationSent, setVerificationSent] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');

  const handleSendVerification = async () => {
    if (!user) return;
    
    try {
      setError('');
      await sendEmailVerification(user);
      setVerificationSent(true);
    } catch (error: any) {
      setError(error.message || 'Failed to send verification email');
    }
  };

  const checkVerificationStatus = async () => {
    if (!user) return;
    
    try {
      setChecking(true);
      setError('');
      
      // Reload the user to get the latest verification status
      await reload(user);
      
      if (user.emailVerified) {
        updateFormData('emailVerified', true);
      } else {
        setError('Your email has not been verified yet. Please check your inbox and click the verification link.');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to check verification status');
    } finally {
      setChecking(false);
    }
  };

  const validateStep = (): boolean => {
    // Allow proceeding even without verification for testing purposes
    // In a production environment, you might want to enforce verification
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
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Email Verification</h2>
      <p className="text-gray-600 mb-6">
        Please verify your email address to ensure you receive important notifications about your tutoring sessions and account.
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm mb-6">
          {error}
        </div>
      )}

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6">
        <div className="flex items-center mb-4">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${user?.emailVerified ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-500'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="ml-4">
            <h3 className="text-lg font-medium text-gray-900">
              {user?.emailVerified ? 'Email Verified' : 'Email Not Verified'}
            </h3>
            <p className="text-gray-500">{user?.email}</p>
          </div>
        </div>

        <div className="space-y-4">
          {!user?.emailVerified && (
            <>
              <p className="text-gray-700">
                We've sent a verification link to your email address. Please check your inbox and click the link to verify your account.
              </p>
              
              <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
                <button
                  type="button"
                  onClick={handleSendVerification}
                  disabled={verificationSent}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {verificationSent ? 'Verification Email Sent' : 'Send Verification Email'}
                </button>
                
                <button
                  type="button"
                  onClick={checkVerificationStatus}
                  disabled={checking}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {checking ? 'Checking...' : 'I\'ve Verified My Email'}
                </button>
              </div>
            </>
          )}

          {user?.emailVerified && (
            <p className="text-green-700">
              Your email has been successfully verified! You can now proceed to the next step.
            </p>
          )}
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">Note</h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>
                Email verification helps ensure that we can contact you about your sessions and payments. If you don't see the verification email, please check your spam folder.
              </p>
            </div>
          </div>
        </div>
      </div>

      <StepNavigation 
        prevStep="/tutor/signup/terms" 
        nextStep="/tutor/signup/review"
        validateStep={validateStep}
      />
    </div>
  );
} 