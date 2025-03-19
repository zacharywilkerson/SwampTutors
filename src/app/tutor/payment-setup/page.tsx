'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../hooks/useAuth';
import { getTutorById, updateTutorStripeAccount } from '../../../firebase/firestore';
import { createStripeConnectAccount } from '../../../firebase/stripe';

export default function TutorPaymentSetup() {
  const router = useRouter();
  const { user, userRole, loading: authLoading } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [tutorData, setTutorData] = useState<any>(null);
  const [hasStripeAccount, setHasStripeAccount] = useState(false);
  const [onboardingUrl, setOnboardingUrl] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Check if user is authorized and fetch tutor data
  useEffect(() => {
    if (authLoading) return;
    
    if (!user || userRole !== 'tutor') {
      router.push('/login');
      return;
    }
    
    const fetchTutorData = async () => {
      try {
        setLoading(true);
        const tutorInfo = await getTutorById(user.uid);
        setTutorData(tutorInfo);
        
        // Check if tutor already has a Stripe account set up
        setHasStripeAccount(!!tutorInfo?.stripeAccountId);
      } catch (error) {
        console.error('Error fetching tutor data:', error);
        setError('Failed to load your tutor profile. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchTutorData();
    
    // Check URL for onboarding status
    const urlParams = new URLSearchParams(window.location.search);
    const onboardingStatus = urlParams.get('onboarding');
    
    if (onboardingStatus === 'complete') {
      setSuccess('Your payment account setup was successful! You can now receive payments for your lessons.');
    } else if (onboardingStatus === 'refresh') {
      setError('Your payment account setup was not completed. Please try again.');
    }
  }, [user, userRole, authLoading, router]);
  
  // Handler to create a new Stripe Connect account
  const handleCreateAccount = async () => {
    if (!user || !tutorData) return;
    
    try {
      setError('');
      setSuccess('');
      setLoading(true);
      
      // Use Firebase Functions to create a Stripe Connect account
      const { account_id, onboarding_url } = await createStripeConnectAccount(
        user.uid,
        tutorData.email,
        tutorData.displayName || 'Tutor'
      );
      
      // Store the Stripe account ID in Firestore
      if (account_id) {
        await updateTutorStripeAccount(user.uid, account_id);
        setHasStripeAccount(true);
      }
      
      // Set the onboarding URL
      if (onboarding_url) {
        setOnboardingUrl(onboarding_url);
      }
    } catch (error) {
      console.error('Error creating Stripe account:', error);
      setError('Failed to set up your payment account. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handler to complete onboarding
  const completeOnboarding = () => {
    if (onboardingUrl) {
      window.location.href = onboardingUrl;
    }
  };
  
  // Loading state
  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold mb-4">Payment Account Setup</h1>
          <div className="bg-white p-6 rounded-lg shadow">
            <p>Loading...</p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Payment Account Setup</h1>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            {success}
          </div>
        )}
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">
            {hasStripeAccount ? 'Your Payment Account' : 'Set Up Your Payment Account'}
          </h2>
          
          {hasStripeAccount ? (
            <div>
              <p className="mb-4 text-green-700">
                <svg className="w-6 h-6 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
                Your payment account is set up and ready to receive payments.
              </p>
              
              <p className="text-gray-600 mb-4">
                You will receive payments for completed lessons every first and third week of the month
                after an admin approves your payouts.
              </p>
              
              <button
                onClick={() => router.push('/tutor/dashboard')}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Return to Dashboard
              </button>
            </div>
          ) : onboardingUrl ? (
            <div>
              <p className="mb-4">
                Your account has been created. Please complete the onboarding process to start receiving payments.
              </p>
              
              <button
                onClick={completeOnboarding}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Complete Account Setup
              </button>
            </div>
          ) : (
            <div>
              <p className="mb-4">
                To receive payments for your tutoring sessions, you need to set up a payment account.
                This is a one-time process that securely connects your bank account for direct deposits.
              </p>
              
              <p className="text-gray-600 mb-4">
                Once set up, you will receive payments for completed lessons every first and third week
                of the month after an admin approves your payouts.
              </p>
              
              <button
                onClick={handleCreateAccount}
                disabled={loading}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-blue-300"
              >
                {loading ? 'Setting Up...' : 'Set Up Payment Account'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 