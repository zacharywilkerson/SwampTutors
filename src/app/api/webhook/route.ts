import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { doc, updateDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { confirmLessonPayment } from '../../../firebase/firestore';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
  try {
    if (!webhookSecret) {
      console.error('Stripe webhook secret is not set');
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }
    
    // Get the signature from the header
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      return NextResponse.json({ error: 'No signature provided' }, { status: 400 });
    }
    
    // Get the raw body
    const body = await req.text();
    
    // Verify the event
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      console.error(`Webhook signature verification failed: ${err.message}`);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }
    
    console.log(`Processing Stripe webhook event: ${event.type}`);
    
    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        // Extract lesson data from metadata
        const { lesson_id } = session.metadata || {};
        
        if (lesson_id) {
          console.log(`Checkout completed for lesson: ${lesson_id}`);
          
          try {
            // First check if the lesson exists and hasn't been updated yet
            const lessonDoc = await getDoc(doc(db, 'lessons', lesson_id));
            
            if (lessonDoc.exists()) {
              const lessonData = lessonDoc.data();
              
              // Only update if the lesson is still in pending_payment status
              if (lessonData.status === 'pending_payment') {
                console.log(`Confirming payment for lesson ${lesson_id} - was in pending_payment status`);
                // Use the confirmLessonPayment function to update lesson status to 'scheduled'
                await confirmLessonPayment(lesson_id, session.id, session.amount_total || 0);
                console.log(`Lesson ${lesson_id} status updated to 'scheduled'`);
              } else {
                console.log(`Lesson ${lesson_id} already processed, current status: ${lessonData.status}`);
              }
            } else {
              console.error(`Lesson ${lesson_id} not found in database - payment arrived after lesson was cleaned up`);
              
              // The lesson was deleted (likely due to our 2-minute cleanup), refund the payment
              if (session.payment_intent && typeof session.payment_intent === 'string') {
                try {
                  console.log(`Creating refund for checkout session ${session.id} as lesson no longer exists`);
                  const refund = await stripe.refunds.create({
                    payment_intent: session.payment_intent,
                    reason: 'requested_by_customer',
                  });
                  console.log(`Successfully created refund: ${refund.id}`);
                } catch (refundError) {
                  console.error(`Error creating refund for session ${session.id}:`, refundError);
                }
              } else {
                console.error(`Unable to refund - no payment intent ID available in session ${session.id}`);
              }
            }
          } catch (error) {
            console.error(`Error confirming lesson payment for ${lesson_id}:`, error);
          }
        }
        break;
      }
      
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        
        // Extract lesson data from metadata if available
        const { lesson_id } = paymentIntent.metadata || {};
        
        if (lesson_id) {
          console.log(`Payment succeeded for lesson: ${lesson_id}`);
          
          // First check if the lesson exists and hasn't been updated yet
          const lessonDoc = await getDoc(doc(db, 'lessons', lesson_id));
            
          if (lessonDoc.exists()) {
            const lessonData = lessonDoc.data();
            
            // Only update if the lesson is still in pending_payment status
            if (lessonData.status === 'pending_payment') {
              console.log(`Updating payment status for lesson ${lesson_id}`);
              // Update the lesson payment status and lesson status
              await updateDoc(doc(db, 'lessons', lesson_id), {
                status: 'scheduled',
                paymentStatus: 'paid',
                paymentId: paymentIntent.id,
                paymentAmount: paymentIntent.amount,
                paymentDate: new Date()
              });
              console.log(`Lesson ${lesson_id} status updated to 'scheduled'`);
            } else {
              console.log(`Lesson ${lesson_id} already processed, current status: ${lessonData.status}`);
            }
          } else {
            console.error(`Lesson ${lesson_id} not found in database - payment arrived after lesson was cleaned up`);
            
            // The lesson has been deleted (likely due to our 2-minute cleanup), refund the payment
            try {
              console.log(`Creating refund for payment ${paymentIntent.id} as lesson no longer exists`);
              const refund = await stripe.refunds.create({
                payment_intent: paymentIntent.id,
                reason: 'requested_by_customer',
              });
              console.log(`Successfully created refund: ${refund.id}`);
            } catch (refundError) {
              console.error(`Error creating refund for payment ${paymentIntent.id}:`, refundError);
            }
          }
        } else {
          console.log('No lesson_id found in payment intent metadata, checking checkout session');
          
          // Try to look up the checkout session that created this payment intent
          try {
            const sessions = await stripe.checkout.sessions.list({
              payment_intent: paymentIntent.id,
              limit: 1,
            });
            
            if (sessions.data.length > 0) {
              const session = sessions.data[0];
              const sessionLessonId = session.metadata?.lesson_id;
              
              if (sessionLessonId) {
                console.log(`Found lesson_id ${sessionLessonId} from checkout session`);
                
                // Update the lesson with this ID
                const lessonDoc = await getDoc(doc(db, 'lessons', sessionLessonId));
                
                if (lessonDoc.exists()) {
                  const lessonData = lessonDoc.data();
                  
                  // Only update if the lesson is still in pending_payment status
                  if (lessonData.status === 'pending_payment') {
                    console.log(`Updating payment status for lesson ${sessionLessonId} from session metadata`);
                    await updateDoc(doc(db, 'lessons', sessionLessonId), {
                      status: 'scheduled',
                      paymentStatus: 'paid',
                      paymentId: paymentIntent.id,
                      paymentAmount: paymentIntent.amount,
                      paymentDate: new Date()
                    });
                    console.log(`Lesson ${sessionLessonId} status updated to 'scheduled'`);
                  } else {
                    console.log(`Lesson ${sessionLessonId} already processed, current status: ${lessonData.status}`);
                  }
                } else {
                  console.error(`Lesson ${sessionLessonId} from session metadata not found in database`);
                }
              } else {
                console.log('No lesson_id found in session metadata');
              }
            } else {
              console.log('No checkout session found for this payment intent');
            }
          } catch (sessionError) {
            console.error('Error looking up checkout session:', sessionError);
          }
        }
        break;
      }
      
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        
        // Extract lesson data from metadata if available
        const { lesson_id } = paymentIntent.metadata || {};
        
        if (lesson_id) {
          console.log(`Payment failed for lesson: ${lesson_id}`);
          
          try {
            // First, get the lesson to check if it's in pending_payment status
            const lessonDoc = await getDoc(doc(db, 'lessons', lesson_id));
            
            if (lessonDoc.exists()) {
              const lessonData = lessonDoc.data();
              
              // If this is a pending payment, we can delete the lesson to free up the slot
              if (lessonData.status === 'pending_payment') {
                console.log(`Deleting pending lesson ${lesson_id} due to payment failure`);
                await deleteDoc(doc(db, 'lessons', lesson_id));
                console.log(`Successfully deleted lesson ${lesson_id}`);
              } else {
                // If it's already scheduled or in another state, just mark it as failed payment
                console.log(`Updating lesson ${lesson_id} with failed payment status`);
                await updateDoc(doc(db, 'lessons', lesson_id), {
                  paymentStatus: 'failed',
                  paymentErrorMessage: paymentIntent.last_payment_error?.message || 'Payment failed',
                });
              }
            } else {
              console.error(`Lesson ${lesson_id} not found for failed payment`);
            }
          } catch (error) {
            console.error(`Error handling failed payment for lesson ${lesson_id}:`, error);
          }
        }
        break;
      }
      
      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        // Extract lesson data from metadata
        const { lesson_id } = session.metadata || {};
        
        if (lesson_id) {
          console.log(`Checkout session expired for lesson: ${lesson_id}`);
          
          try {
            // Get the lesson to check if it's still in pending_payment status
            const lessonDoc = await getDoc(doc(db, 'lessons', lesson_id));
            
            if (lessonDoc.exists()) {
              const lessonData = lessonDoc.data();
              
              // Only delete if the lesson is still in pending_payment status
              if (lessonData.status === 'pending_payment') {
                console.log(`Deleting pending lesson ${lesson_id} due to expired checkout session`);
                await deleteDoc(doc(db, 'lessons', lesson_id));
                console.log(`Successfully deleted lesson ${lesson_id} after checkout session expiration`);
              } else {
                console.log(`Lesson ${lesson_id} already processed, current status: ${lessonData.status}`);
              }
            } else {
              console.error(`Lesson ${lesson_id} not found for expired checkout session`);
            }
          } catch (error) {
            console.error(`Error handling expired checkout session for lesson ${lesson_id}:`, error);
          }
        }
        break;
      }
      
      case 'transfer.created': {
        const transfer = event.data.object as Stripe.Transfer;
        
        // Extract lesson IDs from metadata
        const { lesson_ids } = transfer.metadata || {};
        
        if (lesson_ids) {
          console.log(`Transfer created for lessons: ${lesson_ids}`);
          
          // Update all lessons with the transfer info
          const lessonIdsArray = lesson_ids.split(',');
          
          for (const lessonId of lessonIdsArray) {
            // Check if the lesson exists
            const lessonDoc = await getDoc(doc(db, 'lessons', lessonId));
            
            if (lessonDoc.exists()) {
              await updateDoc(doc(db, 'lessons', lessonId), {
                payoutStatus: 'paid',
                payoutId: transfer.id,
                payoutAmount: transfer.amount / lessonIdsArray.length, // Divide the total amount by the number of lessons
                payoutDate: new Date(),
              });
              console.log(`Updated payout status for lesson ${lessonId}`);
            } else {
              console.error(`Lesson ${lessonId} not found for payout update`);
            }
          }
        }
        break;
      }
      
      default:
        // Unhandled event type
        console.log(`Unhandled event type: ${event.type}`);
    }
    
    // Return a response to acknowledge receipt of the event
    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: error.message || 'Webhook handler failed' },
      { status: 500 }
    );
  }
} 