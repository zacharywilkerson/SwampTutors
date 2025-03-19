import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "../hooks/useAuth";
import { StripeProvider } from "../context/StripeContext";
import Navbar from "../components/Navbar";
import PageTransition from "../components/PageTransition";
import { Suspense } from "react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SwampTutors",
  description: "A platform connecting university students with tutors",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          {/* Using updated StripeProvider that only initializes the Stripe instance, not Elements */}
          <StripeProvider>
            <Navbar />
            <Suspense fallback={<div className="min-h-screen flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>}>
              <PageTransition>
                {children}
              </PageTransition>
            </Suspense>
          </StripeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
