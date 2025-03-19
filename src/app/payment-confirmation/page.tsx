'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createLesson, checkExistingLessonBooking, isTutorAvailableAtTime } from '@/firebase/firestore';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useAuth } from '@/hooks/useAuth';

export default function PaymentConfirmation() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing your payment and booking...');
  const [lessonId, setLessonId] = useState<string | null>(null);
  const [tutorId, setTutorId] = useState<string | null>(null);
  const [confirmationProcessed, setConfirmationProcessed] = useState(false);

  useEffect(() => {
    // Don't process anything if auth is still loading - wait for auth to be ready
    if (authLoading) return;
    
    // Only process confirmation once
    if (confirmationProcessed) return;
    
    const processPaymentConfirmation = async () => {
      try {
        setConfirmationProcessed(true);
        
        if (!user) {
          setStatus('error');
          setMessage('You must be logged in to complete the booking.');
          return;
        }

        // Get the booking key from the URL parameters
        const bookingKey = searchParams.get('booking_key');
        if (!bookingKey) {
          setStatus('error');
          setMessage('Missing booking information. Please try again.');
          return;
        }

        // Get the stored payment intent information
        const piData = sessionStorage.getItem(`pi_${bookingKey}`);
        if (!piData) {
          setStatus('error');
          setMessage('Payment information not found. Please try booking again.');
          return;
        }

        // Parse the payment intent data
        const {
          id: paymentIntentId,
          tutorId,
          studentId,
          courseCode,
          dateTime,
          price
        } = JSON.parse(piData);

        // Set the tutor ID for navigation later
        setTutorId(tutorId);

        // Verify this is the correct user
        if (user.uid !== studentId) {
          setStatus('error');
          setMessage('User mismatch. Please log in with the correct account.');
          return;
        }

        // Check if the time slot is still available
        const date = new Date(dateTime);
        
        // First, check if we already have a booking for this slot from this student
        const existingBookingId = await checkExistingLessonBooking(tutorId, studentId, date);
        
        let lessonId;
        
        if (existingBookingId) {
          // A booking already exists, use it instead of creating a new one
          console.log(`Using existing lesson: ${existingBookingId}`);
          lessonId = existingBookingId;
          
          // Update the existing lesson with the payment intent
          await updateDoc(doc(db, 'lessons', existingBookingId), {
            status: 'scheduled',
            paymentStatus: 'authorized',
            paymentIntentId,
          });
        } else {
          // No existing booking for this student - check if the tutor is available at this time (not booked with any other student)
          const isTutorAvailable = await isTutorAvailableAtTime(tutorId, date);
          
          if (!isTutorAvailable) {
            setStatus('error');
            setMessage('This time slot is no longer available. The tutor is already booked at this time. Please select another time.');
            return;
          }
          
          // Tutor is available, create a new lesson
          console.log('Creating new lesson with confirmed payment');
          const lessonResult = await createLesson({
            tutorId,
            studentId,
            courseCode,
            date,
            duration: 60, // Default to 1 hour
            notes: ""
          });

          if (!lessonResult || !lessonResult.id) {
            throw new Error('Failed to create lesson');
          }
          
          // Store the Payment Intent ID with the lesson
          await updateDoc(doc(db, 'lessons', lessonResult.id), {
            status: 'scheduled', // Change from pending_payment to scheduled
            paymentStatus: 'authorized', // Payment is authorized but not captured
            paymentIntentId, // Store the payment intent ID for capturing later
          });
          
          lessonId = lessonResult.id;
        }

        // Cleanup the storage
        sessionStorage.removeItem(bookingKey);
        sessionStorage.removeItem(`pi_${bookingKey}`);

        // Set success state
        setLessonId(lessonId);
        setStatus('success');
        setMessage('Your booking has been confirmed!');

      } catch (error) {
        console.error('Error confirming booking:', error);
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'An error occurred while confirming your booking');
      }
    };

    processPaymentConfirmation();
  }, [user, authLoading, searchParams, router, confirmationProcessed]);

  // Show loading state if auth is still loading
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-16">
        <div className="container mx-auto px-4">
          <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-8">
            <h1 className="text-2xl font-bold mb-6 text-center">Processing Payment</h1>
            <div className="mb-6 p-4 rounded-md bg-blue-50 text-blue-700">
              <p>Checking your authentication status...</p>
            </div>
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="container mx-auto px-4">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-8">
          <h1 className="text-2xl font-bold mb-6 text-center">
            {status === 'loading' ? 'Processing Payment' : 
             status === 'success' ? 'Booking Confirmed' : 'Booking Error'}
          </h1>
          
          <div className={`mb-6 p-4 rounded-md ${
            status === 'loading' ? 'bg-blue-50 text-blue-700' : 
            status === 'success' ? 'bg-green-50 text-green-700' : 
            'bg-red-50 text-red-700'
          }`}>
            <p>{message}</p>
          </div>

          {status === 'loading' && (
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          )}

          {status === 'success' && (
            <div className="space-y-4">
              <p className="text-gray-600">
                Your tutor will be notified about the booking. Payment will only be processed after the lesson is completed.
              </p>
              <div className="flex flex-col space-y-2">
                <Link 
                  href={`/student/lessons/${lessonId}`} 
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded text-center"
                >
                  View Lesson Details
                </Link>
                <Link 
                  href={`/tutor/${tutorId}`}
                  className="w-full border border-blue-600 hover:bg-blue-50 text-blue-600 py-2 px-4 rounded text-center"
                >
                  Back to Tutor Profile
                </Link>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-4">
              <p className="text-gray-600">
                We couldn't complete your booking. You have not been charged.
              </p>
              {tutorId ? (
                <Link 
                  href={`/tutor/${tutorId}`}
                  className="block w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded text-center"
                >
                  Try Again
                </Link>
              ) : (
                <Link 
                  href="/"
                  className="block w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded text-center"
                >
                  Return to Home
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 