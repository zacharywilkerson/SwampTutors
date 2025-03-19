import { getApps, initializeApp, cert, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin if it hasn't been already
let adminApp: App;

if (getApps().length === 0) {
  // Initialize with default credentials in production or service account in dev
  if (process.env.FIREBASE_ADMIN_PRIVATE_KEY) {
    adminApp = initializeApp({
      credential: cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });
  } else {
    // Use application default credentials in production
    adminApp = initializeApp();
  }
} else {
  adminApp = getApps()[0];
}

// Initialize services
const adminAuth = getAuth(adminApp);
const adminDb = getFirestore(adminApp);

export { adminApp, adminAuth, adminDb }; 