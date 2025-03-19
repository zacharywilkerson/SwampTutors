import { useState, useEffect } from 'react';
import { completeLesson, cancelLesson, canLessonBeCancelled } from '../firebase/firestore';
import { convertToDate } from '../utils/dateUtils';

interface TutorLessonActionsProps {
  lesson: {
    id: string;
    status: string;
    date: any; // Using any here since Firebase timestamps can be tricky with typing
    studentName?: string;
    courseCode?: string;
    tutorRate?: number;
    duration?: number;
  };
  onActionComplete: () => void; // Callback to refresh lessons after action
  compact?: boolean; // New prop to control compact mode
  activeTab?: string; // Added prop to know which tab the lesson is displayed in
}

export default function TutorLessonActions({ lesson, onActionComplete, compact = false, activeTab = "upcoming" }: TutorLessonActionsProps) {
  const [canCancel, setCanCancel] = useState<boolean | null>(null);
  const [isCompletingLesson, setIsCompletingLesson] = useState(false);
  const [isCancellingLesson, setIsCancellingLesson] = useState(false);
  const [completionNotes, setCompletionNotes] = useState('');
  const [cancellationReason, setCancellationReason] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [confirmCompletion, setConfirmCompletion] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Check if the lesson can be cancelled when component mounts
  useEffect(() => {
    const checkCancellation = async () => {
      try {
        const canCancel = await canLessonBeCancelled(lesson.id);
        setCanCancel(canCancel);
      } catch (error) {
        console.error("Error checking if lesson can be cancelled:", error);
        setCanCancel(false);
      }
    };
    
    checkCancellation();
  }, [lesson.id]);

  // Calculate if lesson date is in the past
  const isLessonPast = () => {
    // Use convertToDate utility to safely handle different date formats
    if (!lesson || !lesson.date) return false;
    
    const lessonDate = convertToDate(lesson.date);
    // Consider the lesson to be "past" only after the full hour
    // This assumes lessons are 1 hour long - add 1 hour to start time
    const lessonEndTime = new Date(lessonDate.getTime() + 60 * 60 * 1000);
    const now = new Date();
    return lessonEndTime < now; // Compare with end time instead of start time
  };

  // Count words in a string
  const countWords = (text: string) => {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  // Handle completion action
  const handleCompleteLesson = async () => {
    const wordCount = countWords(completionNotes);
    if (wordCount < 15) {
      setError(`Please provide at least 15 words in your lesson notes. Current count: ${wordCount} words.`);
      return;
    }

    if (!confirmCompletion) {
      setError('Please confirm the lesson details by checking the box.');
      return;
    }

    try {
      setError('');
      setIsProcessing(true);
      
      // Clear any previous success message
      setSuccessMessage('');
      
      // Complete the lesson
      console.log(`Submitting completion for lesson ${lesson.id} with ${wordCount} words of notes`);
      const result = await completeLesson(lesson.id, completionNotes);
      
      console.log('Lesson completion result:', result);
      
      if (result.lessonCompleted) {
        if (result.paymentCaptured) {
          setSuccessMessage('Lesson completed successfully! The student has been charged for this lesson.');
        } else if (result.paymentError) {
          // Show that lesson was completed but payment had an issue (only visible to the tutor)
          setSuccessMessage('Lesson marked as completed, but there was an issue with payment processing. An administrator will review this.');
          console.error('Payment error:', result.paymentError);
        } else {
          // Case where there was no payment intent ID or other scenario
          setSuccessMessage('Lesson completed successfully!');
        }
        
        setIsCompletingLesson(false);
        
        // Notify parent component to refresh
        onActionComplete();
      } else {
        setError('There was an issue completing the lesson. Please try again.');
      }
    } catch (error: any) {
      console.error('Error completing lesson:', error);
      setError(error?.message || 'Failed to complete the lesson. Please try again.');
      setSuccessMessage('');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle cancellation action
  const handleCancelLesson = async () => {
    if (!cancellationReason.trim()) {
      setError('Please provide a reason for cancellation.');
      return;
    }

    // Confirm cancellation with browser dialog
    const confirmed = window.confirm('Are you sure you want to cancel this lesson? This action cannot be undone.');
    if (!confirmed) return;

    try {
      setError('');
      await cancelLesson(lesson.id, cancellationReason);
      setSuccessMessage('Lesson cancelled successfully');
      setIsCancellingLesson(false);
      
      // Notify parent component to refresh
      onActionComplete();
    } catch (error: any) {
      console.error('Error cancelling lesson:', error);
      setError(error.message || 'Failed to cancel the lesson. Please try again.');
    }
  };

  // If lesson status is completed or cancelled, don't show action buttons
  if (lesson.status === 'completed' || lesson.status === 'cancelled') {
    return null;
  }

  // Format lesson date
  const formatLessonDateTime = () => {
    if (!lesson || !lesson.date) return 'Unknown date';
    const lessonDate = convertToDate(lesson.date);
    return lessonDate.toLocaleString([], {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Render completion form
  if (isCompletingLesson) {
    // Forms always render in full mode regardless of compact setting
    return (
      <div className={`${compact ? 'fixed inset-0 bg-opacity-30 backdrop-blur-sm flex items-center justify-center z-50 p-4' : 'p-4 border-t bg-gray-50'}`}>
        <div className={`${compact ? 'bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 overflow-y-auto max-h-[90vh]' : 'w-full'}`}>
          <div className="bg-blue-600 text-white p-4 rounded-t-lg">
            <h3 className="font-semibold text-xl">Submit Lesson Notes</h3>
          </div>
          
          <div className="p-6">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 rounded">
                <p>{error}</p>
              </div>
            )}
            
            <div className="bg-blue-50 p-4 rounded-lg mb-6">
              <h4 className="font-medium text-blue-800 mb-3">Lesson Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Date & Time</p>
                  <p className="font-medium">{formatLessonDateTime()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Student</p>
                  <p className="font-medium">{lesson.studentName || 'Unknown Student'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Course</p>
                  <p className="font-medium">{lesson.courseCode || 'Unknown Course'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Duration</p>
                  <p className="font-medium">{lesson.duration || 60} minutes</p>
                </div>
              </div>
            </div>
            
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-gray-700 font-medium">Lesson Notes</label>
                {/* <span className="text-sm text-gray-500 italic">Minimum 15 words required</span> */}
              </div>
              <textarea
                className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                rows={5}
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                placeholder="Provide details about what was covered in the lesson, student progress, and any next steps or recommendations."
                disabled={isProcessing}
              />
              <p className={`mt-1 text-sm ${countWords(completionNotes) < 15 ? 'text-red-600' : 'text-gray-500'}`}>
                {countWords(completionNotes)}/15 words minimum
              </p>
            </div>
            
            <div className="mb-6">
              <label className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  checked={confirmCompletion}
                  onChange={() => setConfirmCompletion(!confirmCompletion)}
                  className="mt-1 h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  disabled={isProcessing}
                />
                <span className="text-gray-700">
                  I completed a 1 hour lesson with {lesson.studentName || 'the student'} on {formatLessonDateTime()}. 
                  I confirm that the lesson details are accurate and I authorize SwampTutors to charge{' '}
                  {lesson.studentName || 'the student'} ${lesson.tutorRate || 50} for this lesson.
                </span>
              </label>
            </div>
          </div>
          
          <div className="bg-gray-50 p-4 flex justify-end space-x-3 rounded-b-lg border-t">
            <button
              onClick={() => setIsCompletingLesson(false)}
              className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors font-medium"
              disabled={isProcessing}
            >
              Cancel
            </button>
            <button
              onClick={handleCompleteLesson}
              className={`px-4 py-2 bg-orange-400 text-white rounded-md hover:bg-orange-500 transition-colors flex items-center font-medium ${isProcessing ? 'opacity-70 cursor-not-allowed' : ''}`}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing Payment...
                </>
              ) : (
                'Submit Notes'
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render cancellation form
  if (isCancellingLesson) {
    // Forms always render in full mode regardless of compact setting
    return (
      <div className={`${compact ? 'fixed inset-0 bg-opacity-30 backdrop-blur-sm flex items-center justify-center z-50' : 'p-4 border-t bg-gray-50'}`}>
        <div className={`${compact ? 'bg-white p-4 rounded-lg shadow-lg max-w-lg w-full mx-4' : 'w-full'}`}>
          <h3 className="font-medium mb-2">Cancel Lesson</h3>
          {error && <p className="text-red-600 mb-2">{error}</p>}
          <div className="mb-3">
            <label className="block text-gray-700 mb-1">Reason for Cancellation</label>
            <textarea
              className="w-full border rounded p-2"
              rows={3}
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
              placeholder="Please provide a reason for cancelling this lesson"
            />
          </div>
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setIsCancellingLesson(false)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors font-medium"
            >
              Go Back
            </button>
            <button
              onClick={handleCancelLesson}
              className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors font-medium"
            >
              Confirm Cancellation
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Display success message if present
  if (successMessage) {
    if (compact) {
      return <span className="text-xs text-green-600 px-2 py-1">{successMessage}</span>;
    }
    return (
      <div className="p-4 border-t bg-green-50">
        <p className="text-green-700">{successMessage}</p>
      </div>
    );
  }

  // Check if the lesson is past and needs completion
  const isPastAndNeedsCompletion = isLessonPast() && (lesson.status === 'scheduled' || lesson.status === 'rescheduled');

  // Show "Complete" button only if:
  // 1. The lesson is in the "awaiting" tab, OR
  // 2. The lesson has been detected as past (end time) and needs completion
  const shouldShowCompleteButton = activeTab === "awaiting" || isPastAndNeedsCompletion;

  // Render action buttons - compact or regular mode
  if (compact) {
    return (
      <div className="flex flex-col space-y-1">
        {shouldShowCompleteButton ? (
          <button
            onClick={() => setIsCompletingLesson(true)}
            className="px-4 py-2 text-xs bg-orange-400 text-white rounded hover:bg-orange-500 transition-colors font-medium"
          >
            Submit Notes
          </button>
        ) : (
          <>
            {canCancel === true && (
              <button
                onClick={() => setIsCancellingLesson(true)}
                className="px-4 py-2 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors font-medium"
              >
                Cancel
              </button>
            )}
            {canCancel === false && (
              <button
                disabled
                className="px-4 py-2 text-xs bg-gray-100 text-gray-400 rounded cursor-not-allowed font-medium"
                title="Lessons can only be cancelled 24+ hours in advance"
              >
                Cancel
              </button>
            )}
            {canCancel === null && (
              <div className="h-10 flex items-center">
                <span className="text-xs text-gray-500">Loading...</span>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  // Regular (non-compact) mode
  return (
    <div className="p-4 border-t bg-gray-50 flex justify-end space-x-3">
      {shouldShowCompleteButton ? (
        <button
          onClick={() => setIsCompletingLesson(true)}
          className="px-4 py-2 bg-orange-400 text-white rounded-md hover:bg-orange-500 transition-colors font-medium"
        >
          Submit Lesson Notes
        </button>
      ) : (
        <>
          {canCancel === true && (
            <button
              onClick={() => setIsCancellingLesson(true)}
              className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors font-medium"
            >
              Cancel Lesson
            </button>
          )}
          {canCancel === false && (
            <button
              disabled
              className="px-4 py-2 bg-gray-100 text-gray-400 rounded-md cursor-not-allowed font-medium"
              title="Lessons can only be cancelled 24+ hours in advance"
            >
              Cancel Lesson
            </button>
          )}
          {canCancel === null && (
            <div className="h-10 flex items-center">
              <span className="text-sm text-gray-500">Checking cancellation policy...</span>
            </div>
          )}
        </>
      )}
    </div>
  );
} 