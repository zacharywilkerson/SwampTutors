'use client';

import React, { useState } from 'react';
import { PaymentElement, useStripe as useStripeElements, useElements } from '@stripe/react-stripe-js';
import StripeElementsWrapper from './StripeElementsWrapper';

interface CheckoutFormProps {
  amount: number;
  onSuccess?: (paymentId: string) => void;
  onError?: (error: Error) => void;
}

function PaymentForm({ onSuccess, onError }: Omit<CheckoutFormProps, 'amount'>) {
  const stripe = useStripeElements();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      // Stripe.js hasn't loaded yet
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment-confirmation`,
        },
        redirect: 'if_required',
      });

      if (error) {
        throw new Error(error.message || 'An error occurred with your payment');
      }

      if (paymentIntent && paymentIntent.id && paymentIntent.status === 'succeeded') {
        onSuccess?.(paymentIntent.id);
      } else {
        // Handle other statuses or redirect the customer to check the status
        console.log('Payment status:', paymentIntent?.status);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred with your payment');
      onError?.(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md">
      <PaymentElement className="mb-6" />
      
      {errorMessage && (
        <div className="bg-red-100 text-red-700 p-3 rounded mb-4">
          {errorMessage}
        </div>
      )}
      
      <button
        type="submit"
        disabled={!stripe || isLoading}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:bg-blue-300"
      >
        {isLoading ? 'Processing...' : 'Pay Now'}
      </button>
    </form>
  );
}

export default function CheckoutForm({ amount, onSuccess, onError }: CheckoutFormProps) {
  // Format amount for Stripe (e.g., $50.00 -> 5000 cents)
  const stripeAmount = Math.round(amount * 100);
  
  return (
    <StripeElementsWrapper
      options={{
        mode: 'payment',
        amount: stripeAmount,
        currency: 'usd',
      }}
    >
      <PaymentForm onSuccess={onSuccess} onError={onError} />
    </StripeElementsWrapper>
  );
} 