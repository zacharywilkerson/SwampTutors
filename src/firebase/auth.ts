import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  getAdditionalUserInfo
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from './config';

// Google Authentication
export const signInWithGoogle = async (role?: 'tutor' | 'student') => {
  try {
    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(auth, provider);
    const user = userCredential.user;
    const additionalInfo = getAdditionalUserInfo(userCredential);
    
    // Check if the user document exists first
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    
    // If user is new or document doesn't exist
    if (additionalInfo?.isNewUser || !userDoc.exists()) {
      // If role is not provided, we'll redirect to role selection page
      // The role selection will be handled in the UI
      if (!role) {
        // We'll return the user and let the UI handle redirecting to role selection
        return { user, needsRoleSelection: true };
      }
      
      // If role is provided, we can create the user document
      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        displayName: user.displayName,
        role,
        profilePictureUrl: user.photoURL || '',
        createdAt: new Date(),
      });

      // If user is a tutor, create additional tutor document
      if (role === 'tutor') {
        await setDoc(doc(db, 'tutors', user.uid), {
          bio: '',
          transcriptUrl: '',
          resumeUrl: '',
          coursesTaught: [],
          approvedCourses: [],
          pendingCourses: [],
          rating: 0,
          hourlyRate: 65,
          availability: [],
          profileStatus: 'incomplete'
        });
      }
    }

    return user;
  } catch (error) {
    console.error('Error signing in with Google:', error);
    throw error;
  }
};

// Sign up with email and password
export const signUp = async (email: string, password: string, displayName: string, role: 'tutor' | 'student' | 'admin') => {
  try {
    // Create user with email and password
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Update profile with display name
    await updateProfile(user, { displayName });

    // Create user document in Firestore
    await setDoc(doc(db, 'users', user.uid), {
      email,
      displayName,
      role,
      profilePictureUrl: '',
      createdAt: new Date(),
    });

    // If user is a tutor, create additional tutor document
    if (role === 'tutor') {
      await setDoc(doc(db, 'tutors', user.uid), {
        bio: '',
        transcriptUrl: '',
        resumeUrl: '',
        coursesTaught: [],
        approvedCourses: [],
        pendingCourses: [],
        rating: 0,
        hourlyRate: 65,
        availability: [],
        profileStatus: 'incomplete'
      });
    }

    return user;
  } catch (error) {
    console.error('Error signing up:', error);
    throw error;
  }
};

// Sign in with email and password
export const signIn = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error('Error signing in:', error);
    throw error;
  }
};

// Sign out
export const logOut = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
}; 