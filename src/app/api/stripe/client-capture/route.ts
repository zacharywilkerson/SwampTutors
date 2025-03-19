import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

// Initialize Stripe with the secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16', // Use the latest version
});

// Endpoint to capture a payment intent after lesson completion
export async function POST(req: NextRequest) {
  try {
    // Get request body with payment details
    const body = await req.json();
    const { paymentIntentId, amount } = body;
    
    if (!paymentIntentId) {
      return NextResponse.json(
        { error: 'Missing payment intent ID' },
        { status: 400 }
      );
    }
    
    // Capture the payment
    const paymentIntent = await stripe.paymentIntents.capture(
      paymentIntentId
    );
    
    return NextResponse.json({ 
      success: true,
      paymentIntent: {
        id: paymentIntent.id,
        status: paymentIntent.status
      }
    });
  } catch (error: any) {
    console.error('Stripe payment capture error:', error);
    
    // Handle specific Stripe errors
    if (error.type === 'StripeInvalidRequestError') {
      if (error.code === 'payment_intent_unexpected_state') {
        return NextResponse.json(
          { error: 'Payment already captured or canceled' },
          { status: 400 }
        );
      }
    }
    
    return NextResponse.json(
      { error: error.message || 'Error capturing payment' },
      { status: 500 }
    );
  }
} 