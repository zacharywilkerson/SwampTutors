'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { Stripe } from '@stripe/stripe-js';
import { getStripe } from '../lib/stripe';

interface StripeContextProps {
  stripe: Promise<Stripe | null>;
}

const StripeContext = createContext<StripeContextProps>({
  stripe: Promise.resolve(null),
});

export const useStripe = () => useContext(StripeContext);

interface StripeProviderProps {
  children: ReactNode;
}

export function StripeProvider({ children }: StripeProviderProps) {
  const stripePromise = getStripe();
  
  return (
    <StripeContext.Provider value={{ stripe: stripePromise }}>
      {children}
    </StripeContext.Provider>
  );
} 