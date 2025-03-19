'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../hooks/useAuth';
import { getPendingPayouts, approveLessonPayout } from '../../../firebase/firestore';

export default function AdminPayouts() {
  const router = useRouter();
  const { user, userRole, loading: authLoading } = useAuth();
  
  const [pendingPayouts, setPendingPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingPayouts, setProcessingPayouts] = useState<{[tutorId: string]: boolean}>({});
  const [selectedTutors, setSelectedTutors] = useState<{[tutorId: string]: boolean}>({});
  const [selectedLessons, setSelectedLessons] = useState<{[lessonId: string]: boolean}>({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Check auth and fetch pending payouts
  useEffect(() => {
    if (authLoading) return;
    
    if (!user || userRole !== 'admin') {
      router.push('/login');
      return;
    }
    
    // Fetch pending payouts
    const fetchPayouts = async () => {
      try {
        setLoading(true);
        const payouts = await getPendingPayouts();
        setPendingPayouts(payouts);
      } catch (error) {
        console.error('Error fetching payouts:', error);
        setError('Failed to load pending payouts. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchPayouts();
  }, [user, userRole, authLoading, router]);
  
  // Handle select all lessons for a tutor
  const handleSelectAllLessons = (tutorId: string, selected: boolean) => {
    const newSelectedTutors = {...selectedTutors, [tutorId]: selected};
    setSelectedTutors(newSelectedTutors);
    
    // Find all lessons for this tutor
    const tutor = pendingPayouts.find(p => p.tutorId === tutorId);
    if (!tutor) return;
    
    const newSelectedLessons = {...selectedLessons};
    
    tutor.lessons.forEach((lesson: any) => {
      newSelectedLessons[lesson.id] = selected;
    });
    
    setSelectedLessons(newSelectedLessons);
  };
  
  // Handle select individual lesson
  const handleSelectLesson = (lessonId: string, tutorId: string, selected: boolean) => {
    setSelectedLessons({...selectedLessons, [lessonId]: selected});
    
    // Check if all lessons for this tutor are selected
    const tutor = pendingPayouts.find(p => p.tutorId === tutorId);
    if (!tutor) return;
    
    const allLessonsSelected = tutor.lessons.every((lesson: any) => {
      return lessonId === lesson.id ? selected : selectedLessons[lesson.id];
    });
    
    setSelectedTutors({...selectedTutors, [tutorId]: allLessonsSelected});
  };
  
  // Process payouts for selected lessons
  const processPayouts = async () => {
    if (!user) return;
    
    try {
      setError('');
      setSuccess('');
      
      // Get selected lessons grouped by tutor
      const selectedTutorIds = Object.keys(selectedTutors).filter(id => selectedTutors[id]);
      
      if (selectedTutorIds.length === 0) {
        setError('Please select at least one tutor or lesson to process payouts');
        return;
      }
      
      // Process each tutor's payouts
      for (const tutorId of selectedTutorIds) {
        setProcessingPayouts(prev => ({...prev, [tutorId]: true}));
        
        const tutor = pendingPayouts.find(p => p.tutorId === tutorId);
        if (!tutor) continue;
        
        // Find which lessons are selected for this tutor
        const lessonsToProcess = tutor.lessons.filter((lesson: any) => selectedLessons[lesson.id]);
        
        if (lessonsToProcess.length === 0) continue;
        
        // Approve each lesson individually
        for (const lesson of lessonsToProcess) {
          await approveLessonPayout(lesson.id, user.uid);
        }
        
        // If tutor has a Stripe account, we can process the payout directly
        if (tutor.stripeAccountId) {
          // Calculate the total amount to pay out
          const totalAmount = lessonsToProcess.reduce((sum: number, lesson: any) => sum + (lesson.price || 0), 0);
          
          // Get lesson IDs for tracking
          const lessonIds = lessonsToProcess.map((lesson: any) => lesson.id);
          
          // Create the payout using the API
          const response = await fetch('/api/stripe/payout', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${await user.getIdToken()}`
            },
            body: JSON.stringify({
              amount: totalAmount,
              connect_account_id: tutor.stripeAccountId,
              lesson_ids: lessonIds
            })
          });
          
          const result = await response.json();
          
          if (result.error) {
            throw new Error(result.error);
          }
        }
        
        setProcessingPayouts(prev => ({...prev, [tutorId]: false}));
      }
      
      // Refresh the data
      const payouts = await getPendingPayouts();
      setPendingPayouts(payouts);
      
      // Clear selections
      setSelectedTutors({});
      setSelectedLessons({});
      
      setSuccess('Successfully approved selected payouts!');
    } catch (error) {
      console.error('Error processing payouts:', error);
      setError('Failed to process payouts. Please try again.');
    }
  };
  
  // Loading state
  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold mb-4">Tutor Payouts</h1>
          <div className="bg-white p-6 rounded-lg shadow">
            <p>Loading payouts data...</p>
          </div>
        </div>
      </div>
    );
  }
  
  // No payouts pending
  if (pendingPayouts.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold mb-4">Tutor Payouts</h1>
          <div className="bg-white p-6 rounded-lg shadow">
            <p>No pending payouts at this time.</p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Tutor Payouts</h1>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            {success}
          </div>
        )}
        
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Pending Payouts</h2>
            <button
              onClick={processPayouts}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Process Selected Payouts
            </button>
          </div>
          
          {pendingPayouts.map(tutor => (
            <div key={tutor.tutorId} className="border rounded-lg p-4 mb-4">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id={`tutor-${tutor.tutorId}`}
                    checked={!!selectedTutors[tutor.tutorId]}
                    onChange={(e) => handleSelectAllLessons(tutor.tutorId, e.target.checked)}
                    className="mr-2"
                  />
                  <label htmlFor={`tutor-${tutor.tutorId}`} className="font-semibold">
                    {tutor.tutorName}
                  </label>
                </div>
                <div>
                  <span className="text-gray-600">Total: ${(tutor.totalAmount / 100).toFixed(2)}</span>
                  {processingPayouts[tutor.tutorId] && (
                    <span className="ml-2 inline-block w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
                  )}
                </div>
              </div>
              
              <div className="ml-6">
                {!tutor.stripeAccountId && (
                  <div className="bg-yellow-100 text-yellow-800 p-2 rounded mb-2">
                    This tutor does not have a Stripe account set up for direct payouts.
                  </div>
                )}
                
                <table className="w-full mt-2">
                  <thead>
                    <tr className="text-left text-gray-600">
                      <th className="pb-2 w-8"></th>
                      <th className="pb-2">Lesson Date</th>
                      <th className="pb-2">Course</th>
                      <th className="pb-2">Student</th>
                      <th className="pb-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tutor.lessons.map((lesson: any) => (
                      <tr key={lesson.id} className="border-t">
                        <td className="py-2">
                          <input
                            type="checkbox"
                            id={`lesson-${lesson.id}`}
                            checked={!!selectedLessons[lesson.id]}
                            onChange={(e) => handleSelectLesson(lesson.id, tutor.tutorId, e.target.checked)}
                          />
                        </td>
                        <td className="py-2">
                          {new Date(
                            typeof lesson.date === 'object' && lesson.date.seconds 
                              ? lesson.date.seconds * 1000 
                              : lesson.date
                          ).toLocaleDateString()}
                        </td>
                        <td className="py-2">{lesson.courseCode || lesson.course}</td>
                        <td className="py-2">{lesson.studentName}</td>
                        <td className="py-2 text-right">${(lesson.price / 100).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 