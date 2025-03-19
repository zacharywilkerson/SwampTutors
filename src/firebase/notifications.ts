// This file contains notification functions for lesson status changes.
// In a production environment, you would integrate with an email service
// like SendGrid, Firebase Cloud Functions, or another email provider.
import { collection, addDoc } from 'firebase/firestore';
import { db } from './config';

// Helper function to format a date for display
const formatDate = (date: Date): string => {
  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

// Types for notification payload
interface NotificationPayload {
  lessonId: string;
  tutorId: string;
  studentId: string;
  tutorEmail?: string;
  studentEmail?: string;
  tutorName?: string;
  studentName?: string;
  lessonDate: Date;
  courseCode: string;
}

// Placeholder for sending a lesson scheduled notification
export const sendLessonScheduledNotification = async (lessonData: {
  lessonId: string;
  tutorId: string;
  studentId: string;
  tutorEmail: string;
  studentEmail: string;
  tutorName: string;
  studentName: string;
  lessonDate: Date;
  courseCode: string;
}) => {
  try {
    console.log(`Sending lesson scheduled notification for lesson ${lessonData.lessonId}`);
    
    // Create notifications for both tutor and student
    const notifications = [
      // Notification for tutor
      {
        userId: lessonData.tutorId,
        type: 'lesson_scheduled',
        read: false,
        createdAt: new Date(),
        data: {
          lessonId: lessonData.lessonId,
          message: `New lesson scheduled with ${lessonData.studentName} for ${formatDate(lessonData.lessonDate)}`,
          studentName: lessonData.studentName,
          lessonDate: lessonData.lessonDate,
          courseCode: lessonData.courseCode
        }
      },
      // Notification for student
      {
        userId: lessonData.studentId,
        type: 'lesson_scheduled',
        read: false,
        createdAt: new Date(),
        data: {
          lessonId: lessonData.lessonId,
          message: `Your lesson with ${lessonData.tutorName} is scheduled for ${formatDate(lessonData.lessonDate)}`,
          tutorName: lessonData.tutorName,
          lessonDate: lessonData.lessonDate,
          courseCode: lessonData.courseCode
        }
      }
    ];
    
    // Add each notification
    for (const notification of notifications) {
      await addDoc(collection(db, 'notifications'), notification);
      console.log(`Added notification for user ${notification.userId}: ${notification.data.message}`);
    }
    
    // In a real application, we would also send emails here
    // For now, we'll just log that we would have sent emails
    console.log(`Would send email to tutor (${lessonData.tutorEmail}): New lesson scheduled`);
    console.log(`Would send email to student (${lessonData.studentEmail}): Lesson confirmation`);
    
    return true;
  } catch (error) {
    console.error('Error sending lesson scheduled notification:', error);
    return false;
  }
};

// Placeholder for sending a lesson completed notification
export const sendLessonCompletedNotification = async (payload: NotificationPayload, completionNotes: string) => {
  console.log('Sending lesson completed notification', payload);
  
  // TODO: Implement actual email sending logic
  
  return true;
};

// Placeholder for sending a lesson cancelled notification
export const sendLessonCancelledNotification = async (payload: NotificationPayload, cancellationReason: string) => {
  console.log('Sending lesson cancelled notification', payload);
  
  // TODO: Implement actual email sending logic
  
  return true;
};

// Placeholder for sending a lesson rescheduled notification
export const sendLessonRescheduledNotification = async (payload: NotificationPayload, originalDate: Date) => {
  console.log('Sending lesson rescheduled notification', payload);
  
  // TODO: Implement actual email sending logic
  
  return true;
}; 