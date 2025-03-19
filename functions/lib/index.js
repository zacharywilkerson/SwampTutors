"use strict";
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateLessonDates = exports.cleanupPendingLessonsManual = exports.cleanupPendingLessons = exports.stripeWebhook = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const stripe_1 = require("stripe");
admin.initializeApp();
const db = admin.firestore();
// Get Stripe config from Firebase Functions config
const stripeSecretKey = (_a = functions.config().stripe) === null || _a === void 0 ? void 0 : _a.secret_key;
const stripeWebhookSecret = (_b = functions.config().stripe) === null || _b === void 0 ? void 0 : _b.webhook_secret;
const siteUrl = functions.config().stripe?.site_url || 'http://localhost:3000';
const stripe = new stripe_1.default(stripeSecretKey || '', {
    apiVersion: '2024-06-20',
});

// Scheduled function to clean up pending lessons that haven't been paid for
// This function is no longer needed since we now use Payment Intents with manual confirmation
// and only create lessons after payment method is authorized
/*
exports.cleanupPendingLessons = functions.pubsub.schedule('every 1 minutes').onRun(async (context) => {
    console.log('Running scheduled cleanup of pending lessons:', new Date().toISOString());
    
    try {
        // Calculate the cutoff time (2 minutes ago instead of 24 hours)
        const cutoffTime = new Date();
        cutoffTime.setMinutes(cutoffTime.getMinutes() - 2);
        
        // Convert JavaScript Date to Firestore Timestamp for proper comparison
        const cutoffTimestamp = admin.firestore.Timestamp.fromDate(cutoffTime);
        
        // Query for lessons that are still in pending_payment status created before the cutoff time
        const pendingLessonsQuery = db.collection('lessons')
            .where('status', '==', 'pending_payment')
            .where('createdAt', '<', cutoffTimestamp);
        
        const pendingLessons = await pendingLessonsQuery.get();
        
        console.log(`Found ${pendingLessons.size} pending lessons older than 2 minutes`);
        
        // Delete each lesson that's been pending for too long
        const deletePromises = [];
        pendingLessons.forEach(doc => {
            try {
                const data = doc.data();
                const createdAt = data.createdAt;
                let createdAtString = 'unknown time';
                
                // Handle both Timestamp and Date objects
                if (createdAt) {
                    if (typeof createdAt.toDate === 'function') {
                        // Firebase Timestamp
                        createdAtString = createdAt.toDate().toISOString();
                    } else if (createdAt instanceof Date) {
                        // JavaScript Date
                        createdAtString = createdAt.toISOString();
                    } else if (createdAt._seconds !== undefined) {
                        // Serialized Timestamp
                        createdAtString = new Date(createdAt._seconds * 1000).toISOString();
                    }
                }
                
                console.log(`Deleting expired pending lesson: ${doc.id}, created at: ${createdAtString}`);
                deletePromises.push(doc.ref.delete());
            } catch (docError) {
                console.error(`Error processing document ${doc.id} for deletion:`, docError);
                // Still attempt to delete it
                deletePromises.push(doc.ref.delete());
            }
        });
        
        // Wait for all deletes to complete
        await Promise.all(deletePromises);
        
        console.log(`Successfully deleted ${deletePromises.length} expired pending lessons`);
        
        return null;
    } catch (error) {
        console.error('Error cleaning up pending lessons:', error);
        return null;
    }
});
*/

exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
    var _a, _b;
    console.log('Webhook received at:', new Date().toISOString());
    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }
    try {
        if (!stripeWebhookSecret) {
            console.error('Stripe webhook secret is not set');
            res.status(500).send('Webhook secret not configured');
            return;
        }
        // Get the stripe signature from the headers
        const signature = req.headers['stripe-signature'];
        if (!signature) {
            console.error('No stripe signature in request');
            res.status(400).send('No signature provided');
            return;
        }
        // Get the raw body as a buffer
        const rawBody = req.rawBody;
        if (!rawBody) {
            console.error('No raw body in request');
            res.status(400).send('No request body');
            return;
        }
        // Verify the event
        let event;
        try {
            event = stripe.webhooks.constructEvent(rawBody, signature, stripeWebhookSecret);
        }
        catch (err) {
            console.error(`Webhook signature verification failed: ${err.message}`);
            res.status(400).send(`Webhook Error: ${err.message}`);
            return;
        }
        console.log(`Processing Stripe webhook event: ${event.type}`);
        // Handle different event types
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object;
                // Extract lesson data from metadata
                const { lesson_id } = session.metadata || {};
                if (lesson_id) {
                    console.log(`Checkout completed for lesson: ${lesson_id}`);
                    try {
                        // First check if the lesson exists and hasn't been updated yet
                        const lessonRef = db.collection('lessons').doc(lesson_id);
                        const lessonDoc = await lessonRef.get();
                        if (lessonDoc.exists) {
                            const lessonData = lessonDoc.data();
                            // Only update if the lesson is still in pending_payment status
                            if (lessonData && lessonData.status === 'pending_payment') {
                                console.log(`Confirming payment for lesson ${lesson_id} - was in pending_payment status`);
                                // Update the lesson status and payment details
                                await lessonRef.update({
                                    status: 'scheduled',
                                    paymentStatus: 'paid',
                                    paymentId: session.id,
                                    paymentAmount: session.amount_total || 0,
                                    paymentDate: admin.firestore.FieldValue.serverTimestamp()
                                });
                                console.log(`Lesson ${lesson_id} status updated to 'scheduled'`);
                                // Optionally send notifications (implementation would depend on your setup)
                                try {
                                    // Get tutor and student information
                                    const tutorRef = db.collection('users').doc(lessonData.tutorId);
                                    const studentRef = db.collection('users').doc(lessonData.studentId);
                                    const [tutorDoc, studentDoc] = await Promise.all([
                                        tutorRef.get(),
                                        studentRef.get()
                                    ]);
                                    if (tutorDoc.exists && studentDoc.exists) {
                                        const tutorData = tutorDoc.data();
                                        const studentData = studentDoc.data();
                                        // Create notifications in Firestore
                                        const notificationsRef = db.collection('notifications');
                                        // Notification for tutor
                                        await notificationsRef.add({
                                            userId: lessonData.tutorId,
                                            type: 'lesson_scheduled',
                                            read: false,
                                            createdAt: admin.firestore.FieldValue.serverTimestamp(),
                                            data: {
                                                lessonId: lesson_id,
                                                message: `New lesson scheduled with ${(studentData === null || studentData === void 0 ? void 0 : studentData.displayName) || 'a student'} for ${new Date(lessonData.date.toDate()).toLocaleString()}`,
                                                studentName: studentData === null || studentData === void 0 ? void 0 : studentData.displayName,
                                                lessonDate: lessonData.date,
                                                courseCode: lessonData.courseCode
                                            }
                                        });
                                        // Notification for student
                                        await notificationsRef.add({
                                            userId: lessonData.studentId,
                                            type: 'lesson_scheduled',
                                            read: false,
                                            createdAt: admin.firestore.FieldValue.serverTimestamp(),
                                            data: {
                                                lessonId: lesson_id,
                                                message: `Your lesson with ${(tutorData === null || tutorData === void 0 ? void 0 : tutorData.displayName) || 'your tutor'} is scheduled for ${new Date(lessonData.date.toDate()).toLocaleString()}`,
                                                tutorName: tutorData === null || tutorData === void 0 ? void 0 : tutorData.displayName,
                                                lessonDate: lessonData.date,
                                                courseCode: lessonData.courseCode
                                            }
                                        });
                                        console.log(`Sent notifications for lesson ${lesson_id}`);
                                    }
                                }
                                catch (notificationError) {
                                    console.error('Error sending notifications:', notificationError);
                                    // Continue despite notification error
                                }
                            }
                            else {
                                console.log(`Lesson ${lesson_id} already processed, current status: ${lessonData === null || lessonData === void 0 ? void 0 : lessonData.status}`);
                            }
                        }
                        else {
                            console.error(`Lesson ${lesson_id} not found in database - payment arrived after lesson was cleaned up`);
                            // The lesson has been deleted (likely due to our 2-minute cleanup), refund the payment
                            if (session.payment_intent && typeof session.payment_intent === 'string') {
                                try {
                                    console.log(`Creating refund for checkout session ${session.id} as lesson no longer exists`);
                                    const refund = await stripe.refunds.create({
                                        payment_intent: session.payment_intent,
                                        reason: 'requested_by_customer',
                                    });
                                    console.log(`Successfully created refund: ${refund.id}`);
                                }
                                catch (refundError) {
                                    console.error(`Error creating refund for session ${session.id}:`, refundError);
                                }
                            }
                            else {
                                console.error(`Unable to refund - no payment intent ID available in session ${session.id}`);
                            }
                        }
                    }
                    catch (error) {
                        console.error(`Error confirming lesson payment for ${lesson_id}:`, error);
                    }
                }
                break;
            }
            case 'payment_intent.succeeded': {
                const paymentIntent = event.data.object;
                // Extract lesson data from metadata if available
                const { lesson_id } = paymentIntent.metadata || {};
                if (lesson_id) {
                    console.log(`Payment succeeded for lesson: ${lesson_id}`);
                    // First check if the lesson exists and hasn't been updated yet
                    const lessonRef = db.collection('lessons').doc(lesson_id);
                    const lessonDoc = await lessonRef.get();
                    if (lessonDoc.exists) {
                        const lessonData = lessonDoc.data();
                        // Only update if the lesson is still in pending_payment status
                        if (lessonData && lessonData.status === 'pending_payment') {
                            console.log(`Updating payment status for lesson ${lesson_id}`);
                            // Update the lesson payment status and lesson status
                            await lessonRef.update({
                                status: 'scheduled',
                                paymentStatus: 'paid',
                                paymentId: paymentIntent.id,
                                paymentAmount: paymentIntent.amount,
                                paymentDate: admin.firestore.FieldValue.serverTimestamp()
                            });
                            console.log(`Lesson ${lesson_id} status updated to 'scheduled'`);
                        }
                        else {
                            console.log(`Lesson ${lesson_id} already processed, current status: ${lessonData === null || lessonData === void 0 ? void 0 : lessonData.status}`);
                        }
                    }
                    else {
                        console.error(`Lesson ${lesson_id} not found in database - payment arrived after lesson was cleaned up`);
                        // The lesson has been deleted (likely due to our 2-minute cleanup), refund the payment
                        try {
                            console.log(`Creating refund for payment ${paymentIntent.id} as lesson no longer exists`);
                            const refund = await stripe.refunds.create({
                                payment_intent: paymentIntent.id,
                                reason: 'requested_by_customer',
                            });
                            console.log(`Successfully created refund: ${refund.id}`);
                        }
                        catch (refundError) {
                            console.error(`Error creating refund for payment ${paymentIntent.id}:`, refundError);
                        }
                    }
                }
                else {
                    console.log('No lesson_id found in payment intent metadata, checking checkout session');
                    // Try to look up the checkout session that created this payment intent
                    try {
                        const sessions = await stripe.checkout.sessions.list({
                            payment_intent: paymentIntent.id,
                            limit: 1,
                        });
                        if (sessions.data.length > 0) {
                            const session = sessions.data[0];
                            const sessionLessonId = (_a = session.metadata) === null || _a === void 0 ? void 0 : _a.lesson_id;
                            if (sessionLessonId) {
                                console.log(`Found lesson_id ${sessionLessonId} from checkout session`);
                                // Update the lesson with this ID
                                const lessonRef = db.collection('lessons').doc(sessionLessonId);
                                const lessonDoc = await lessonRef.get();
                                if (lessonDoc.exists) {
                                    const lessonData = lessonDoc.data();
                                    // Only update if the lesson is still in pending_payment status
                                    if (lessonData && lessonData.status === 'pending_payment') {
                                        console.log(`Updating payment status for lesson ${sessionLessonId} from session metadata`);
                                        await lessonRef.update({
                                            status: 'scheduled',
                                            paymentStatus: 'paid',
                                            paymentId: paymentIntent.id,
                                            paymentAmount: paymentIntent.amount,
                                            paymentDate: admin.firestore.FieldValue.serverTimestamp()
                                        });
                                        console.log(`Lesson ${sessionLessonId} status updated to 'scheduled'`);
                                    }
                                    else {
                                        console.log(`Lesson ${sessionLessonId} already processed, current status: ${lessonData === null || lessonData === void 0 ? void 0 : lessonData.status}`);
                                    }
                                }
                                else {
                                    console.error(`Lesson ${sessionLessonId} from session metadata not found in database`);
                                }
                            }
                            else {
                                console.log('No lesson_id found in session metadata');
                            }
                        }
                        else {
                            console.log('No checkout session found for this payment intent');
                        }
                    }
                    catch (sessionError) {
                        console.error('Error looking up checkout session:', sessionError);
                    }
                }
                break;
            }
            case 'payment_intent.payment_failed': {
                const paymentIntent = event.data.object;
                // Extract lesson data from metadata if available
                const { lesson_id } = paymentIntent.metadata || {};
                if (lesson_id) {
                    console.log(`Payment failed for lesson: ${lesson_id}`);
                    try {
                        // First, get the lesson to check if it's in pending_payment status
                        const lessonRef = db.collection('lessons').doc(lesson_id);
                        const lessonDoc = await lessonRef.get();
                        if (lessonDoc.exists) {
                            const lessonData = lessonDoc.data();
                            // If this is a pending payment, we can delete the lesson to free up the slot
                            if (lessonData && lessonData.status === 'pending_payment') {
                                console.log(`Deleting pending lesson ${lesson_id} due to payment failure`);
                                await lessonRef.delete();
                                console.log(`Successfully deleted lesson ${lesson_id}`);
                            }
                            else {
                                // If it's already scheduled or in another state, just mark it as failed payment
                                console.log(`Updating lesson ${lesson_id} with failed payment status`);
                                await lessonRef.update({
                                    paymentStatus: 'failed',
                                    paymentErrorMessage: ((_b = paymentIntent.last_payment_error) === null || _b === void 0 ? void 0 : _b.message) || 'Payment failed',
                                });
                            }
                        }
                        else {
                            console.error(`Lesson ${lesson_id} not found for failed payment`);
                        }
                    }
                    catch (error) {
                        console.error(`Error handling failed payment for lesson ${lesson_id}:`, error);
                    }
                }
                break;
            }
            default:
                // Unhandled event type
                console.log(`Unhandled event type: ${event.type}`);
        }
        // Return a success response
        res.status(200).send({ received: true });
    }
    catch (error) {
        console.error('Webhook error:', error);
        res.status(500).send(`Webhook Error: ${error.message}`);
    }
});

