import { useState, useEffect } from 'react';
import { rescheduleLesson, canLessonBeRescheduled, cancelLessonForStudent, canLessonBeCancelledByStudent } from '../firebase/firestore';
import TutorBookingCalendar from './TutorBookingCalendar';

interface StudentLessonActionsProps {
  lesson: {
    id: string;
    tutorId: string;
    status: string;
    date: any; // Using any here since Firebase timestamps can be tricky with typing
  };
  onActionComplete: () => void; // Callback to refresh lessons after action
}

export default function StudentLessonActions({ lesson, onActionComplete }: StudentLessonActionsProps) {
  const [canReschedule, setCanReschedule] = useState<boolean | null>(null);
  const [canCancel, setCanCancel] = useState<boolean | null>(null);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [selectedDateTime, setSelectedDateTime] = useState<Date | null>(null);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Check if the lesson can be rescheduled or cancelled when component mounts
  useEffect(() => {
    const checkActions = async () => {
      const [canReschedule, canCancel] = await Promise.all([
        canLessonBeRescheduled(lesson.id),
        canLessonBeCancelledByStudent(lesson.id)
      ]);
      setCanReschedule(canReschedule);
      setCanCancel(canCancel);
    };
    
    checkActions();
  }, [lesson.id]);

  // Handle selecting a new date/time for rescheduling
  const handleTimeSelected = (dateTime: Date) => {
    setSelectedDateTime(dateTime);
  };

  // Handle rescheduling action
  const handleRescheduleLesson = async () => {
    if (!selectedDateTime) {
      setError('Please select a new date and time before rescheduling.');
      return;
    }

    // Confirm rescheduling with browser dialog
    const confirmed = window.confirm('Are you sure you want to reschedule this lesson to ' + 
      selectedDateTime.toLocaleDateString() + ' at ' + 
      selectedDateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + 
      '?');
    if (!confirmed) return;

    try {
      setError('');
      await rescheduleLesson(lesson.id, selectedDateTime);
      setSuccessMessage('Lesson rescheduled successfully!');
      setIsRescheduling(false);
      
      // Notify parent component to refresh
      onActionComplete();
    } catch (error: any) {
      console.error('Error rescheduling lesson:', error);
      setError(error.message || 'Failed to reschedule the lesson. Please try again.');
    }
  };

  // Handle cancellation action
  const handleCancelLesson = async () => {
    // Confirm cancellation with browser dialog
    const confirmed = window.confirm('Are you sure you want to cancel this lesson? This action cannot be undone.');
    if (!confirmed) return;
    
    try {
      setError('');
      await cancelLessonForStudent(lesson.id);
      setSuccessMessage('Lesson cancelled successfully!');
      setIsCancelling(false);
      
      // Notify parent component to refresh
      onActionComplete();
    } catch (error: any) {
      console.error('Error cancelling lesson:', error);
      setError(error.message || 'Failed to cancel the lesson. Please try again.');
    }
  };

  // If lesson status is not 'scheduled', don't show action buttons
  if (lesson.status !== 'scheduled') {
    return null;
  }

  // Render rescheduling form
  if (isRescheduling) {
    return (
      <div className="mt-4 p-4 bg-white border rounded-lg shadow-sm">
        <h3 className="font-medium mb-4">Reschedule Lesson</h3>
        {error && <p className="text-red-600 mb-2">{error}</p>}
        
        <div className="mb-4">
          <p className="text-gray-700 mb-2">Please select a new date and time:</p>
          <div className="border rounded-lg overflow-hidden">
            <TutorBookingCalendar 
              tutorId={lesson.tutorId}
              onTimeSelected={handleTimeSelected}
              isTutorView={false}
            />
          </div>
        </div>
        
        {selectedDateTime && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-800 mb-1">New Selected Time</h4>
            <p>
              {selectedDateTime.toLocaleDateString('en-US', { 
                weekday: 'long', 
                month: 'long', 
                day: 'numeric',
                year: 'numeric'
              })} at {selectedDateTime.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              })}
            </p>
          </div>
        )}
        
        <div className="flex justify-end space-x-3">
          <button
            onClick={() => setIsRescheduling(false)}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleRescheduleLesson}
            disabled={!selectedDateTime}
            className={`px-4 py-2 rounded ${
              !selectedDateTime 
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            Confirm Reschedule
          </button>
        </div>
      </div>
    );
  }

  // Display success message if present
  if (successMessage) {
    return (
      <div className="bg-green-50 p-2 rounded">
        <p className="text-green-700">{successMessage}</p>
      </div>
    );
  }

  // Render action buttons
  return (
    <div className="flex justify-end space-x-2">
      {canReschedule === true ? (
        <button
          onClick={() => setIsRescheduling(true)}
          className="px-4 py-2 border border-blue-600 text-blue-600 rounded hover:bg-blue-50"
        >
          Reschedule Lesson
        </button>
      ) : canReschedule === false ? (
        <button
          disabled
          className="px-4 py-2 border border-gray-300 text-gray-400 rounded cursor-not-allowed"
          title="Lessons can only be rescheduled 24+ hours in advance"
        >
          Reschedule Lesson
        </button>
      ) : null}

      {canCancel === true ? (
        <button
          onClick={handleCancelLesson}
          className="px-4 py-2 border border-red-600 text-red-600 rounded hover:bg-red-50"
        >
          Cancel Lesson
        </button>
      ) : canCancel === false ? (
        <button
          disabled
          className="px-4 py-2 border border-gray-300 text-gray-400 rounded cursor-not-allowed"
          title="Lessons can only be cancelled 24+ hours in advance"
        >
          Cancel Lesson
        </button>
      ) : null}
    </div>
  );
} 