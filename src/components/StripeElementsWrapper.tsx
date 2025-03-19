'use client';

import React, { ReactNode, useEffect, useState } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { StripeElementsOptions } from '@stripe/stripe-js';
import { useStripe } from '../context/StripeContext';
import { createPaymentIntent } from '../firebase/stripe';

interface StripeElementsWrapperProps {
  children: ReactNode;
  options: StripeElementsOptions & {
    amount?: number;
    metadata?: Record<string, any>;
  };
}

/**
 * A wrapper component for Stripe Elements that should be used in specific checkout flows
 * rather than at the application level.
 * 
 * Example usage:
 * ```tsx
 * <StripeElementsWrapper options={{
 *   mode: 'payment',
 *   amount: 1000, // $10.00
 *   currency: 'usd',
 *   metadata: { lesson_id: 'abc123' }
 * }}>
 *   <PaymentForm />
 * </StripeElementsWrapper>
 * ```
 */
export default function StripeElementsWrapper({ children, options }: StripeElementsWrapperProps) {
  const { stripe } = useStripe();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // If amount is provided, create a payment intent
  useEffect(() => {
    const fetchClientSecret = async () => {
      if (!options.amount) return;
      
      try {
        setIsLoading(true);
        setError(null);
        
        // Create a payment intent using Firebase Functions
        const { clientSecret: secret } = await createPaymentIntent(
          options.amount,
          options.metadata || {}
        );
        
        setClientSecret(secret);
      } catch (err: any) {
        console.error('Error creating payment intent:', err);
        setError(err.message || 'Failed to initialize payment');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchClientSecret();
  }, [options.amount, options.metadata]);
  
  const defaultOptions: Partial<StripeElementsOptions> = {
    appearance: {
      theme: 'stripe',
    },
  };
  
  // Merge provided options with defaults
  const elementsOptions: StripeElementsOptions = {
    ...defaultOptions,
    ...options,
    // Add clientSecret if available
    ...(clientSecret ? { clientSecret } : {}),
  };
  
  if (isLoading) {
    return <div className="p-4 text-center">Initializing payment...</div>;
  }
  
  if (error) {
    return (
      <div className="p-4 text-center bg-red-100 text-red-700 rounded">
        {error}
      </div>
    );
  }
  
  // Don't render children if we're expecting a client secret but don't have one yet
  if (options.amount && !clientSecret) {
    return null;
  }
  
  return (
    <Elements stripe={stripe} options={elementsOptions}>
      {children}
    </Elements>
  );
} 