// Add a new function for creating payment intents
exports.createPaymentIntent = functions.https.onCall(async (data, context) => {
    // Verify authentication
    if (!context.auth) {
        throw new functions.https.HttpsError(
            'unauthenticated',
            'The function must be called while authenticated.'
        );
    }

    try {
        const { amount, metadata } = data;
        
        if (!amount || amount < 100) {
            throw new functions.https.HttpsError(
                'invalid-argument',
                'Amount must be at least $1.00 (100 cents)'
            );
        }
        
        // Create a payment intent
        const paymentIntent = await stripe.paymentIntents.create({
            amount,
            currency: 'usd',
            automatic_payment_methods: {
                enabled: true,
            },
            metadata: metadata || {},
        });
        
        return { 
            clientSecret: paymentIntent.client_secret 
        };
    } catch (error) {
        console.error('Stripe API error:', error);
        throw new functions.https.HttpsError(
            'internal',
            error.message || 'Error creating payment intent'
        );
    }
});

// Add a function to create a Connect account for a tutor
exports.createStripeConnectAccount = functions.https.onCall(async (data, context) => {
    // Verify authentication
    if (!context.auth) {
        throw new functions.https.HttpsError(
            'unauthenticated',
            'The function must be called while authenticated.'
        );
    }
    
    try {
        const { tutor_id, email, name } = data;
        
        if (!tutor_id || !email || !name) {
            throw new functions.https.HttpsError(
                'invalid-argument',
                'Missing required parameters'
            );
        }
        
        // Ensure the user is an admin or is creating their own account
        const callerUid = context.auth.uid;
        const userRef = db.collection('users').doc(callerUid);
        const userSnapshot = await userRef.get();
        
        if (!userSnapshot.exists) {
            throw new functions.https.HttpsError(
                'permission-denied',
                'User does not exist'
            );
        }
        
        const userData = userSnapshot.data();
        if (userData.role !== 'admin' && callerUid !== tutor_id) {
            throw new functions.https.HttpsError(
                'permission-denied',
                'Only admins or the tutor themselves can create a Connect account'
            );
        }
        
        // Create a Stripe Connect account for the tutor
        const account = await stripe.accounts.create({
            type: 'express',
            country: 'US',
            email: email,
            business_type: 'individual',
            business_profile: {
                name: name,
            },
            capabilities: {
                transfers: { requested: true },
                card_payments: { requested: true },
            },
            metadata: {
                tutor_id,
            },
        });
        
        // Create an account link for onboarding
        const accountLink = await stripe.accountLinks.create({
            account: account.id,
            refresh_url: `${siteUrl}/tutor/payment-setup?onboarding=refresh`,
            return_url: `${siteUrl}/tutor/payment-setup?onboarding=complete`,
            type: 'account_onboarding',
        });
        
        // Update the user document with the Stripe account ID
        await db.collection('users').doc(tutor_id).update({
            stripeAccountId: account.id
        });
        
        return {
            account_id: account.id,
            onboarding_url: accountLink.url
        };
    } catch (error) {
        console.error('Stripe API error:', error);
        throw new functions.https.HttpsError(
            'internal',
            error.message || 'Error creating Stripe Connect account'
        );
    }
});

