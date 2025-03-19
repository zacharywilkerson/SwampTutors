"use client";

import { useState } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { useTutorRedirect } from '../../../hooks/useTutorRedirect';
import WeeklyAvailability from '../../../components/WeeklyAvailability';
import CalendarAvailability from '../../../components/CalendarAvailability';

export default function TutorAvailability() {
  const { user, loading: authLoading } = useAuth();
  const { isLoading: redirectLoading, hasCheckedStatus } = useTutorRedirect(['/tutor/profile-setup', '/tutor/profile-pending']);
  
  const [activeTab, setActiveTab] = useState<'general' | 'calendar'>('general');
  
  const loading = authLoading || redirectLoading || !hasCheckedStatus;
  
  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-lg">Loading...</p>
          </div>
        </div>
      </div>
    );
  }
  
  if (!user) {
    return (
      <div className="container mx-auto p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>You must be logged in to view this page.</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-4">
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h1 className="text-3xl font-bold mb-6">Manage Your Availability</h1>
        
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <div className="flex -mb-px">
              <button
                className={`mr-2 py-2 px-4 font-medium text-sm ${
                  activeTab === 'general'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setActiveTab('general')}
              >
                General Availability
              </button>
              <button
                className={`mr-2 py-2 px-4 font-medium text-sm ${
                  activeTab === 'calendar'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setActiveTab('calendar')}
              >
                Calendar View
              </button>
            </div>
          </div>
        </div>
        
        {activeTab === 'general' && (
          <WeeklyAvailability tutorId={user.uid} />
        )}
        
        {activeTab === 'calendar' && (
          <CalendarAvailability tutorId={user.uid} />
        )}
      </div>
    </div>
  );
} 