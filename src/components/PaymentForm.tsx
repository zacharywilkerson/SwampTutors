'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';

interface PaymentFormProps {
  bookingKey: string;
}

export default function PaymentForm({ bookingKey }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!stripe || !elements) {
      // Stripe.js hasn't loaded yet
      return;
    }

    setIsLoading(true);
    setMessage(null);
    setIsError(false);

    // Confirm the payment with Stripe
    const { error } = await stripe.confirmPayment({
      // `elements` instance to collect card details
      elements, 
      confirmParams: {
        // Redirect to the confirmation page
        return_url: `${window.location.origin}/payment-confirmation?booking_key=${encodeURIComponent(bookingKey)}`,
      },
    });

    // Only gets here if confirmPayment fails immediately - such as for invalid card details
    if (error) {
      setIsError(true);
      setMessage(error.message || 'An error occurred with your payment. Please try again.');
    }

    setIsLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Show any errors or messages */}
      {message && (
        <div className={`p-4 rounded-md ${isError ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {message}
        </div>
      )}

      {/* Stripe Payment Element will render the payment form */}
      <PaymentElement />

      <button
        disabled={isLoading || !stripe || !elements}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed flex justify-center"
      >
        {isLoading ? (
          <>
            <span className="mr-2">Processing</span>
            <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
          </>
        ) : (
          'Submit Payment Information'
        )}
      </button>
      
      <p className="text-sm text-gray-500 mt-4">
        Your card will only be charged after the lesson is completed. You can cancel your booking before the lesson starts at no cost.
      </p>
    </form>
  );
} 