// Add a function for manually cleaning up pending lessons
// This function is no longer needed with our new payment approach
/*
exports.cleanupPendingLessonsManual = functions.https.onCall(async (data, context) => {
    console.log('Manual cleanup of pending lessons requested at:', new Date().toISOString());
    
    // Check authentication
    if (!context.auth) {
        throw new functions.https.HttpsError(
            'unauthenticated',
            'You must be logged in to perform this action'
        );
    }
    
    try {
        // Check if the user is an admin
        const userRef = db.collection('users').doc(context.auth.uid);
        const userDoc = await userRef.get();
        
        if (!userDoc.exists || userDoc.data().role !== 'admin') {
            throw new functions.https.HttpsError(
                'permission-denied',
                'You must be an admin to perform this action'
            );
        }
        
        // Calculate the cutoff time (2 minutes ago by default, or use provided minutes)
        const minutesThreshold = data.minutes || 2;
        const cutoffTime = new Date();
        cutoffTime.setMinutes(cutoffTime.getMinutes() - minutesThreshold);
        
        console.log(`Cleaning up lessons created before: ${cutoffTime.toISOString()}`);
        
        // Convert JavaScript Date to Firestore Timestamp for proper comparison
        const cutoffTimestamp = admin.firestore.Timestamp.fromDate(cutoffTime);
        
        // Query for lessons that are still in pending_payment status created before the cutoff time
        const pendingLessonsQuery = db.collection('lessons')
            .where('status', '==', 'pending_payment')
            .where('createdAt', '<', cutoffTimestamp);
        
        const pendingLessons = await pendingLessonsQuery.get();
        
        console.log(`Found ${pendingLessons.size} pending lessons older than ${minutesThreshold} minutes`);
        
        if (pendingLessons.empty) {
            return { 
                success: true, 
                message: `No pending lessons older than ${minutesThreshold} minutes were found to clean up.`,
                count: 0
            };
        }
        
        // Delete each lesson that's been pending for too long
        const deletePromises = [];
        pendingLessons.forEach(doc => {
            try {
                const data = doc.data();
                const createdAt = data.createdAt;
                let createdAtString = 'unknown time';
                
                // Handle both Timestamp and Date objects
                if (createdAt) {
                    if (typeof createdAt.toDate === 'function') {
                        // Firebase Timestamp
                        createdAtString = createdAt.toDate().toISOString();
                    } else if (createdAt instanceof Date) {
                        // JavaScript Date
                        createdAtString = createdAt.toISOString();
                    } else if (createdAt._seconds !== undefined) {
                        // Serialized Timestamp
                        createdAtString = new Date(createdAt._seconds * 1000).toISOString();
                    }
                }
                
                console.log(`Deleting expired pending lesson: ${doc.id}, created at: ${createdAtString}`);
                deletePromises.push(doc.ref.delete());
            } catch (docError) {
                console.error(`Error processing document ${doc.id} for deletion:`, docError);
                // Still attempt to delete it
                deletePromises.push(doc.ref.delete());
            }
        });
        
        // Wait for all deletes to complete
        await Promise.all(deletePromises);
        
        console.log(`Successfully deleted ${deletePromises.length} expired pending lessons`);
        
        return { 
            success: true, 
            message: `Successfully deleted ${deletePromises.length} expired pending lessons.`,
            count: deletePromises.length
        };
    } catch (error) {
        console.error('Error cleaning up pending lessons:', error);
        throw new functions.https.HttpsError(
            'internal',
            'An error occurred while cleaning up pending lessons',
            error
        );
    }
});
*/

