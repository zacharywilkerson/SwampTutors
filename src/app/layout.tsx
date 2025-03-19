import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "../hooks/useAuth";
import { StripeProvider } from "../context/StripeContext";
import Navbar from "../components/Navbar";
import PageTransition from "../components/PageTransition";

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
            <PageTransition>
              {children}
            </PageTransition>
          </StripeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
