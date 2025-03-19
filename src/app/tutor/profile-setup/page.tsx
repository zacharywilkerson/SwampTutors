"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function TutorProfileSetup() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the new signup flow starting point
    router.replace('/tutor/signup/how-it-works');
  }, [router]);

  // Show loading indicator while redirecting
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="flex flex-col items-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-600">Redirecting to tutor signup...</p>
      </div>
    </div>
  );
} 