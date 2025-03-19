import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminAuth as auth, adminDb as db } from '@/firebase/admin';

// Initialize Stripe with the secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16', // Use the latest version
});

// Endpoint to capture a payment intent after lesson completion
export async function POST(req: NextRequest) {
  try {
    // Get the authorization token from the request header
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify the Firebase token
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // Get request body with lesson and payment details
    const body = await req.json();
    const { lessonId, paymentIntentId } = body;
    
    if (!lessonId || !paymentIntentId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }
    
    // Get the lesson from Firestore
    const lessonRef = db.collection('lessons').doc(lessonId);
    const lessonDoc = await lessonRef.get();
    
    if (!lessonDoc.exists) {
      return NextResponse.json(
        { error: 'Lesson not found' },
        { status: 404 }
      );
    }
    
    const lessonData = lessonDoc.data();
    
    // Verify that the user is the tutor for this lesson
    if (lessonData?.tutorId !== userId) {
      return NextResponse.json(
        { error: 'Only the tutor for this lesson can capture the payment' },
        { status: 403 }
      );
    }
    
    // Check that the lesson is in completed status
    if (lessonData?.status !== 'completed') {
      return NextResponse.json(
        { error: 'Cannot capture payment - lesson is not marked as completed' },
        { status: 400 }
      );
    }
    
    // Check that the payment intent matches the one saved with the lesson
    if (lessonData?.paymentIntentId !== paymentIntentId) {
      return NextResponse.json(
        { error: 'Payment intent ID does not match the one associated with this lesson' },
        { status: 400 }
      );
    }
    
    // Capture the payment
    const paymentIntent = await stripe.paymentIntents.capture(
      paymentIntentId,
      {
        amount_to_capture: lessonData.price || undefined
      }
    );
    
    // Update the lesson with payment completion info
    await lessonRef.update({
      paymentStatus: 'charged',
      paymentCapturedAt: new Date().toISOString(),
      paymentCapturedBy: userId
    });
    
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