// Add a function to fix existing lessons with JavaScript Date objects instead of Timestamps
exports.migrateLessonDates = functions.https.onCall(async (data, context) => {
    console.log('Running date migration for lessons:', new Date().toISOString());
    
    // Check authentication
    if (!context.auth) {
        throw new functions.https.HttpsError(
            'unauthenticated',
            'You must be logged in to perform this action'
        );
    }
    
    try {
        // Check if the user is an admin
        const userRef = db.collection('users').doc(context.auth.uid);
        const userDoc = await userRef.get();
        
        if (!userDoc.exists || userDoc.data().role !== 'admin') {
            throw new functions.https.HttpsError(
                'permission-denied',
                'You must be an admin to perform this action'
            );
        }
        
        // Get all lessons with a createdAt field
        const lessonsQuery = db.collection('lessons');
        const allLessons = await lessonsQuery.get();
        
        console.log(`Found ${allLessons.size} total lessons to check for date migrations`);
        
        // Count lessons that need updating
        let updateCount = 0;
        const updatePromises = [];
        
        allLessons.forEach(doc => {
            try {
                const data = doc.data();
                const createdAt = data.createdAt;
                
                // Only update if createdAt is a JavaScript Date or missing
                if (!createdAt) {
                    console.log(`Lesson ${doc.id} missing createdAt, adding timestamp`);
                    updatePromises.push(
                        doc.ref.update({
                            createdAt: admin.firestore.FieldValue.serverTimestamp()
                        })
                    );
                    updateCount++;
                } else if (createdAt instanceof Date) {
                    console.log(`Lesson ${doc.id} has JavaScript Date for createdAt, converting to Timestamp`);
                    updatePromises.push(
                        doc.ref.update({
                            createdAt: admin.firestore.Timestamp.fromDate(createdAt)
                        })
                    );
                    updateCount++;
                }
            } catch (docError) {
                console.error(`Error checking date format for lesson ${doc.id}:`, docError);
            }
        });
        
        // Wait for all updates to complete
        await Promise.all(updatePromises);
        
        console.log(`Successfully updated ${updateCount} lessons with proper Timestamp format`);
        
        return { 
            success: true, 
            message: `Successfully migrated ${updateCount} lessons to Firestore Timestamp format.`,
            count: updateCount
        };
    } catch (error) {
        console.error('Error migrating lesson dates:', error);
        throw new functions.https.HttpsError(
            'internal',
            'An error occurred while migrating lesson dates',
            error
        );
    }
});

//# sourceMappingURL=index.js.map