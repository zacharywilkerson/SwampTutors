import { httpsCallable, Functions, getFunctions } from 'firebase/functions';
import { app } from './config';

// Get a reference to the functions service
let functionsInstance: Functions | null = null;

/**
 * Get the Firebase Functions instance
 */
export const getFunctionsInstance = (): Functions => {
  if (!functionsInstance) {
    functionsInstance = getFunctions(app);
  }
  return functionsInstance;
};

/**
 * Create a payment intent using Firebase Functions
 * @param amount - Amount in cents
 * @param metadata - Optional metadata for the payment intent
 * @returns Promise with clientSecret
 */
export const createPaymentIntent = async (amount: number, metadata: Record<string, any> = {}) => {
  const functions = getFunctionsInstance();
  const createPaymentIntentFn = httpsCallable(functions, 'createPaymentIntent');
  
  try {
    const result = await createPaymentIntentFn({ amount, metadata });
    return result.data as { clientSecret: string };
  } catch (error) {
    console.error('Error creating payment intent:', error);
    throw error;
  }
};

/**
 * Create a Stripe Connect account for a tutor
 * @param tutorId - ID of the tutor
 * @param email - Email of the tutor
 * @param name - Display name of the tutor
 * @returns Promise with accountId and onboarding URL
 */
export const createStripeConnectAccount = async (
  tutorId: string, 
  email: string, 
  name: string
) => {
  const functions = getFunctionsInstance();
  const createStripeConnectAccountFn = httpsCallable(functions, 'createStripeConnectAccount');
  
  try {
    const result = await createStripeConnectAccountFn({ tutor_id: tutorId, email, name });
    return result.data as { account_id: string, onboarding_url: string };
  } catch (error) {
    console.error('Error creating Stripe Connect account:', error);
    throw error;
  }
};