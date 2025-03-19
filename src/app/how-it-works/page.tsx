"use client";

import Link from "next/link";
import Image from "next/image";
import Footer from "@/components/Footer";

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-800 to-blue-900 text-white py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">How SwampTutors Works</h1>
            <p className="text-xl mb-4">
              Our platform makes it easy to connect with qualified tutors
            </p>
          </div>
        </div>
      </section>

      {/* Overview Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold mb-6 text-center">The SwampTutors Process</h2>
            <p className="text-lg text-gray-700 mb-8 text-center">
              Our platform connects students with experienced tutors who understand the 
              specific requirements and challenges of University of Florida courses.
            </p>

            <div className="flex flex-col md:flex-row justify-center items-center gap-8 mb-12">
              <div className="bg-blue-50 p-6 rounded-xl shadow-sm flex-1">
                <h3 className="text-xl font-bold text-blue-800 mb-3">For Students</h3>
                <p className="text-gray-700">
                  Find help with challenging courses, prepare for exams, and improve your understanding
                  with personalized tutoring sessions.
                </p>
              </div>
              <div className="bg-blue-50 p-6 rounded-xl shadow-sm flex-1">
                <h3 className="text-xl font-bold text-blue-800 mb-3">For Tutors</h3>
                <p className="text-gray-700">
                  Share your knowledge, build your teaching experience, and earn income by helping
                  fellow students succeed in courses you've mastered.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Step-by-Step Process */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold mb-12 text-center">Step-by-Step Process</h2>
            
            {/* For Students */}
            <div className="mb-16">
              <h3 className="text-2xl font-bold text-blue-800 mb-6 text-center">
                For Students: Finding and Booking a Tutor
              </h3>
              
              <div className="space-y-12">
                {/* Step 1 */}
                <div className="flex flex-col md:flex-row gap-6 items-center">
                  <div className="bg-blue-600 text-white rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold shadow-md flex-shrink-0">1</div>
                  <div className="flex-1">
                    <h4 className="text-xl font-bold mb-2">Search for Tutors</h4>
                    <p className="text-gray-700 mb-4">
                      Start by searching for your specific course code (e.g., "MAC2311" or "Physics") on our homepage. 
                      You can also filter by department to narrow down your search.
                    </p>
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                      <p className="text-sm text-gray-600 italic">
                        <strong>Tip:</strong> We have tutors for most UF courses, with special focus on STEM subjects, 
                        business courses, and other challenging areas.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex flex-col md:flex-row gap-6 items-center">
                  <div className="bg-blue-600 text-white rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold shadow-md flex-shrink-0">2</div>
                  <div className="flex-1">
                    <h4 className="text-xl font-bold mb-2">Select a Tutor</h4>
                    <p className="text-gray-700 mb-4">
                      Browse through available tutors, comparing their experience, ratings, hourly rates, and 
                      availability. Click on a tutor's profile to learn more about their background and expertise.
                    </p>
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                      <p className="text-sm text-gray-600 italic">
                        <strong>Note:</strong> All our tutors are verified and have demonstrated proficiency 
                        in the courses they teach. Many are current UF students or alumni who have excelled in these courses.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex flex-col md:flex-row gap-6 items-center">
                  <div className="bg-blue-600 text-white rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold shadow-md flex-shrink-0">3</div>
                  <div className="flex-1">
                    <h4 className="text-xl font-bold mb-2">Select a Time</h4>
                    <p className="text-gray-700 mb-4">
                      On the tutor's profile, select your course from their list of approved courses.
                      Then, use our calendar interface to choose an available date and time for your session.
                      Sessions are one hour long.
                    </p>
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                      <p className="text-sm text-gray-600 italic">
                        <strong>Important:</strong> Time slots are not reserved, so it is important to book right away. If you take too long to complete the booking process, 
                        the slot may be taken by another student.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="flex flex-col md:flex-row gap-6 items-center">
                  <div className="bg-blue-600 text-white rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold shadow-md flex-shrink-0">4</div>
                  <div className="flex-1">
                    <h4 className="text-xl font-bold mb-2">Payment Authorization</h4>
                    <p className="text-gray-700 mb-4">
                      After selecting a time, you'll be directed to our secure payment page where you'll enter your
                      payment information. Your card will be authorized but <strong>not charged</strong> until after 
                      the session is completed.
                    </p>
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                      <p className="text-sm text-gray-600 italic">
                        <strong>About Payment:</strong> We use Stripe to securely process payments. Your payment details 
                        are never stored on our servers. You will only be charged after the lesson is completed.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Step 5 */}
                <div className="flex flex-col md:flex-row gap-6 items-center">
                  <div className="bg-blue-600 text-white rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold shadow-md flex-shrink-0">5</div>
                  <div className="flex-1">
                    <h4 className="text-xl font-bold mb-2">Lesson Confirmation</h4>
                    <p className="text-gray-700 mb-4">
                      If the timeslot you chose is still available after payment authorization, the selected time will be confirmed. If the timeslot is no longer available, 
                      you will need to select a different time.
                    </p>
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                      <p className="text-sm text-gray-600 italic">
                        <strong>Important:</strong> Payment information is only charged after a lesson is completed. Therefore, for scenarios where the timeslot is no longer available, 
                        you will never be charged.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Step 6 */}
                <div className="flex flex-col md:flex-row gap-6 items-center">
                  <div className="bg-blue-600 text-white rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold shadow-md flex-shrink-0">6</div>
                  <div className="flex-1">
                    <h4 className="text-xl font-bold mb-2">Attend Your Session</h4>
                    <p className="text-gray-700 mb-4">
                      Once your booking is confirmed, you'll receive all session details on your Dashboard.
                      Meet with your tutor at the scheduled time online.
                    </p>
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                      <p className="text-sm text-gray-600 italic">
                        <strong>Communication:</strong> You can add notes or questions for your tutor when booking 
                        to help them prepare for your specific needs.
                      </p>
                    </div>
                  </div>
                </div>

                {/* NEW Cancellation/Rescheduling Policy Section */}
                <div className="flex flex-col md:flex-row gap-6 items-center mt-8 mb-8 bg-blue-50 p-6 rounded-lg border border-blue-200">
                  <div className="flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-14 w-14 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-xl font-bold mb-2 text-blue-800">24-Hour Cancellation & Rescheduling Policy</h4>
                    <p className="text-gray-700 mb-3">
                      To ensure reliability and fairness for both students and tutors, we maintain a 24-hour policy for cancellations and rescheduling:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-gray-700 mb-3">
                      <li><strong>For Students:</strong> You may reschedule a lesson up to 24 hours before the scheduled start time. Within the 24-hour window, rescheduling is not available.</li>
                      <li><strong>For Tutors:</strong> You may cancel a lesson up to 24 hours before the scheduled start time. Within the 24-hour window, cancellation is not available.</li>
                    </ul>
                    <p className="text-gray-700">
                      This policy helps maintain scheduling integrity and respects everyone's time commitments. Tutors rely on confirmed appointments for their income, while students need dependable academic support.
                    </p>
                  </div>
                </div>

                {/* Step 7 */}
                <div className="flex flex-col md:flex-row gap-6 items-center">
                  <div className="bg-blue-600 text-white rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold shadow-md flex-shrink-0">7</div>
                  <div className="flex-1">
                    <h4 className="text-xl font-bold mb-2">Post-Session</h4>
                    <p className="text-gray-700 mb-4">
                      After your session, your payment will be processed. You'll be invited to leave a review 
                      about your experience, which helps other students and rewards great tutors.
                    </p>
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                      <p className="text-sm text-gray-600 italic">
                        <strong>Satisfaction Guarantee:</strong> If you're not satisfied with your session, 
                        please contact us within 24 hours, and we'll work to resolve the issue.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* For Tutors */}
            <div className="mb-16">
              <h3 className="text-2xl font-bold text-blue-800 mb-6 text-center">
                For Tutors: Sharing Your Expertise
              </h3>
              
              <div className="space-y-12">
                {/* Step 1 */}
                <div className="flex flex-col md:flex-row gap-6 items-center">
                  <div className="bg-orange-500 text-white rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold shadow-md flex-shrink-0">1</div>
                  <div className="flex-1">
                    <h4 className="text-xl font-bold mb-2">Sign Up as a Tutor</h4>
                    <p className="text-gray-700 mb-4">
                      Create your tutor account and complete your profile with your academic background, 
                      areas of expertise, and the UF courses you can tutor.
                    </p>
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                      <p className="text-sm text-gray-600 italic">
                        <strong>Requirements:</strong> To become a tutor, you must have proven proficiency 
                        in the courses you wish to teach, such as having earned an A or B in those courses.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex flex-col md:flex-row gap-6 items-center">
                  <div className="bg-orange-500 text-white rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold shadow-md flex-shrink-0">2</div>
                  <div className="flex-1">
                    <h4 className="text-xl font-bold mb-2">Profile Verification</h4>
                    <p className="text-gray-700 mb-4">
                      Our team will review your profile and verify your qualifications for the courses 
                      you've selected. Once approved, your profile will be visible to students searching for tutors.
                    </p>
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                      <p className="text-sm text-gray-600 italic">
                        <strong>Timing:</strong> Profile verification typically takes 1-2 business days. 
                        You'll receive an email notification once approved.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex flex-col md:flex-row gap-6 items-center">
                  <div className="bg-orange-500 text-white rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold shadow-md flex-shrink-0">3</div>
                  <div className="flex-1">
                    <h4 className="text-xl font-bold mb-2">Manage Your Availability</h4>
                    <p className="text-gray-700 mb-4">
                      Set your availability in our system so students can see when you're free to tutor.
                      You have complete control over your schedule and can update it at any time.
                    </p>
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                      <p className="text-sm text-gray-600 italic">
                        <strong>Flexibility:</strong> You decide when and how much you want to tutor.
                        You can block off times when you're unavailable or open up more slots during busy periods.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="flex flex-col md:flex-row gap-6 items-center">
                  <div className="bg-orange-500 text-white rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold shadow-md flex-shrink-0">4</div>
                  <div className="flex-1">
                    <h4 className="text-xl font-bold mb-2">Receive Bookings</h4>
                    <p className="text-gray-700 mb-4">
                      Students will book sessions directly through your profile based on your availability.
                      You'll receive notifications for new bookings and can view all scheduled sessions in your dashboard.
                    </p>
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                      <p className="text-sm text-gray-600 italic">
                        <strong>Automatic:</strong> Once a student books and authorizes payment for a time slot,
                        the session is automatically confirmed on your calendar. Make sure to check your calendar regularly to avoid missing sessions and keep your calendar up to date.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Step 5 */}
                <div className="flex flex-col md:flex-row gap-6 items-center">
                  <div className="bg-orange-500 text-white rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold shadow-md flex-shrink-0">5</div>
                  <div className="flex-1">
                    <h4 className="text-xl font-bold mb-2">Conduct Tutoring Sessions</h4>
                    <p className="text-gray-700 mb-4">
                      Meet with your students at the scheduled time online.
                    </p>
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                      <p className="text-sm text-gray-600 italic">
                        <strong>Best Practices:</strong> We recommend preparing for each session based on the student's
                        notes and questions. Good preparation leads to better reviews and repeat bookings.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Step 6 */}
                <div className="flex flex-col md:flex-row gap-6 items-center">
                  <div className="bg-orange-500 text-white rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold shadow-md flex-shrink-0">6</div>
                  <div className="flex-1">
                    <h4 className="text-xl font-bold mb-2">Get Paid</h4>
                    <p className="text-gray-700 mb-4">
                      After each completed session, the student's payment is processed. You'll receive your earnings
                      biweekly directly through our secure payment system.
                    </p>
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                      <p className="text-sm text-gray-600 italic">
                        <strong>Payment Schedule:</strong> Payments are processed via ACH on roughly the 1st and 15th of each month for payments that were completed (which requires lesson notes) in the past two weeks. 
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Payment and Booking Details */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold mb-8 text-center">Payment & Booking Details</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
              <div className="bg-blue-50 p-6 rounded-lg shadow-sm">
                <h3 className="text-xl font-bold text-blue-800 mb-4">How Payment Works</h3>
                <ul className="space-y-3">
                  <li className="flex gap-2">
                    <span className="text-blue-600 font-bold">•</span>
                    <span className="text-gray-700">Payments are authorized at booking but only charged after the session is completed</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-blue-600 font-bold">•</span>
                    <span className="text-gray-700">We use Stripe for secure payment processing</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-blue-600 font-bold">•</span>
                    <span className="text-gray-700">All major credit and debit cards are accepted</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-blue-600 font-bold">•</span>
                    <span className="text-gray-700">No hidden fees or platform charges - you pay exactly the tutor's hourly rate</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-blue-600 font-bold">•</span>
                    <span className="text-gray-700">Receipts are automatically emailed after payment processing</span>
                  </li>
                </ul>
              </div>
              
              <div className="bg-blue-50 p-6 rounded-lg shadow-sm">
                <h3 className="text-xl font-bold text-blue-800 mb-4">Scheduling Policies</h3>
                <ul className="space-y-3">
                  <li className="flex gap-2">
                    <span className="text-blue-600 font-bold">•</span>
                    <span className="text-gray-700">Sessions are 1 hour (60 minutes) long</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-blue-600 font-bold">•</span>
                    <span className="text-gray-700">Cancellations must be made at least 24 hours in advance</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-blue-600 font-bold">•</span>
                    <span className="text-gray-700">No-shows will incur the full authorized lesson amount</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-blue-600 font-bold">•</span>
                    <span className="text-gray-700">Rescheduling is available if done 24 hours before the session</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Lesson Structure */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold mb-8 text-center">Tutoring Session Structure</h2>
            
            <div className="bg-white p-8 rounded-lg shadow-sm mb-12">
              <h3 className="text-xl font-bold text-blue-800 mb-4">What to Expect in a Session</h3>

              <p className="text-gray-700 mb-4">Keep in mind that the structure of each session may vary based on the tutor's style and the student's needs.</p>
              
              <ol className="space-y-6">
                <li className="flex gap-4">
                  <div className="bg-blue-100 text-blue-800 rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">1</div>
                  <div>
                    <h4 className="font-bold mb-1">Introduction and Goal Setting</h4>
                    <p className="text-gray-700">
                      Your tutor may begin by discussing your specific needs and what you hope to accomplish during the session.
                    </p>
                  </div>
                </li>
                
                <li className="flex gap-4">
                  <div className="bg-blue-100 text-blue-800 rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">2</div>
                  <div>
                    <h4 className="font-bold mb-1">Concept Review</h4>
                    <p className="text-gray-700">
                      Your tutor may explain difficult concepts, clarify confusing material, and provide examples to enhance understanding.
                    </p>
                  </div>
                </li>
                
                <li className="flex gap-4">
                  <div className="bg-blue-100 text-blue-800 rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">3</div>
                  <div>
                    <h4 className="font-bold mb-1">Problem Solving Practice</h4>
                    <p className="text-gray-700">
                      Work through examples, homework problems, or practice exercises with guidance from your tutor.
                    </p>
                  </div>
                </li>
                
                <li className="flex gap-4">
                  <div className="bg-blue-100 text-blue-800 rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">4</div>
                  <div>
                    <h4 className="font-bold mb-1">Questions and Discussion</h4>
                    <p className="text-gray-700">
                      Ask questions and get personalized explanations tailored to your learning style.
                    </p>
                  </div>
                </li>
                
                <li className="flex gap-4">
                  <div className="bg-blue-100 text-blue-800 rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">5</div>
                  <div>
                    <h4 className="font-bold mb-1">Session Recap</h4>
                    <p className="text-gray-700">
                      Your tutor may summarize what was covered and may suggest study strategies or resources for further practice.
                    </p>
                  </div>
                </li>
              </ol>
            </div>
            
            <div className="bg-blue-600 text-white p-6 rounded-lg">
              <h3 className="text-xl font-bold mb-4 text-center">Types of Tutoring Support</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-blue-700 bg-opacity-50 rounded-lg">
                  <h4 className="font-bold mb-2">Homework Help</h4>
                  <p className="text-sm">Get assistance with assignments and problem sets</p>
                </div>
                <div className="p-4 bg-blue-700 bg-opacity-50 rounded-lg">
                  <h4 className="font-bold mb-2">Exam Preparation</h4>
                  <p className="text-sm">Review key concepts and practice with sample questions</p>
                </div>
                <div className="p-4 bg-blue-700 bg-opacity-50 rounded-lg">
                  <h4 className="font-bold mb-2">Concept Clarification</h4>
                  <p className="text-sm">Deep dive into challenging topics for better understanding</p>
                </div>
                <div className="p-4 bg-blue-700 bg-opacity-50 rounded-lg">
                  <h4 className="font-bold mb-2">Project Guidance</h4>
                  <p className="text-sm">Get direction on course projects and research papers</p>
                </div>
                <div className="p-4 bg-blue-700 bg-opacity-50 rounded-lg">
                  <h4 className="font-bold mb-2">Study Skills</h4>
                  <p className="text-sm">Learn effective studying techniques for your courses</p>
                </div>
                <div className="p-4 bg-blue-700 bg-opacity-50 rounded-lg">
                  <h4 className="font-bold mb-2">Ongoing Support</h4>
                  <p className="text-sm">Regular sessions to stay on track throughout the semester</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold mb-8 text-center">Frequently Asked Questions</h2>
            
            <div className="space-y-4">
              {/* FAQ Item 1 */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="font-bold text-lg mb-2">How much do tutoring sessions cost?</h3>
                <p className="text-gray-700">
                  Tutoring rates vary by tutor. Each tutor sets their own rate, which is clearly displayed on their profile. There are no additional platform fees.
                </p>
              </div>
              
              {/* FAQ Item 2 */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="font-bold text-lg mb-2">When am I charged for a session?</h3>
                <p className="text-gray-700">
                  Your payment method is authorized when you book, but you're only charged after 
                  the session is completed. This ensures you only pay for services you've received.
                </p>
              </div>
              
              {/* FAQ Item 3 */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="font-bold text-lg mb-2">How do online tutoring sessions work?</h3>
                <p className="text-gray-700">
                  Online sessions are conducted through video conferencing platforms like Zoom or Google Meet. Your tutor 
                  will provide a meeting link before your scheduled session (which can be found on your dashboard). You'll need a computer with 
                  internet access, a microphone, and ideally a webcam.
                </p>
              </div>
              
              {/* FAQ Item 4 */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="font-bold text-lg mb-2">What if I need to cancel a session?</h3>
                <p className="text-gray-700">
                  You can cancel a session through your dashboard at least 24 hours before the scheduled time 
                  without any penalty. Late cancellations are not allowed, and no-shows will be charged the full lesson amount as tutors have reserved that time for you.
                </p>
              </div>
              
              {/* FAQ Item 5 */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="font-bold text-lg mb-2">How are tutors vetted?</h3>
                <p className="text-gray-700">
                  Our tutors go through a verification process where we review their academic qualifications 
                  and expertise in the courses they wish to teach. We prioritize tutors who have demonstrated 
                  excellence in these courses, typically with grades of A or B.
                </p>
              </div>
              
              {/* FAQ Item 6 */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="font-bold text-lg mb-2">Can I request a specific tutor?</h3>
                <p className="text-gray-700">
                  Yes! You can book directly with a specific tutor by visiting their profile and selecting 
                  an available time slot. You can also rebook with tutors you've worked with before through your dashboard.
                </p>
              </div>
            </div>
            
            <div className="mt-8 text-center">
              <p className="text-gray-700 mb-4">
                Have more questions? We're here to help!
              </p>
              <Link href="/contact" className="inline-block bg-blue-600 text-white py-3 px-6 rounded-md hover:bg-blue-700 transition-colors">
                Contact Support
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Call-to-Action */}
      <section className="py-16 bg-gradient-to-r from-blue-800 to-blue-900 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to Get Started?</h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            Join SwampTutors today and connect with experienced tutors who understand your UF courses
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/tutor/register" className="bg-white text-blue-900 hover:bg-gray-100 px-8 py-4 rounded-md font-bold shadow-md">
              Become a Tutor
            </Link>
            <Link href="/student/register" className="bg-orange-500 text-white hover:bg-orange-600 px-8 py-4 rounded-md font-bold shadow-md">
              Find a Tutor
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
} 