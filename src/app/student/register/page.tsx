"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AuthLayout from "../../../components/AuthLayout";
import { signUp, signInWithGoogle } from "../../../firebase";
import ClientSearchParamsProvider from "../../../components/ClientSearchParamsProvider";

export default function StudentRegister() {
  return (
    <ClientSearchParamsProvider
      render={({ getParam }) => {
        return <StudentRegisterContent returnUrl={getParam('returnUrl')} />;
      }}
    />
  );
}

function StudentRegisterContent({ returnUrl }: { returnUrl: string | null }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    displayName: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    // Form validation
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      setIsLoading(false);
      return;
    }

    try {
      // Create the user with Firebase Auth
      await signUp(
        formData.email,
        formData.password,
        formData.displayName,
        "student"
      );

      // Redirect to return URL or dashboard
      if (returnUrl) {
        router.push(returnUrl);
      } else {
        router.push("/student/dashboard");
      }
    } catch (error: any) {
      console.error("Registration error:", error);
      setError(error.message || "An error occurred during registration");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setIsLoading(true);

    try {
      const result = await signInWithGoogle("student");
      // If successful and returnUrl exists, navigate there
      if (result && returnUrl) {
        router.push(returnUrl);
      }
      // Otherwise, the default redirect will happen automatically
    } catch (error: any) {
      console.error("Google sign-in error:", error);
      setError(error.message || "An error occurred during sign in");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout 
      title="Create Student Account" 
      subtitle="Find and book tutors for your courses"
    >
      <div className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
            {error}
          </div>
        )}

        {/* Email/Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <input
              id="displayName"
              name="displayName"
              type="text"
              required
              value={formData.displayName}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={formData.email}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              value={formData.password}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              value={formData.confirmPassword}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <button 
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Creating Account..." : "Create Account"}
            </button>
          </div>
        </form>

        {/* Google Sign Up */}
        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or sign up with</span>
            </div>
          </div>
          
          <div className="mt-4">
            <button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full flex items-center justify-center py-3 px-4 border border-gray-300 rounded-md shadow-sm bg-white hover:bg-gray-50 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <img 
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
                alt="Google logo" 
                className="h-5 w-5 mr-2" 
              />
              Sign up with Google
            </button>
          </div>
        </div>

        <div className="text-center text-sm">
          <p className="text-gray-600">
            Already have an account?{" "}
            <Link href={returnUrl ? `/login?returnUrl=${encodeURIComponent(returnUrl)}` : "/login"} className="text-blue-600 hover:text-blue-500">
              Log in
            </Link>
          </p>
        </div>

        {/* Link to tutor registration */}
        <div className="bg-blue-50 p-4 rounded-md">
          <p className="text-sm text-blue-800 mb-3">
            Are you a tutor looking to offer your services?
          </p>
          <Link 
            href="/tutor/register"
            className="inline-block w-full text-center py-2 px-4 border border-blue-500 rounded-md shadow-sm text-sm font-medium text-blue-700 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Sign up as a Tutor instead
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
} 