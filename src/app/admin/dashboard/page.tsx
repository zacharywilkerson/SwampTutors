'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { collection, query, where, getDocs, deleteDoc, doc, getDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '../../../firebase/config';
import { useAuth } from '../../../hooks/useAuth';

export default function AdminDashboard() {
  const router = useRouter();
  const { user, userRole, loading: authLoading } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [isMigratingDates, setIsMigratingDates] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  useEffect(() => {
    // Redirect if not logged in or not an admin
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    
    // Check if user is an admin
    const checkAdmin = async () => {
      try {
        if (!user) return;
        
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.data();
        
        if (!userData || userData.role !== 'admin') {
          // Redirect non-admins
          router.push('/');
          return;
        }
        
        setLoading(false);
      } catch (error) {
        console.error("Error checking admin status:", error);
      } finally {
        setLoading(false);
      }
    };
    
    if (user) {
      checkAdmin();
    }
  }, [user, authLoading, router]);

  const migrateLessonDates = async () => {
    try {
      setIsMigratingDates(true);
      setMessage({ type: '', text: '' });
      
      // Call the Firebase function
      const functions = getFunctions();
      const migrateFunction = httpsCallable(functions, 'migrateLessonDates');
      
      const result = await migrateFunction({});
      const data = result.data as { success: boolean; message: string; count: number };
      
      if (data.success) {
        setMessage({ 
          type: 'success', 
          text: data.message
        });
      } else {
        throw new Error('Function returned false success status');
      }
    } catch (error) {
      console.error('Error migrating lesson dates:', error);
      setMessage({ 
        type: 'error', 
        text: 'An error occurred while migrating lesson dates. Please try again.'
      });
    } finally {
      setIsMigratingDates(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
          <div className="bg-white p-6 rounded-lg shadow">
            <p>Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
        
        {message.text && (
          <div className={`p-4 mb-6 rounded-lg ${
            message.type === 'success' ? 'bg-green-100 text-green-700' : 
            message.type === 'error' ? 'bg-red-100 text-red-700' : 
            'bg-blue-100 text-blue-700'
          }`}>
            {message.text}
          </div>
        )}
        
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold">Admin Tools</h2>
            <p className="text-gray-600 mt-1">
              Manage various aspects of the tutor marketplace.
            </p>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Link 
                href="/admin/tutor-review"
                className="block p-4 bg-blue-50 rounded-lg border border-blue-200 hover:bg-blue-100"
              >
                <h3 className="font-bold text-lg text-blue-800 mb-2">Tutor Review</h3>
                <p className="text-blue-600">Review and approve tutor profiles.</p>
              </Link>
              
              <Link 
                href="/admin/course-review"
                className="block p-4 bg-green-50 rounded-lg border border-green-200 hover:bg-green-100"
              >
                <h3 className="font-bold text-lg text-green-800 mb-2">Course Review</h3>
                <p className="text-green-600">Review and approve course requests.</p>
              </Link>
              
              <Link 
                href="/admin/payouts"
                className="block p-4 bg-purple-50 rounded-lg border border-purple-200 hover:bg-purple-100"
              >
                <h3 className="font-bold text-lg text-purple-800 mb-2">Tutor Payouts</h3>
                <p className="text-purple-600">Process payments to tutors.</p>
              </Link>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold">System Maintenance</h2>
            <p className="text-gray-600 mt-1">
              Perform system maintenance tasks.
            </p>
          </div>
          
          <div className="p-6">
            <div className="mb-6">
              <h3 className="font-bold text-lg mb-2">Date Format Migration</h3>
              <p className="mb-4">
                Convert all JavaScript Date objects to Firestore Timestamps in lesson records.
                This should fix any issues with the automatic cleanup not working.
              </p>
              <button
                onClick={migrateLessonDates}
                disabled={isMigratingDates}
                className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 disabled:bg-yellow-300 disabled:cursor-not-allowed"
              >
                {isMigratingDates ? 'Migrating Dates...' : 'Migrate Date Formats'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 