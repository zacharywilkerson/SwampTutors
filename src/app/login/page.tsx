"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import AuthLayout from "../../components/AuthLayout";
import { signIn, signInWithGoogle } from "../../firebase";
import { useAuth } from "../../hooks/useAuth";

export default function Login() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get('returnUrl');
  const { user, userRole, loading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  // Move redirection logic to useEffect
  useEffect(() => {
    // Only redirect if we're not in a loading state and have a user with a role
    if (!loading && user && userRole) {
      console.log("Login page: Ready to redirect. User role:", userRole);
      
      // Small timeout to ensure state is fully updated
      const timer = setTimeout(() => {
        if (returnUrl) {
          // Redirect to the return URL if provided
          router.push(returnUrl);
        } else if (userRole === "tutor") {
          router.push("/tutor/dashboard");
        } else if (userRole === "student") {
          router.push("/student/dashboard");
        } else if (userRole === "admin") {
          router.push("/admin/dashboard");
        }
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [user, userRole, loading, router, returnUrl]);

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

    try {
      await signIn(formData.email, formData.password);
      // Redirect will happen automatically based on the useAuth hook
    } catch (error: any) {
      console.error("Login error:", error);
      setError(error.message || "Invalid email or password");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setIsLoading(true);

    try {
      const result = await signInWithGoogle();
      // Check if the user needs to select a role
      if (result && 'needsRoleSelection' in result && result.needsRoleSelection) {
        router.push('/select-role');
      }
      // Otherwise, redirect will happen automatically based on the useAuth hook
    } catch (error: any) {
      console.error("Google sign-in error:", error);
      setError(error.message || "An error occurred during sign in");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout title="Sign in to SwampTutors" subtitle="Access your account">
      <div className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
            {error}
          </div>
        )}

        {/* Email/Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
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
            <div className="text-right mt-1">
              <Link href="/forgot-password" className="text-sm text-blue-600 hover:text-blue-500">
                Forgot password?
              </Link>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Signing in..." : "Sign in with Email"}
          </button>
        </form>

        {/* Google Sign-in Button */}
        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or sign in with</span>
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
              Sign in with Google
            </button>
          </div>
        </div>

        <div className="text-center text-sm text-gray-500">
          <p className="mt-2">
            Don&apos;t have an account?{" "}
            <Link href="/student/register" className="text-blue-600 hover:text-blue-500">
              Register as Student
            </Link>
            {" | "}
            <Link href="/tutor/register" className="text-blue-600 hover:text-blue-500">
              Register as Tutor
            </Link>
          </p>
        </div>

        <div className="text-center text-sm text-gray-500">
          <p>
            By continuing, you agree to our{" "}
            <Link href="/terms" className="text-blue-600 hover:text-blue-500">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-blue-600 hover:text-blue-500">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </AuthLayout>
  );
} 