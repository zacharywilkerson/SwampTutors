"use client";

import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-xl font-bold mb-4">SwampTutors</h3>
            <p className="text-gray-400 mb-4">Our platform connects University of Florida students with tutors familiar with their course requirements.</p>
            <p className="text-gray-400 text-sm">SwampTutors is not affiliated with, endorsed by, or sponsored by any university (including the University of Florida). This is an independent platform created to help students.</p>
          </div>
          <div>
            <h4 className="text-lg font-bold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li><Link href="/how-it-works" className="text-gray-400 hover:text-white">How It Works</Link></li>
              <li><Link href="/search" className="text-gray-400 hover:text-white">Find Tutors</Link></li>
              <li><Link href="/login" className="text-gray-400 hover:text-white">Become a Tutor</Link></li>
              <li><Link href="/contact" className="text-gray-400 hover:text-white">Contact</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-lg font-bold mb-4">Support</h4>
            <ul className="space-y-2">
              <li><Link href="/faq" className="text-gray-400 hover:text-white">FAQ</Link></li>
              <li><Link href="/privacy" className="text-gray-400 hover:text-white">Privacy Policy</Link></li>
              <li><Link href="/terms" className="text-gray-400 hover:text-white">Terms of Service</Link></li>
              <li><Link href="/help" className="text-gray-400 hover:text-white">Help Center</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
          <p>© {new Date().getFullYear()} SwampTutors. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
} 