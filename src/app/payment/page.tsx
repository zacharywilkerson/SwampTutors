'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { loadStripe, Stripe, StripeElements, StripePaymentElement } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import PaymentForm from '@/components/PaymentForm';
import Link from 'next/link';

export default function PaymentPage() {
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [clientSecret, setClientSecret] = useState('');
  const [paymentIntentId, setPaymentIntentId] = useState('');
  const [bookingKey, setBookingKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  const searchParams = useSearchParams();
  const { user } = useAuth();

  useEffect(() => {
    // Load stripe outside of a component's render to avoid recreating the Stripe object
    const loadStripeLib = async () => {
      const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
      if (!publishableKey) {
        setError('Stripe configuration is missing');
        setLoading(false);
        return;
      }
      setStripePromise(loadStripe(publishableKey));
    };
    
    loadStripeLib();
  }, []);

  useEffect(() => {
    // Get parameters from URL
    if (searchParams) {
      const secret = searchParams.get('client_secret');
      const paymentIntent = searchParams.get('payment_intent');
      const booking = searchParams.get('booking_key');
      
      if (secret && paymentIntent && booking) {
        setClientSecret(secret);
        setPaymentIntentId(paymentIntent);
        setBookingKey(booking);
        setLoading(false);
      } else {
        setError('Missing payment information in URL');
        setLoading(false);
      }
    }
  }, [searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !clientSecret) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-6 rounded-lg shadow-md max-w-md w-full">
          <h1 className="text-2xl font-bold mb-4 text-center">Payment Error</h1>
          <div className="bg-red-50 text-red-700 p-4 rounded-md mb-4">
            {error || 'There was a problem with your payment. Please try again.'}
          </div>
          <Link href="/" className="block w-full bg-blue-600 text-white text-center py-2 px-4 rounded hover:bg-blue-700">
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-6 rounded-lg shadow-md max-w-md w-full">
          <h1 className="text-2xl font-bold mb-4 text-center">Login Required</h1>
          <p className="mb-4">You need to be logged in to process this payment.</p>
          <Link href="/login" className="block w-full bg-blue-600 text-white text-center py-2 px-4 rounded hover:bg-blue-700">
            Log In
          </Link>
        </div>
      </div>
    );
  }

  const appearance = {
    theme: 'stripe',
    variables: {
      colorPrimary: '#3b82f6',
    },
  };

  const options = {
    clientSecret,
    appearance,
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-6 rounded-lg shadow-md max-w-md w-full">
        <h1 className="text-2xl font-bold mb-4 text-center">Complete Your Payment</h1>
        
        <p className="text-gray-600 mb-6 text-center">
          Please enter your payment details to book your tutoring session.
          Your card will only be charged after the lesson is completed.
        </p>
        
        {stripePromise && clientSecret && (
          <Elements stripe={stripePromise} options={options}>
            <PaymentForm bookingKey={bookingKey} />
          </Elements>
        )}
      </div>
    </div>
  );
} 