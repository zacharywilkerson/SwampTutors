"use client";

import StepNavigation from '../components/StepNavigation';

export default function HowItWorksStep() {
  // Simple validation function that always returns true
  const validateStep = (): boolean => {
    return true; // Nothing to validate on this page
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">How SwampTutors Works</h2>
      <p className="text-gray-600 mb-6">
        Please review the information below to understand how our platform works and what to expect as a tutor.
      </p>

      <form onSubmit={(e) => e.preventDefault()} className="mb-6">
        <div className="space-y-8">
          {/* Finding Students */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
            <h3 className="text-lg font-semibold text-blue-900 flex items-center mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Finding Students
            </h3>
            <p className="text-blue-800 mb-2">
              Students can search for tutors by course, subject, or availability. Creating a complete profile with your expertise and schedule helps you get found.
            </p>
            <ul className="list-disc list-inside text-blue-700 space-y-1 ml-2">
              <li>Your profile will appear in search results for courses you've approved for</li>
              <li>Students can filter by availability, ratings, and price range</li>
              {/* <li>Maintaining a high rating helps you appear higher in search results</li> */}
            </ul>
          </div>

          {/* Scheduling and Bookings */}
          <div className="bg-green-50 rounded-lg p-4 border border-green-100">
            <h3 className="text-lg font-semibold text-green-900 flex items-center mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Scheduling and Bookings
            </h3>
            <p className="text-green-800 mb-2">
              Students can book tutoring sessions based on your available time slots. You'll receive notifications for new bookings.
            </p>
            <ul className="list-disc list-inside text-green-700 space-y-1 ml-2">
              <li>You can set your availability in your tutor dashboard</li>
              <li>Lessons are instantly booked and added to your calendar</li>
              <li>You'll receive reminder notifications before scheduled sessions</li>
            </ul>
          </div>

          {/* Payments and Fees */}
          <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
            <h3 className="text-lg font-semibold text-purple-900 flex items-center mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Payments and Fees
            </h3>
            <p className="text-purple-800 mb-2">
              SwampTutors handles all payments through our secure platform. You set your hourly rate (between $1-$120).
            </p>
            <ul className="list-disc list-inside text-purple-700 space-y-1 ml-2">
              <li>Payment is captured when students book a lesson</li>
              <li>SwampTutors takes a 20% service fee from each session payment to cover platform and transaction costs</li>
              <li>Payroll is processed roughly every first and fifteenth of the month and includes completed lessons from the previous two weeks</li>
              <li>Payment is transferred to your connected bank account (secure through Stripe))</li>
            </ul>
          </div>

          {/* Tutoring Standards */}
          <div className="bg-amber-50 rounded-lg p-4 border border-amber-100">
            <h3 className="text-lg font-semibold text-amber-900 flex items-center mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Tutoring Standards
            </h3>
            <p className="text-amber-800 mb-2">
              As a SwampTutors tutor, you're expected to maintain high quality standards in all your sessions.
            </p>
            <ul className="list-disc list-inside text-amber-700 space-y-1 ml-2">
              <li>Be on time for all scheduled sessions</li>
              <li>Come prepared with knowledge about the course material</li>
              <li>Provide clear explanations and helpful guidance</li>
              <li>Maintain academic integrity in all tutoring interactions</li>
              <li>Be respectful and professional with all students</li>
            </ul>
          </div>

          {/* Getting Support */}
          <div className="bg-red-50 rounded-lg p-4 border border-red-100">
            <h3 className="text-lg font-semibold text-red-900 flex items-center mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Getting Support
            </h3>
            <p className="text-red-800 mb-2">
              If you have any questions or encounter issues, our support team is here to help.
            </p>
            <ul className="list-disc list-inside text-red-700 space-y-1 ml-2">
              <li>Access help resources in your tutor dashboard</li>
              <li>Contact support through the help center</li>
              <li>Report any session issues through the platform</li>
              <li>Email support@swamptutors.com for urgent matters</li>
            </ul>
          </div>
        </div>
      </form>

      <StepNavigation 
        nextStep="/tutor/signup/subjects" 
        validateStep={validateStep}
      />
    </div>
  );
} 