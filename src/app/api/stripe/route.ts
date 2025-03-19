import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

// Initialize Stripe with the secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16', // Use the latest version
});

// Create a payment intent for lesson booking
export async function POST(req: NextRequest) {
  try {
    // Get the request body
    const body = await req.json();
    const { amount, metadata } = body;
    
    if (!amount || amount < 100) {
      return NextResponse.json(
        { error: 'Amount must be at least $1.00 (100 cents)' },
        { status: 400 }
      );
    }
    
    // Create a payment intent with manual confirmation
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      // Use manual confirmation method to delay charging until lesson is completed
      confirm: false,
      setup_future_usage: 'off_session',
      capture_method: 'manual',
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: metadata || {},
    });
    
    return NextResponse.json({ 
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });
  } catch (error: any) {
    console.error('Stripe API error:', error);
    return NextResponse.json(
      { error: error.message || 'Error creating payment intent' },
      { status: 500 }
    );
  }
}

// Endpoint to create a checkout session
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      amount, 
      lesson_id, 
      tutor_id, 
      student_id,
      course_code,
      lesson_date,
      success_url,
      cancel_url
    } = body;
    
    if (!amount || !lesson_id || !tutor_id || !student_id || !course_code || !lesson_date) {
      console.error('Missing required parameters for Stripe checkout:', body);
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }
    
    console.log(`Creating Stripe checkout session for lesson ${lesson_id}, amount: ${amount}`);
    
    // Format date for display
    const formattedDate = new Date(lesson_date).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    
    // Create a checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Tutoring Session - ${course_code}`,
              description: `Tutoring session on ${formattedDate}`,
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      // Redirect back to the tutor's profile page with booking success parameter
      success_url: success_url || `${req.nextUrl.origin}/tutor/${tutor_id}?booking=success&lesson_id=${lesson_id}`,
      cancel_url: cancel_url || `${req.nextUrl.origin}/tutor/${tutor_id}?booking=cancelled&reason=timeout`,
      // Set to 30 minutes per Stripe's minimum requirement, but our server will clean up after 2 minutes
      expires_at: Math.floor(Date.now() / 1000) + 1800, // 30 minutes (minimum allowed by Stripe)
      payment_intent_data: {
        metadata: {
          lesson_id,
          tutor_id,
          student_id,
          course_code
        }
      },
      metadata: {
        lesson_id,
        tutor_id,
        student_id,
        course_code,
        lesson_date,
        created_at: new Date().toISOString()
      },
    });
    
    console.log(`Checkout session created: ${session.id}, redirecting to ${session.url}`);
    
    return NextResponse.json({ 
      url: session.url 
    });
  } catch (error: any) {
    console.error('Stripe Checkout API error:', error);
    return NextResponse.json(
      { error: error.message || 'Error creating checkout session' },
      { status: 500 }
    );
  }
} 