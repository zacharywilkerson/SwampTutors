import { 
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  addDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  orderBy,
  setDoc,
  limit,
  Timestamp,
  startAfter,
  DocumentReference,
  serverTimestamp,
  onSnapshot,
  deleteDoc
} from 'firebase/firestore';
import { db } from './config';
import { auth } from './config';
import { ALL_COURSES, getCourseById } from '../constants/courses';
import { 
  sendLessonScheduledNotification,
  sendLessonCompletedNotification,
  sendLessonCancelledNotification,
  sendLessonRescheduledNotification
} from './notifications';
import { convertToDate } from '../utils/dateUtils';

// Define TutorLesson type interface
interface TutorLesson {
  id: string;
  date: any; // Firebase Timestamp or Date
  studentId: string;
  studentName?: string;
  tutorId: string;
  status: string;
  course: string;
  location?: string;
  notes?: string;
  originalDate?: any; // For rescheduled lessons
  rescheduleDate?: any; // For rescheduled lessons
  paymentStatus?: string; // 'pending', 'paid', 'failed'
  paymentId?: string; // Stripe payment ID
  paymentAmount?: number; // Amount paid in cents
  paymentDate?: any; // Date payment was processed
  payoutStatus?: string; // 'pending', 'approved', 'paid'
  payoutId?: string; // Stripe payout ID
  payoutAmount?: number; // Amount paid to tutor in cents
  payoutDate?: any; // Date payout was processed
  payoutApprovedBy?: string; // Admin who approved the payout
  payoutApprovedDate?: any; // Date payout was approved
  [key: string]: any; // Allow other properties
}

// Helper function to parse time strings to numeric hours (for comparison)
const parseTimeToHours = (timeStr: string): number => {
  const [time, period] = timeStr.split(' ');
  let hours = parseInt(time);
  
  if (period === 'pm' && hours !== 12) {
    hours += 12;
  } else if (period === 'am' && hours === 12) {
    hours = 0;
  }
  
  return hours;
};

// Users
export const getUserById = async (userId: string) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    return userDoc.exists() ? userDoc.data() : null;
  } catch (error) {
    console.error('Error getting user:', error);
    throw error;
  }
};

// Courses - Now using constants file instead of Firebase
export const getAllCourses = async () => {
  // Return courses from constants file
  return ALL_COURSES.map(course => ({
    ...course // Removed duplicate id
  }));
};

export const getCourseByCode = async (courseCode: string) => {
  // Return course from constants file
  const course = getCourseById(courseCode);
  return course ? { ...course } : null; // Removed duplicate id
};

// Tutors
export const getTutorById = async (tutorId: string) => {
  try {
    const tutorDoc = await getDoc(doc(db, 'tutors', tutorId));
    if (tutorDoc.exists()) {
      try {
        // Try to get user data if permitted
        const userDoc = await getDoc(doc(db, 'users', tutorId));
        return {
          id: tutorDoc.id,
          ...tutorDoc.data(),
          ...(userDoc.exists() ? userDoc.data() : {})
        };
      } catch (error) {
        console.warn(`Error getting user data for tutor ${tutorId}, returning only tutor data:`, error);
        // If we can't access user data (e.g., for anonymous users), return just the tutor data
        return {
          id: tutorDoc.id,
          ...tutorDoc.data()
        };
      }
    }
    return null;
  } catch (error) {
    console.error('Error getting tutor:', error);
    throw error;
  }
};

export const getTutorsByCourse = async (courseCode: string) => {
  try {
    // Query for tutors who have this course in their approvedCourses array
    const tutorsQuery = query(
      collection(db, 'tutors'),
      where('approvedCourses', 'array-contains', courseCode),
      where('profileStatus', '==', 'approved')
    );
    const tutorsSnapshot = await getDocs(tutorsQuery);
    
    // Get user data for each tutor
    const tutorsWithUserData = await Promise.all(
      tutorsSnapshot.docs.map(async (tutorDoc) => {
        try {
          // For anonymous users, we'll only fetch user data if our security rules allow it
          const userDoc = await getDoc(doc(db, 'users', tutorDoc.id));
          return {
            id: tutorDoc.id,
            ...tutorDoc.data(),
            ...(userDoc.exists() ? userDoc.data() : {})
          };
        } catch (error) {
          console.warn(`Error getting user data for tutor ${tutorDoc.id}:`, error);
          // Return just the tutor data if we can't fetch user data
          return {
            id: tutorDoc.id,
            ...tutorDoc.data()
          };
        }
      })
    );
    
    return tutorsWithUserData;
  } catch (error) {
    console.error('Error getting tutors by course:', error);
    throw error;
  }
};

export const getTutorsByRating = async (minRating: number, limit_count = 10) => {
  try {
    // Check if the user is authenticated - if not, return empty array
    if (!auth.currentUser) {
      console.log('Cannot get tutors by rating: User not authenticated');
      return [];
    }
    
    const tutorsQuery = query(
      collection(db, 'tutors'),
      where('rating', '>=', minRating),
      where('profileStatus', '==', 'approved'),
      orderBy('rating', 'desc'),
      limit(limit_count)
    );
    
    const tutorsSnapshot = await getDocs(tutorsQuery);
    
    // Get user data for each tutor
    const tutorsWithUserData = await Promise.all(
      tutorsSnapshot.docs.map(async (tutorDoc) => {
        try {
          const userDoc = await getDoc(doc(db, 'users', tutorDoc.id));
          return {
            id: tutorDoc.id,
            ...tutorDoc.data(),
            ...(userDoc.exists() ? userDoc.data() : {})
          };
        } catch (error) {
          console.warn(`Error getting user data for tutor ${tutorDoc.id}:`, error);
          // Return tutor data without user data
          return {
            id: tutorDoc.id,
            ...tutorDoc.data()
          };
        }
      })
    );
    
    return tutorsWithUserData;
  } catch (error) {
    console.error('Error getting tutors by rating:', error);
    // Return empty array instead of throwing error
    return [];
  }
};

// Lessons
export const getLessonsByTutor = async (tutorId: string) => {
  try {
    const lessonsQuery = query(
      collection(db, 'lessons'),
      where('tutorId', '==', tutorId)
    );
    const lessonsSnapshot = await getDocs(lessonsQuery);
    return lessonsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting lessons by tutor:', error);
    throw error;
  }
};

export const getLessonsByStudent = async (studentId: string) => {
  try {
    const lessonsQuery = query(
      collection(db, 'lessons'),
      where('studentId', '==', studentId)
    );
    const lessonsSnapshot = await getDocs(lessonsQuery);
    return lessonsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting lessons by student:', error);
    throw error;
  }
};

export const createLesson = async (lessonData: {
  tutorId: string;
  studentId: string;
  courseCode: string;
  date: Date;
  duration: number;
  notes: string;
  price?: number; // Optional price in cents
}) => {
  try {
    console.log(`Creating lesson for tutorId=${lessonData.tutorId}, studentId=${lessonData.studentId}, date=${lessonData.date.toISOString()}`);
    
    // Generate a consistent ID based on the lesson data to prevent duplicates
    const lessonDateString = lessonData.date.toISOString();
    const potentialDuplicateId = `${lessonData.tutorId}_${lessonData.studentId}_${lessonDateString}`;
    
    // Verify user is authenticated
    if (!auth.currentUser) {
      throw new Error('You must be logged in to book a lesson');
    }
    
    // Security: ensure studentId is set to the currently logged-in user
    if (auth.currentUser.uid !== lessonData.studentId) {
      console.warn('Overriding provided studentId with authenticated user ID for security');
      lessonData.studentId = auth.currentUser.uid;
    }
    
    // First, check for any existing lessons with exact same tutor, student, and time
    // using an even stronger check than checkExistingLessonBooking
    const exactMatchQuery = query(
      collection(db, 'lessons'),
      where('tutorId', '==', lessonData.tutorId),
      where('studentId', '==', lessonData.studentId)
    );
    
    const exactMatchSnapshot = await getDocs(exactMatchQuery);
    const exactMatches = exactMatchSnapshot.docs.filter(doc => {
      const data = doc.data();
      if (!data.date) return false;
      
      const lessonDate = convertToDate(data.date);
      const requestDate = lessonData.date;
      
      // Check if dates match to the minute (strict checking)
      return lessonDate.getFullYear() === requestDate.getFullYear() &&
             lessonDate.getMonth() === requestDate.getMonth() &&
             lessonDate.getDate() === requestDate.getDate() &&
             lessonDate.getHours() === requestDate.getHours() &&
             lessonDate.getMinutes() === requestDate.getMinutes();
    });
    
    // If we found exact matches, use the first one
    if (exactMatches.length > 0) {
      const existingLesson = exactMatches[0];
      console.log(`Found existing exact lesson match: ${existingLesson.id}`);
      
      // Get the existing lesson data for price info
      const existingLessonData = existingLesson.data();
      const price = existingLessonData.price || lessonData.price || 5000;
      
      return {
        id: existingLesson.id,
        price
      };
    }
    
    // Also use the regular checkExistingLessonBooking as a fallback
    const existingLessonId = await checkExistingLessonBooking(
      lessonData.tutorId, 
      lessonData.studentId, 
      lessonData.date
    );
    
    if (existingLessonId) {
      console.log(`Using existing lesson found by checkExistingLessonBooking: ${existingLessonId}`);
      
      // Get the lesson info to return
      const lessonDoc = await getDoc(doc(db, 'lessons', existingLessonId));
      if (lessonDoc.exists()) {
        const existingLessonData = lessonDoc.data();
        const price = existingLessonData.price || lessonData.price || 5000; // Default to $50 if not set
        
        return {
          id: existingLessonId,
          price
        };
      }
    }
    
    // Continue with regular booking logic - check for conflicts
    const { tutorId, date } = lessonData;
    
    // Get first and last minutes of the day containing the requested time
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    // Check if there are existing lessons for this tutor at the same time
    // Simplified query to just check for time conflicts
    const existingLessonsQuery = query(
      collection(db, 'lessons'),
      where('tutorId', '==', tutorId),
      where('status', 'in', ['scheduled', 'rescheduled', 'confirmed'])
    );
    
    const existingLessonsSnapshot = await getDocs(existingLessonsQuery);
    
    // Check for time conflicts - filter in JavaScript for better compatibility with rules
    const requestedTime = date.getTime();
    const conflictingLesson = existingLessonsSnapshot.docs
      .filter(doc => {
        const lessonData = doc.data();
        const lessonDate = convertToDate(lessonData.date);
        // Only consider lessons on the same day to reduce the amount of data to process
        return lessonDate.getDate() === date.getDate() && 
               lessonDate.getMonth() === date.getMonth() && 
               lessonDate.getFullYear() === date.getFullYear();
      })
      .find(doc => {
        const lessonData = doc.data();
        const lessonTime = convertToDate(lessonData.date).getTime();
        // Assume each lesson is 1 hour by default if not specified
        const lessonDuration = lessonData.duration || 60;
        const lessonEndTime = lessonTime + (lessonDuration * 60 * 1000);
        
        // Check if requested time conflicts with existing lesson time
        // Simple check: if the timestamp matches exactly (same hour)
        return requestedTime === lessonTime;
      });
    
    if (conflictingLesson) {
      console.log(`Time slot already booked: ${date.toISOString()} with lesson ${conflictingLesson.id}`);
      throw new Error('This time slot is already booked');
    }
    
    // Now, check if the tutor has this time slot available in their weekly schedule
    const tutorAvailability = await getTutorAvailability(tutorId);
    if (!tutorAvailability) {
      throw new Error('Tutor has not set their availability yet');
    }
    
    // Get day of week and time format used in availability
    const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][date.getDay()];
    
    const hours = date.getHours();
    const isPM = hours >= 12;
    const hour12 = hours % 12 || 12;
    const timeSlot = `${hour12} ${isPM ? 'pm' : 'am'}`;
    
    // Format date string for exceptions (e.g., "3/15")
    const monthNum = date.getMonth() + 1;
    const dayNum = date.getDate();
    const dateStr = `${monthNum}/${dayNum}`;
    
    // Check if this time is in the tutor's weekly availability
    const weeklySchedule = tutorAvailability.weeklyAvailability || {};
    const daySchedule = weeklySchedule[dayOfWeek] || [];
    
    const isInWeeklySchedule = daySchedule.some((range: { startTime: string; endTime: string }) => {
      const startHour = parseTimeToHours(range.startTime);
      const endHour = parseTimeToHours(range.endTime);
      const requestedHour = hours;
      return requestedHour >= startHour && requestedHour < endHour;
    });
    
    // Check for exceptions
    const slotKey = `${dateStr}-${timeSlot}`;
    let hasException = false;
    let exceptionType = '';
    
    if (tutorAvailability.exceptions && tutorAvailability.exceptions.length > 0) {
      // Check if the exception format is the new object format or old string format
      if (typeof tutorAvailability.exceptions[0] === 'object') {
        const exception = tutorAvailability.exceptions.find((ex: { slotKey: string; type: string }) => ex.slotKey === slotKey);
        if (exception) {
          hasException = true;
          exceptionType = exception.type;
        }
      } else {
        // Old format - all exceptions are 'remove' type
        hasException = tutorAvailability.exceptions.includes(slotKey);
        exceptionType = 'remove';
      }
    }
    
    // Determine if the slot is available based on weekly schedule and exceptions
    let isSlotAvailable = isInWeeklySchedule;
    
    if (hasException) {
      isSlotAvailable = exceptionType === 'add'; // Override based on exception
    }
    
    if (!isSlotAvailable) {
      console.log(`Time slot not available: ${date.toISOString()}, slot ${slotKey}`);
      throw new Error('This time slot is not available for booking');
    }
    
    // Get tutor and student data for notification
    const [tutorDoc, studentDoc] = await Promise.all([
      getDoc(doc(db, 'users', lessonData.tutorId)),
      getDoc(doc(db, 'users', lessonData.studentId))
    ]);
    
    if (!studentDoc.exists()) {
      throw new Error('Student information not found');
    }
    
    const studentData = studentDoc.data();
    const studentName = studentData.displayName || 'Unknown Student';
    
    // Get tutor's price per hour if not provided
    let price = lessonData.price;
    if (!price && tutorDoc.exists()) {
      const tutorData = tutorDoc.data();
      // Default to 5000 ($50) if not set
      price = tutorData.hourlyRate ? Number(tutorData.hourlyRate) * 100 : 5000;
    }
    
    // Create the lesson with status 'scheduled' since payment is already confirmed
    const lessonRef = await addDoc(collection(db, 'lessons'), {
      ...lessonData,
      studentName,
      status: 'scheduled', // Use scheduled instead of pending_payment
      paymentStatus: 'pending', // This will be updated in the payment confirmation
      price: price, // Store price in cents
      createdAt: Timestamp.now(), // Use Firestore Timestamp instead of JavaScript Date
      uniqueBookingId: potentialDuplicateId // Store this to help identify duplicates
    });
    
    console.log(`Created new lesson: ${lessonRef.id} with status 'scheduled'`);
    
    return { 
      id: lessonRef.id,
      price // Return the price for payment processing
    };
  } catch (error) {
    console.error('Error creating lesson:', error);
    throw error;
  }
};

export const updateLessonStatus = async (lessonId: string, status: 'pending' | 'completed' | 'canceled') => {
  try {
    await updateDoc(doc(db, 'lessons', lessonId), { status });
  } catch (error) {
    console.error('Error updating lesson status:', error);
    throw error;
  }
};

// Helper functions for dashboard pages
export const getTutorData = async (tutorId: string) => {
  try {
    // Get the tutor document
    const tutorDoc = await getDoc(doc(db, 'tutors', tutorId));
    
    if (!tutorDoc.exists()) {
      return null;
    }
    
    // Get the user document to combine the data
    const userDoc = await getDoc(doc(db, 'users', tutorId));
    
    if (!userDoc.exists()) {
      return null;
    }
    
    // Combine and return the data
    return {
      id: tutorId,
      ...tutorDoc.data(),
      ...userDoc.data()
    };
  } catch (error) {
    console.error('Error getting tutor data:', error);
    throw error;
  }
};

export const getTutorLessons = async (
  tutorId: string,
  pageLimit: number = 5,
  lastDoc: DocumentReference | null = null,
  firstLoad: boolean = true
): Promise<{ lessons: TutorLesson[], lastVisible: DocumentReference | null, hasMore: boolean }> => {
  try {
    console.log(`getTutorLessons - tutorId: ${tutorId}, pageLimit: ${pageLimit}, firstLoad: ${firstLoad}, lastDoc: ${lastDoc ? 'provided' : 'null'}`);
    
    // Check if the user is authenticated
    if (!auth.currentUser) {
      console.log('Cannot get tutor lessons: User not authenticated');
      return { lessons: [], lastVisible: null, hasMore: false };
    }
    
    // Verify the current user is the tutor
    if (auth.currentUser.uid !== tutorId) {
      console.log(`User ${auth.currentUser.uid} is not allowed to view lessons for tutor ${tutorId}`);
      return { lessons: [], lastVisible: null, hasMore: false };
    }
    
    // Clear cache if firstLoad is true
    if (firstLoad && typeof window !== 'undefined' && window.sessionStorage) {
      const cacheKey = `tutor_lessons_${tutorId}_${pageLimit}_first`;
      sessionStorage.removeItem(cacheKey);
      console.log(`Cleared cache for ${cacheKey}`);
    }
    
    const lessonsRef = collection(db, "lessons");
    
    // Build the query
    let q = query(
      lessonsRef,
      where("tutorId", "==", tutorId),
      orderBy("date", "asc"),
      limit(pageLimit)
    );
    
    // Add pagination if lastDoc is provided
    if (lastDoc) {
      console.log(`Using lastDoc for pagination: ${lastDoc.id}`);
      q = query(
        lessonsRef,
        where("tutorId", "==", tutorId),
        orderBy("date", "asc"),
        startAfter(lastDoc),
        limit(pageLimit)
      );
    }
    
    const querySnapshot = await getDocs(q);
    console.log(`Firestore returned ${querySnapshot.docs.length} lessons for tutor ${tutorId}`);
    
    // Create basic lesson objects from query results
    const lessons = querySnapshot.docs.map(doc => {
      const data = doc.data();
      const lesson = {
        id: doc.id,
        ...data
      } as TutorLesson;
      
      // Log each lesson retrieved
      if (data.date) {
        const dateStr = data.date instanceof Date 
          ? data.date.toLocaleString() 
          : (data.date.toDate ? data.date.toDate().toLocaleString() : "Invalid Date");
        console.log(`Lesson ${doc.id}: status=${data.status}, date=${dateStr}`);
      }
      
      return lesson;
    });
    
    // Fetch student information for lessons that need it
    for (let i = 0; i < lessons.length; i++) {
      const lesson = lessons[i];
      
      if (lesson.studentId && !lesson.studentName) {
        console.log(`Lesson ${lesson.id} has no studentName, attempting to fetch from user record`);
        try {
          const studentDocRef = await getDoc(doc(db, 'users', lesson.studentId));
          if (studentDocRef.exists()) {
            const studentData = studentDocRef.data() as { displayName?: string };
            lesson.studentName = studentData.displayName || 'Unknown Student';
            console.log(`Retrieved student name "${lesson.studentName}" for lesson ${lesson.id}`);
          } else {
            console.warn(`Student document not found for ID: ${lesson.studentId}`);
            lesson.studentName = 'Unknown Student';
          }
        } catch (error) {
          console.warn(`Could not fetch student info for lesson ${lesson.id}:`, error);
          lesson.studentName = 'Unknown Student';
        }
      } else if (lesson.studentName) {
        console.log(`Lesson ${lesson.id} already has studentName: "${lesson.studentName}"`);
      } else {
        console.warn(`Lesson ${lesson.id} has no studentId to fetch name from`);
        lesson.studentName = 'Unknown Student';
      }
    }
    
    // Determine if there are more lessons
    const hasMore = querySnapshot.docs.length >= pageLimit;
    
    // Get the last document for pagination
    const lastVisible = querySnapshot.docs.length > 0 ? 
      querySnapshot.docs[querySnapshot.docs.length - 1].ref : null;
    
    // Log what we're returning
    console.log(`Returning ${lessons.length} lessons, hasMore: ${hasMore}, lastVisible: ${lastVisible ? lastVisible.id : 'null'}`);
    lessons.forEach((lesson, i) => {
      if (lesson.date) {
        const dateObj = convertToDate(lesson.date);
        console.log(`[${i}] Lesson ${lesson.id}: status=${lesson.status}, date=${dateObj.toLocaleString()}`);
      }
    });
    
    const result = {
      lessons,
      lastVisible,
      hasMore
    };
    
    // We're no longer caching results to prevent stale data
    
    return result;
  } catch (error) {
    console.error("Error getting tutor lessons:", error);
    return { lessons: [], lastVisible: null, hasMore: false };
  }
};

// New function for optimized tutor dashboard lessons loading
export const getTutorDashboardLessons = async (tutorId: string): Promise<{ 
  awaitingLessons: any[], 
  upcomingLessons: any[] 
}> => {
  try {
    console.log(`Getting dashboard lessons for tutor ${tutorId} with optimized queries`);
    
    // Check if the user is authenticated
    if (!auth.currentUser) {
      console.log('Cannot get tutor lessons: User not authenticated');
      return { awaitingLessons: [], upcomingLessons: [] };
    }
    
    // Verify the current user is the tutor
    if (auth.currentUser.uid !== tutorId) {
      console.log(`User ${auth.currentUser.uid} is not allowed to view lessons for tutor ${tutorId}`);
      return { awaitingLessons: [], upcomingLessons: [] };
    }

    const lessonsRef = collection(db, "lessons");
    const now = Timestamp.fromDate(new Date()); // Convert to Firestore Timestamp
    
    // First get all active lessons for this tutor
    const baseQuery = query(
      lessonsRef,
      where("tutorId", "==", tutorId),
      where("status", "in", ["scheduled", "rescheduled"])
    );
    
    const lessonsSnapshot = await getDocs(baseQuery);
    console.log(`Firestore returned ${lessonsSnapshot.docs.length} total active lessons for tutor ${tutorId}`);
    
    // Process all lessons
    const allLessons: any[] = lessonsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        studentId: data.studentId || null,
        studentName: data.studentName || null
      };
    });
    
    // Get current time for client-side filtering
    const currentTime = new Date();
    
    // Filter into awaiting submission and upcoming lessons client-side
    const awaitingLessons = allLessons
      .filter(lesson => {
        if (!lesson.date) return false;
        const lessonDate = convertToDate(lesson.date);
        // Past lessons that aren't completed or cancelled
        return lessonDate < currentTime;
      })
      .sort((a, b) => {
        // Sort by most recent first for awaiting lessons
        const dateA = convertToDate(a.date);
        const dateB = convertToDate(b.date);
        return dateB.getTime() - dateA.getTime();
      });
    
    // Filter and limit upcoming lessons
    const upcomingLessons = allLessons
      .filter(lesson => {
        if (!lesson.date) return false;
        const lessonDate = convertToDate(lesson.date);
        // Future lessons
        return lessonDate >= currentTime;
      })
      .sort((a, b) => {
        // Sort by soonest first for upcoming lessons
        const dateA = convertToDate(a.date);
        const dateB = convertToDate(b.date);
        return dateA.getTime() - dateB.getTime();
      });
    
    console.log(`Filtered into ${awaitingLessons.length} awaiting lessons and ${upcomingLessons.length} upcoming lessons`);
    
    // Get unique student IDs from all lessons to minimize user doc fetches
    const studentIds = new Set([
      ...awaitingLessons.filter(lesson => lesson.studentId).map(lesson => lesson.studentId),
      ...upcomingLessons.filter(lesson => lesson.studentId).map(lesson => lesson.studentId)
    ]);
    
    // Fetch student data in batch
    const studentData: Record<string, string> = {};
    for (const studentId of studentIds) {
      try {
        const studentDoc = await getDoc(doc(db, 'users', studentId));
        if (studentDoc.exists()) {
          const studentDocData = studentDoc.data();
          studentData[studentId] = studentDocData.displayName || 'Unknown Student';
        } else {
          studentData[studentId] = 'Unknown Student';
        }
      } catch (error) {
        console.warn(`Could not fetch student info for ID ${studentId}:`, error);
        studentData[studentId] = 'Unknown Student';
      }
    }
    
    // Add student names to lessons
    awaitingLessons.forEach(lesson => {
      if (lesson.studentId) {
        lesson.studentName = studentData[lesson.studentId];
      } else {
        lesson.studentName = 'Unknown Student';
      }
    });
    
    upcomingLessons.forEach(lesson => {
      if (lesson.studentId) {
        lesson.studentName = studentData[lesson.studentId];
      } else {
        lesson.studentName = 'Unknown Student';
      }
    });
    
    return {
      awaitingLessons,
      upcomingLessons
    };
  } catch (error) {
    console.error("Error getting tutor dashboard lessons:", error);
    return { awaitingLessons: [], upcomingLessons: [] };
  }
};

export const getUserLessons = async (userId: string, limitCount?: number, pastOnly?: boolean, upcomingOnly?: boolean, lastVisible?: any) => {
  try {
    // Start building the query
    let lessonsQuery = query(
      collection(db, 'lessons'),
      where('studentId', '==', userId)
    );
    
    // Add time filtering if requested
    const now = new Date();
    
    if (pastOnly) {
      // For past lessons, get lessons with dates before now, ordered by most recent first
      lessonsQuery = query(
        lessonsQuery,
        where('date', '<=', now),
        orderBy('date', 'desc')
      );
    } else if (upcomingOnly) {
      // For upcoming lessons, get lessons with dates after now, ordered by soonest first
      lessonsQuery = query(
        lessonsQuery,
        where('date', '>=', now),
        orderBy('date', 'asc')
      );
    } else {
      // Default sort by date descending (most recent first) if no time filtering
      lessonsQuery = query(
        lessonsQuery,
        orderBy('date', 'desc')
      );
    }
    
    // Add pagination using startAfter if lastVisible is provided
    if (lastVisible) {
      lessonsQuery = query(
        lessonsQuery,
        startAfter(lastVisible)
      );
    }
    
    // Add limit if specified
    if (limitCount && limitCount > 0) {
      lessonsQuery = query(
        lessonsQuery,
        limit(limitCount)
      );
    }
    
    const lessonsSnapshot = await getDocs(lessonsQuery);
    
    const lessons = [];
    
    for (const lessonDoc of lessonsSnapshot.docs) {
      const lessonData = lessonDoc.data();
      
      // Get tutor info
      const tutorDoc = await getDoc(doc(db, 'users', lessonData.tutorId));
      
      lessons.push({
        id: lessonDoc.id,
        ...lessonData,
        tutorName: tutorDoc.exists() ? tutorDoc.data().displayName : 'Unknown Tutor'
      });
    }
    
    // Return the lessons array and the last document for pagination
    return {
      lessons,
      lastVisible: lessonsSnapshot.docs.length > 0 ? lessonsSnapshot.docs[lessonsSnapshot.docs.length - 1] : null,
      hasMore: lessonsSnapshot.docs.length === limitCount // If we got full limitCount, there might be more
    };
  } catch (error) {
    console.error('Error getting user lessons:', error);
    throw error;
  }
};

// Availability
export const getTutorAvailability = async (tutorId: string) => {
  try {
    const availabilityDoc = await getDoc(doc(db, 'tutorAvailability', tutorId));
    return availabilityDoc.exists() ? availabilityDoc.data() : null;
  } catch (error) {
    console.error('Error getting tutor availability:', error);
    // Return null instead of throwing to allow graceful fallback
    return null;
  }
};

export const updateTutorWeeklyAvailability = async (tutorId: string, weeklyAvailability: any) => {
  try {
    // Get existing availability data first
    const availabilityDoc = await getDoc(doc(db, 'tutorAvailability', tutorId));
    
    if (availabilityDoc.exists()) {
      // Update only the weekly availability part
      await updateDoc(doc(db, 'tutorAvailability', tutorId), {
        weeklyAvailability
      });
    } else {
      // Create a new document with weekly availability
      await setDoc(doc(db, 'tutorAvailability', tutorId), {
        weeklyAvailability,
        exceptions: []
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error updating tutor weekly availability:', error);
    throw error;
  }
};

// Function to update the entire availability document
export const updateTutorAvailability = async (tutorId: string, availabilityData: any) => {
  try {
    console.log('Updating entire availability document for tutor:', tutorId);
    console.log('Full availability data being saved:', JSON.stringify(availabilityData));
    
    // Ensure we have the proper structure
    const dataToSave = {
      weeklyAvailability: availabilityData.weeklyAvailability || {},
      exceptions: availabilityData.exceptions || []
    };
    
    // Set the entire document
    await setDoc(doc(db, 'tutorAvailability', tutorId), dataToSave);
    console.log('Successfully updated tutor availability document');
    return true;
  } catch (error) {
    console.error('Error updating tutor availability:', error);
    throw error;
  }
};

// Function to add an exception (remove availability for specific dates)
export const addAvailabilityException = async (tutorId: string, exceptionDate: string) => {
  try {
    // Get existing availability data first
    const availabilityDoc = await getDoc(doc(db, 'tutorAvailability', tutorId));
    
    if (availabilityDoc.exists()) {
      // Add the exception to the array if it doesn't already exist
      const existingData = availabilityDoc.data();
      const exceptions = existingData.exceptions || [];
      
      if (!exceptions.includes(exceptionDate)) {
        await updateDoc(doc(db, 'tutorAvailability', tutorId), {
          exceptions: arrayUnion(exceptionDate)
        });
      }
    } else {
      // Create a new document with the exception
      await setDoc(doc(db, 'tutorAvailability', tutorId), {
        weeklyAvailability: {},
        exceptions: [exceptionDate]
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error adding availability exception:', error);
    throw error;
  }
};

// Function to remove an exception (restore availability for specific dates)
export const removeAvailabilityException = async (tutorId: string, exceptionDate: string) => {
  try {
    const availabilityDoc = await getDoc(doc(db, 'tutorAvailability', tutorId));
    
    if (availabilityDoc.exists()) {
      await updateDoc(doc(db, 'tutorAvailability', tutorId), {
        exceptions: arrayRemove(exceptionDate)
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error removing availability exception:', error);
    throw error;
  }
};

// Function to get available tutors for a specific time
export const getAvailableTutorsForTime = async (dayOfWeek: string, timeSlot: string, courseCode?: string) => {
  try {
    // First get all tutors or tutors by course
    let tutorsQuery;
    if (courseCode) {
      tutorsQuery = query(
        collection(db, 'tutors'),
        where('approvedCourses', 'array-contains', courseCode),
        where('profileStatus', '==', 'approved')
      );
    } else {
      tutorsQuery = query(
        collection(db, 'tutors'),
        where('profileStatus', '==', 'approved')
      );
    }
    
    const tutorsSnapshot = await getDocs(tutorsQuery);
    const allTutors = tutorsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Get all tutor availability docs
    const availabilityPromises = allTutors.map(tutor => 
      getTutorAvailability(tutor.id)
    );
    
    const availabilities = await Promise.all(availabilityPromises);
    
    // Helper function to check if a time falls within an available range
    const isTimeInRange = (timeValue: number, ranges: { startTime: string, endTime: string }[]): boolean => {
      return ranges.some(range => {
        const start = parseTimeToHours(range.startTime);
        const end = parseTimeToHours(range.endTime);
        return timeValue >= start && timeValue < end;
      });
    };
    
    // Parse the requested time slot
    const requestedTime = parseTimeToHours(timeSlot);
    
    // Filter tutors who are available at the requested time
    const availableTutors = allTutors.filter((tutor, index) => {
      const availability = availabilities[index];
      
      if (!availability) return false;
      
      // Check if tutor has weekly availability for this day/time
      const weeklyAvail = availability.weeklyAvailability || {};
      const dayRanges = weeklyAvail[dayOfWeek] || [];
      
      // Check if time slot falls within any available time range for that day
      const isDayAvailable = isTimeInRange(requestedTime, dayRanges);
      
      // Check if there's an exception for this date/time
      const exceptions = availability.exceptions || [];
      
      // Handle both old and new exception formats
      const isOldFormat = exceptions.length > 0 && typeof exceptions[0] === 'string';
      
      let hasException = false;
      
      if (isOldFormat) {
        // Legacy format: simple array of strings like "3/15-9 am"
        hasException = exceptions.some((ex: string) => {
          const [exceptionDate, exceptionTime] = ex.split('-');
          return exceptionTime === timeSlot;
        });
        
        // With old format, all exceptions make times unavailable
        return isDayAvailable && !hasException;
      } else {
        // New format: array of objects with slotKey and type
        // Format date for checking exceptions (should match keys used in exceptions)
        const currentDate = new Date(); // Use a more realistic date for testing
        const dayNum = currentDate.getDate();
        const monthNum = currentDate.getMonth() + 1;
        const formattedDate = `${monthNum}/${dayNum}`;
        
        // Slot key format is like "3/15-9 am"
        const slotKey = `${formattedDate}-${timeSlot}`;
        
        // Find exception for this specific time
        const exception = exceptions.find((ex: any) => ex.slotKey === slotKey);
        
        if (exception) {
          // Override weekly availability based on exception type
          return exception.type === 'add'; // 'add' = make available, 'remove' = make unavailable
        }
        
        // No exception found, use weekly availability
        return isDayAvailable;
      }
    });
    
    // Get user data for each tutor
    const tutorsWithUserData = await Promise.all(
      availableTutors.map(async (tutor) => {
        const userDoc = await getDoc(doc(db, 'users', tutor.id));
        return {
          ...tutor,
          ...userDoc.data()
        };
      })
    );
    
    return tutorsWithUserData;
  } catch (error) {
    console.error('Error getting available tutors:', error);
    throw error;
  }
};

// Function to complete a lesson (for tutors)
export const completeLesson = async (lessonId: string, completionNotes: string) => {
  try {
    // Get the lesson data first
    const lessonDoc = await getDoc(doc(db, 'lessons', lessonId));
    if (!lessonDoc.exists()) {
      throw new Error('Lesson not found');
    }
    
    const lessonData = lessonDoc.data();
    
    // Update the lesson status first
    await updateDoc(doc(db, 'lessons', lessonId), {
      status: 'completed',
      completionNotes,
      completionDate: Timestamp.now() // Use Firestore Timestamp
    });
    
    console.log(`Lesson ${lessonId} marked as completed, now processing payment...`);
    
    // Capture the payment if lesson has a paymentIntentId
    let paymentCaptured = false;
    let paymentError = null;
    
    if (lessonData.paymentIntentId) {
      try {
        // Call the new client-side API to capture the payment
        const response = await fetch('/api/stripe/client-capture', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            paymentIntentId: lessonData.paymentIntentId
          })
        });
        
        const result = await response.json();
        
        if (!response.ok) {
          console.error('Payment capture error:', result.error);
          paymentError = result.error;
        } else {
          console.log('Payment captured successfully:', result);
          paymentCaptured = true;
          
          // Update the payment status to charged
          await updateDoc(doc(db, 'lessons', lessonId), {
            paymentStatus: 'charged',
            paymentCapturedAt: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error('Payment capture request error:', error);
        paymentError = error instanceof Error ? error.message : 'Unknown payment error';
      }
    } else {
      console.log(`No paymentIntentId found for lesson ${lessonId}, skipping payment capture.`);
    }
    
    // Get tutor and student data for notification
    const [tutorDoc, studentDoc] = await Promise.all([
      getDoc(doc(db, 'users', lessonData.tutorId)),
      getDoc(doc(db, 'users', lessonData.studentId))
    ]);
    
    // Send notification
    if (tutorDoc.exists() && studentDoc.exists()) {
      await sendLessonCompletedNotification({
        lessonId,
        tutorId: lessonData.tutorId,
        studentId: lessonData.studentId,
        tutorEmail: tutorDoc.data().email,
        studentEmail: studentDoc.data().email,
        tutorName: tutorDoc.data().displayName,
        studentName: studentDoc.data().displayName,
        lessonDate: convertToDate(lessonData.date),
        courseCode: lessonData.courseCode
      }, completionNotes);
    }
    
    // Update admin notification field for payment issues if there was an error
    if (paymentError) {
      await updateDoc(doc(db, 'lessons', lessonId), {
        paymentIssue: true,
        paymentErrorMessage: paymentError,
        paymentErrorDate: new Date().toISOString()
      });
    }
    
    // Return the payment status
    return { 
      lessonCompleted: true,
      paymentCaptured,
      paymentError: paymentError
    };
  } catch (error) {
    console.error('Error completing lesson:', error);
    throw error;
  }
};

// Function to cancel a lesson (for tutors)
export const cancelLesson = async (lessonId: string, cancellationReason: string) => {
  try {
    // Get the lesson to check if cancellation is allowed (24+ hours in advance)
    const lessonDoc = await getDoc(doc(db, 'lessons', lessonId));
    if (!lessonDoc.exists()) {
      throw new Error('Lesson not found');
    }
    
    const lessonData = lessonDoc.data();
    const lessonDate = convertToDate(lessonData.date);
    const now = new Date();
    
    // Calculate hours until lesson
    const hoursUntilLesson = (lessonDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    // Check if cancellation is allowed (24+ hours in advance)
    if (hoursUntilLesson < 24) {
      throw new Error('Lessons can only be cancelled 24+ hours in advance');
    }
    
    // Update the lesson status
    await updateDoc(doc(db, 'lessons', lessonId), {
      status: 'cancelled',
      cancellationReason,
      cancellationDate: new Date()
    });
    
    // Get tutor and student data for notification
    const [tutorDoc, studentDoc] = await Promise.all([
      getDoc(doc(db, 'users', lessonData.tutorId)),
      getDoc(doc(db, 'users', lessonData.studentId))
    ]);
    
    // Send notification
    if (tutorDoc.exists() && studentDoc.exists()) {
      await sendLessonCancelledNotification({
        lessonId,
        tutorId: lessonData.tutorId,
        studentId: lessonData.studentId,
        tutorEmail: tutorDoc.data().email,
        studentEmail: studentDoc.data().email,
        tutorName: tutorDoc.data().displayName,
        studentName: studentDoc.data().displayName,
        lessonDate: lessonDate,
        courseCode: lessonData.courseCode
      }, cancellationReason);
    }
    
    return true;
  } catch (error) {
    console.error('Error cancelling lesson:', error);
    throw error;
  }
};

// Function to reschedule a lesson (for students)
export const rescheduleLesson = async (lessonId: string, newDate: Date) => {
  try {
    // Get the lesson to check if rescheduling is allowed (24+ hours in advance)
    const lessonDoc = await getDoc(doc(db, 'lessons', lessonId));
    if (!lessonDoc.exists()) {
      throw new Error('Lesson not found');
    }
    
    const lessonData = lessonDoc.data();
    const lessonDate = convertToDate(lessonData.date);
    const now = new Date();
    
    // Calculate hours until lesson
    const hoursUntilLesson = (lessonDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    // Check if rescheduling is allowed (24+ hours in advance)
    if (hoursUntilLesson < 24) {
      throw new Error('Lessons can only be rescheduled 24+ hours in advance');
    }

    // Ensure studentName is preserved (for existing lessons that might not have it)
    let studentName = lessonData.studentName;
    if (!studentName && lessonData.studentId) {
      try {
        const studentDoc = await getDoc(doc(db, 'users', lessonData.studentId));
        if (studentDoc.exists()) {
          studentName = studentDoc.data()?.displayName || 'Unknown Student';
        }
      } catch (error) {
        console.warn('Could not fetch student name for rescheduled lesson:', error);
      }
    }
    
    // Update the lesson with the new date and store the original date
    const updateData: any = {
      status: 'rescheduled',
      originalDate: lessonData.date,
      date: newDate,
      rescheduleDate: new Date()
    };
    
    // Add studentName if we have it and it's not already set
    if (studentName && !lessonData.studentName) {
      updateData.studentName = studentName;
    }
    
    await updateDoc(doc(db, 'lessons', lessonId), updateData);
    
    // Get tutor and student data for notification
    const [tutorDoc, studentDoc] = await Promise.all([
      getDoc(doc(db, 'users', lessonData.tutorId)),
      getDoc(doc(db, 'users', lessonData.studentId))
    ]);
    
    // Send notification
    if (tutorDoc.exists() && studentDoc.exists()) {
      await sendLessonRescheduledNotification({
        lessonId,
        tutorId: lessonData.tutorId,
        studentId: lessonData.studentId,
        tutorEmail: tutorDoc.data().email,
        studentEmail: studentDoc.data().email,
        tutorName: tutorDoc.data().displayName,
        studentName: studentName || studentDoc.data()?.displayName || 'Unknown Student',
        lessonDate: newDate,
        courseCode: lessonData.courseCode
      }, lessonDate);
    }
    
    return true;
  } catch (error) {
    console.error('Error rescheduling lesson:', error);
    throw error;
  }
};

// Function to check if a lesson can be cancelled (for UI validation)
export const canLessonBeCancelled = async (lessonId: string): Promise<boolean> => {
  try {
    // Check if the user is authenticated
    if (!auth.currentUser) {
      console.log('Cannot check if lesson can be cancelled: User not authenticated');
      return false;
    }

    const lessonDoc = await getDoc(doc(db, 'lessons', lessonId));
    if (!lessonDoc.exists()) {
      return false;
    }
    
    const lessonData = lessonDoc.data();
    
    // Additional safety check - this user should be the tutor
    if (lessonData.tutorId !== auth.currentUser.uid) {
      console.log(`User ${auth.currentUser.uid} is not the tutor for lesson ${lessonId}`);
      return false;
    }
    
    const lessonDate = convertToDate(lessonData.date);
    const now = new Date();
    
    // Calculate hours until lesson, handling timezone correctly
    const hoursUntilLesson = (lessonDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    // For debugging - log the hours until lesson
    console.log(`Hours until lesson: ${hoursUntilLesson}`);
    console.log(`Lesson date: ${lessonDate.toLocaleString()}`);
    console.log(`Current date: ${now.toLocaleString()}`);
    
    // Check if cancellation is allowed (24+ hours in advance)
    // Allow cancellation for both scheduled and rescheduled lessons
    return hoursUntilLesson >= 24 && (lessonData.status === 'scheduled' || lessonData.status === 'rescheduled');
  } catch (error) {
    console.error('Error checking if lesson can be cancelled:', error);
    // Return false instead of throwing, so the UI can handle it gracefully
    return false;
  }
};

// Function to check if a lesson can be rescheduled (for UI validation)
export const canLessonBeRescheduled = async (lessonId: string): Promise<boolean> => {
  try {
    // Check if the user is authenticated
    if (!auth.currentUser) {
      console.log('Cannot check if lesson can be rescheduled: User not authenticated');
      return false;
    }

    const lessonDoc = await getDoc(doc(db, 'lessons', lessonId));
    if (!lessonDoc.exists()) {
      return false;
    }
    
    const lessonData = lessonDoc.data();
    
    // Additional safety check - this user should be the tutor or student
    if (lessonData.tutorId !== auth.currentUser.uid && lessonData.studentId !== auth.currentUser.uid) {
      console.log(`User ${auth.currentUser.uid} is not associated with lesson ${lessonId}`);
      return false;
    }
    
    const lessonDate = convertToDate(lessonData.date);
    const now = new Date();
    
    // Calculate hours until lesson
    const hoursUntilLesson = (lessonDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    // For debugging - log the hours until lesson
    console.log(`Hours until lesson (reschedule): ${hoursUntilLesson}`);
    console.log(`Lesson date (reschedule): ${lessonDate.toLocaleString()}`);
    console.log(`Current date (reschedule): ${now.toLocaleString()}`);
    
    // Check if rescheduling is allowed (24+ hours in advance)
    // Allow rescheduling for both scheduled and already rescheduled lessons
    return hoursUntilLesson >= 24 && (lessonData.status === 'scheduled' || lessonData.status === 'rescheduled');
  } catch (error) {
    console.error('Error checking if lesson can be rescheduled:', error);
    // Return false instead of throwing, so the UI can handle it gracefully
    return false;
  }
};

// Function to get booked time slots for a tutor in a given date range
export const getBookedTimeSlots = async (tutorId: string, startDate: Date, endDate: Date) => {
  try {
    // Create query to get lessons for the tutor in the given date range
    const lessonsQuery = query(
      collection(db, 'lessons'),
      where('tutorId', '==', tutorId),
      where('status', 'in', ['scheduled', 'rescheduled']), // Only consider active bookings
      where('date', '>=', startDate),
      where('date', '<=', endDate)
    );
    
    const lessonsSnapshot = await getDocs(lessonsQuery);
    const bookedSlots = lessonsSnapshot.docs.map(doc => {
      const lessonData = doc.data();
      return {
        id: doc.id,
        date: convertToDate(lessonData.date), // Use convertToDate here
        duration: lessonData.duration || 60, // Default to 1 hour if not specified
        studentId: lessonData.studentId,
        studentName: lessonData.studentName || 'Student'
      };
    });
    
    return bookedSlots;
  } catch (error) {
    console.error('Error getting booked time slots:', error);
    return [];
  }
};

/**
 * Gets booked time slots for a tutor within a date range, but only returns the times
 * not the student details. This is safe to call from student views.
 */
export const getPublicBookedTimeSlots = async (
  tutorId: string,
  startDate: Date,
  endDate: Date
): Promise<Date[]> => {
  try {
    console.log('Fetching public booked slots for tutor:', tutorId);
    
    // Method 1: Try using the lessons collection with simplified security rules
    try {
      // Convert dates to Firebase Timestamp objects
      const startTimestamp = Timestamp.fromDate(startDate);
      const endTimestamp = Timestamp.fromDate(endDate);
      
      // SIMPLIFIED QUERY - using only the tutorId filter for better security rule compatibility
      const q = query(
        collection(db, 'lessons'),
        where('tutorId', '==', tutorId),
        where('status', 'in', ['scheduled', 'confirmed', 'rescheduled'])
      );

      const querySnapshot = await getDocs(q);
      
      // Filter by date range in JavaScript
      const bookedDates = querySnapshot.docs
        .map((doc) => {
          const data = doc.data();
          // Try to convert to date, but might return null if data.date is missing
          return data.date ? convertToDate(data.date) : null;
        })
        // Filter out null values and ensure dates are within range
        .filter((date): date is Date => date !== null && date >= startDate && date <= endDate);
      
      console.log(`Found ${bookedDates.length} booked slots through direct query`);
      return bookedDates;
    } catch (permissionError) {
      console.warn('Permission error using direct query, falling back to empty slots:', permissionError);
      // For anonymous users, we'll return an empty array as they can't access booked slots
      // This will show all slots as available, which is better than showing none
      return [];
    }
  } catch (error) {
    console.error('Error getting public booked time slots:', error);
    return [];
  }
};

// New function to approve lesson payout for admin
export const approveLessonPayout = async (lessonId: string, adminId: string) => {
  try {
    // Verify the user is an admin
    const adminDoc = await getDoc(doc(db, 'users', adminId));
    if (!adminDoc.exists() || adminDoc.data().role !== 'admin') {
      throw new Error('Only administrators can approve payouts');
    }
    
    // Get the lesson
    const lessonDoc = await getDoc(doc(db, 'lessons', lessonId));
    if (!lessonDoc.exists()) {
      throw new Error('Lesson not found');
    }
    
    const lessonData = lessonDoc.data();
    
    // Check if lesson is completed and payment has been received
    if (lessonData.status !== 'completed') {
      throw new Error('Lesson must be completed before payout can be approved');
    }
    
    if (lessonData.paymentStatus !== 'paid') {
      throw new Error('Payment must be received before payout can be approved');
    }
    
    // Update the lesson with payout approval
    await updateDoc(doc(db, 'lessons', lessonId), {
      payoutStatus: 'approved',
      payoutApprovedBy: adminId,
      payoutApprovedDate: new Date()
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error approving lesson payout:', error);
    throw error;
  }
};

// New function to get pending payouts for admin
export const getPendingPayouts = async () => {
  try {
    // Get all lessons that are completed, payment is received, but payout is not approved yet
    const payoutsQuery = query(
      collection(db, 'lessons'),
      where('status', '==', 'completed'),
      where('paymentStatus', '==', 'paid'),
      where('payoutStatus', 'in', [null, 'pending'])
    );
    
    const payoutsSnapshot = await getDocs(payoutsQuery);
    
    // Group lessons by tutor
    const tutorPayouts: { [tutorId: string]: any } = {};
    
    for (const docSnapshot of payoutsSnapshot.docs) {
      const lesson = {
        id: docSnapshot.id,
        ...docSnapshot.data()
      } as TutorLesson;
      
      const tutorId = lesson.tutorId;
      
      if (!tutorPayouts[tutorId]) {
        // Get tutor information
        const tutorDoc = await getDoc(doc(db, 'users', tutorId));
        const tutorData = tutorDoc.exists() ? tutorDoc.data() : {};
        
        tutorPayouts[tutorId] = {
          tutorId,
          tutorName: tutorData.displayName || 'Unknown Tutor',
          tutorEmail: tutorData.email || '',
          stripeAccountId: tutorData.stripeAccountId || null,
          totalAmount: 0,
          lessons: []
        };
      }
      
      // Add lesson to tutor's lessons and update total amount
      tutorPayouts[tutorId].lessons.push(lesson);
      tutorPayouts[tutorId].totalAmount += (lesson.price || 0);
    }
    
    return Object.values(tutorPayouts);
  } catch (error) {
    console.error('Error getting pending payouts:', error);
    throw error;
  }
};

// New function to confirm payment for a lesson
export const confirmLessonPayment = async (lessonId: string, paymentId: string, amount: number) => {
  try {
    console.log(`Confirming payment for lesson ${lessonId} with payment ID ${paymentId}`);
    
    // First check if the lesson exists and get its current state
    const lessonRef = doc(db, 'lessons', lessonId);
    const lessonDoc = await getDoc(lessonRef);
    
    if (!lessonDoc.exists()) {
      console.error(`Lesson ${lessonId} not found while confirming payment`);
      return { success: false, error: 'Lesson not found' };
    }
    
    const lessonData = lessonDoc.data();
    
    // Check if the lesson is already processed
    if (lessonData.status !== 'pending_payment') {
      console.log(`Lesson ${lessonId} already processed, current status: ${lessonData.status}`);
      return { success: true, alreadyProcessed: true };
    }
    
    // Update the lesson with payment confirmation
    await updateDoc(lessonRef, {
      status: 'scheduled',
      paymentStatus: 'paid',
      paymentId,
      paymentAmount: amount,
      paymentDate: Timestamp.now()
    });
    
    console.log(`Updated lesson ${lessonId} status to 'scheduled' and payment status to 'paid'`);
    
    // Get lesson data to send notification
    const updatedLessonDoc = await getDoc(lessonRef);
    
    // Send notification to tutor about booked lesson with payment received
    if (updatedLessonDoc.exists()) {
      const updatedLessonData = updatedLessonDoc.data();
      
      try {
        const [tutorDoc, studentDoc] = await Promise.all([
          getDoc(doc(db, 'users', updatedLessonData.tutorId)),
          getDoc(doc(db, 'users', updatedLessonData.studentId))
        ]);
        
        if (tutorDoc.exists() && studentDoc.exists()) {
          await sendLessonScheduledNotification({
            lessonId,
            tutorId: updatedLessonData.tutorId,
            studentId: updatedLessonData.studentId,
            tutorEmail: tutorDoc.data().email,
            studentEmail: studentDoc.data().email,
            tutorName: tutorDoc.data().displayName,
            studentName: updatedLessonData.studentName || studentDoc.data().displayName,
            lessonDate: convertToDate(updatedLessonData.date),
            courseCode: updatedLessonData.courseCode
          });
          console.log(`Sent lesson scheduled notifications for lesson ${lessonId}`);
        } else {
          console.error(`Could not find tutor or student data for lesson ${lessonId}`);
        }
      } catch (notificationError) {
        console.error(`Error sending notifications for lesson ${lessonId}:`, notificationError);
        // Continue despite notification error - the payment was still processed
      }
    }
    
    console.log(`Payment confirmed for lesson ${lessonId}, status set to 'scheduled'`);
    return { success: true };
  } catch (error) {
    console.error('Error confirming lesson payment:', error);
    throw error;
  }
};

// New function to store tutor's Stripe Connect account ID
export const updateTutorStripeAccount = async (tutorId: string, stripeAccountId: string) => {
  try {
    // Update the tutor's user document with the Stripe account ID
    await updateDoc(doc(db, 'users', tutorId), {
      stripeAccountId
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error updating tutor Stripe account:', error);
    throw error;
  }
};

// Function to cancel a lesson (for students)
export const cancelLessonForStudent = async (lessonId: string) => {
  try {
    // Check if the user is authenticated
    if (!auth.currentUser) {
      throw new Error('You must be logged in to cancel a lesson');
    }

    // Get the lesson to check if cancellation is allowed (24+ hours in advance)
    const lessonDoc = await getDoc(doc(db, 'lessons', lessonId));
    if (!lessonDoc.exists()) {
      throw new Error('Lesson not found');
    }
    
    const lessonData = lessonDoc.data();
    
    // Verify the current user is the student for this lesson
    if (lessonData.studentId !== auth.currentUser.uid) {
      throw new Error('You can only cancel your own lessons');
    }
    
    const lessonDate = convertToDate(lessonData.date);
    const now = new Date();
    
    // Calculate hours until lesson
    const hoursUntilLesson = (lessonDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    // Check if cancellation is allowed (24+ hours in advance)
    if (hoursUntilLesson < 24) {
      throw new Error('Lessons can only be cancelled 24+ hours in advance');
    }
    
    // Update the lesson status
    await updateDoc(doc(db, 'lessons', lessonId), {
      status: 'cancelled',
      cancellationReason: 'Cancelled by student',
      cancellationDate: new Date()
    });
    
    // Get tutor and student data for notification
    const [tutorDoc, studentDoc] = await Promise.all([
      getDoc(doc(db, 'users', lessonData.tutorId)),
      getDoc(doc(db, 'users', lessonData.studentId))
    ]);
    
    // Send notification
    if (tutorDoc.exists() && studentDoc.exists()) {
      await sendLessonCancelledNotification({
        lessonId,
        tutorId: lessonData.tutorId,
        studentId: lessonData.studentId,
        tutorEmail: tutorDoc.data().email,
        studentEmail: studentDoc.data().email,
        tutorName: tutorDoc.data().displayName,
        studentName: studentDoc.data().displayName,
        lessonDate: lessonDate,
        courseCode: lessonData.courseCode
      }, 'Cancelled by student');
    }
    
    return true;
  } catch (error) {
    console.error('Error cancelling lesson:', error);
    throw error;
  }
};

// Function to check if a lesson can be cancelled by a student (for UI validation)
export const canLessonBeCancelledByStudent = async (lessonId: string): Promise<boolean> => {
  try {
    // Check if the user is authenticated
    if (!auth.currentUser) {
      console.log('Cannot check if lesson can be cancelled: User not authenticated');
      return false;
    }

    const lessonDoc = await getDoc(doc(db, 'lessons', lessonId));
    if (!lessonDoc.exists()) {
      return false;
    }
    
    const lessonData = lessonDoc.data();
    
    // Additional safety check - this user should be the student
    if (lessonData.studentId !== auth.currentUser.uid) {
      console.log(`User ${auth.currentUser.uid} is not the student for lesson ${lessonId}`);
      return false;
    }
    
    const lessonDate = convertToDate(lessonData.date);
    const now = new Date();
    
    // Calculate hours until lesson, handling timezone correctly
    const hoursUntilLesson = (lessonDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    // For debugging - log the hours until lesson
    console.log(`Hours until lesson: ${hoursUntilLesson}`);
    console.log(`Lesson date: ${lessonDate.toLocaleString()}`);
    console.log(`Current date: ${now.toLocaleString()}`);
    
    // Check if cancellation is allowed (24+ hours in advance)
    // Allow cancellation for both scheduled and rescheduled lessons
    return hoursUntilLesson >= 24 && (lessonData.status === 'scheduled' || lessonData.status === 'rescheduled');
  } catch (error) {
    console.error('Error checking if lesson can be cancelled by student:', error);
    // Return false instead of throwing, so the UI can handle it gracefully
    return false;
  }
};

export const checkExistingLessonBooking = async (tutorId: string, studentId: string, date: Date): Promise<string | null> => {
  try {
    console.log(`Checking for existing booking: tutorId=${tutorId}, studentId=${studentId}, date=${date.toISOString()}`);
    
    // Convert date to just time (hour) to match with time slots
    const requestedTime = date.getTime();
    const requestedDate = new Date(date);
    requestedDate.setHours(0, 0, 0, 0); // Start of the day
    
    // Get the day and time format of the requested slot
    const hours = date.getHours();
    const isPM = hours >= 12;
    const hour12 = hours % 12 || 12;
    const timeSlot = `${hour12} ${isPM ? 'pm' : 'am'}`;
    
    console.log(`Looking for lessons at time slot: ${timeSlot}`);

    // Check for ANY existing lessons for this tutor and student (regardless of status)
    const existingLessonsQuery = query(
      collection(db, 'lessons'),
      where('tutorId', '==', tutorId),
      where('studentId', '==', studentId)
    );
    
    const existingLessonsSnapshot = await getDocs(existingLessonsQuery);
    console.log(`Found ${existingLessonsSnapshot.docs.length} lessons for this tutor and student`);
    
    // Find lessons on the same date with the same start time (or close to it)
    // Also check the lesson status - we want to prioritize lessons that are already in progress
    const matchingLessons = existingLessonsSnapshot.docs
      .filter(doc => {
        const lessonData = doc.data();
        const lessonDate = convertToDate(lessonData.date);
        
        // First check if it's the same day
        const isSameDay = 
          lessonDate.getDate() === date.getDate() && 
          lessonDate.getMonth() === date.getMonth() && 
          lessonDate.getFullYear() === date.getFullYear();
        
        if (!isSameDay) return false;
        
        // Then check if it's the same hour (allow 1 minute difference)
        const lessonTime = lessonDate.getTime();
        const timeDifference = Math.abs(lessonTime - requestedTime);
        const sameStartTime = timeDifference < 60000; // 1 minute in milliseconds
        
        if (sameStartTime) {
          console.log(`Found matching lesson: ${doc.id}, status=${lessonData.status}, time difference=${timeDifference}ms`);
        }
        
        return sameStartTime;
      })
      .sort((a, b) => {
        const dataA = a.data();
        const dataB = b.data();
        
        // Prioritize 'scheduled' or 'confirmed' lessons over 'pending_payment'
        const statusOrder = {
          'scheduled': 0,
          'confirmed': 1,
          'pending_payment': 2,
          'completed': 3,
          'cancelled': 4
        };
        
        const statusValueA = statusOrder[dataA.status as keyof typeof statusOrder] ?? 999;
        const statusValueB = statusOrder[dataB.status as keyof typeof statusOrder] ?? 999;
        
        // First sort by status
        if (statusValueA !== statusValueB) {
          return statusValueA - statusValueB;
        }
        
        // Then by creation time (newer first)
        const timeA = dataA.createdAt ? (dataA.createdAt instanceof Date ? dataA.createdAt : dataA.createdAt.toDate()) : new Date(0);
        const timeB = dataB.createdAt ? (dataB.createdAt instanceof Date ? dataB.createdAt : dataB.createdAt.toDate()) : new Date(0);
        return timeB.getTime() - timeA.getTime();
      });
    
    if (matchingLessons.length > 0) {
      const bestMatch = matchingLessons[0];
      const bestMatchData = bestMatch.data();
      console.log(`Best matching lesson: ${bestMatch.id}, status=${bestMatchData.status}`);
      return bestMatch.id;
    }
    
    console.log('No matching lesson found');
    return null;
  } catch (error) {
    console.error('Error checking for existing lessons:', error);
    return null;
  }
};

// Function to check if a tutor is available at a specific time
export const isTutorAvailableAtTime = async (tutorId: string, date: Date, excludeLessonId?: string): Promise<boolean> => {
  try {
    console.log(`Checking tutor availability: tutorId=${tutorId}, date=${date.toISOString()}, excludeLessonId=${excludeLessonId || 'none'}`);
    
    // Calculate a time window (1 hour before and after the requested time)
    // This is to catch any overlapping bookings
    const startWindow = new Date(date);
    startWindow.setHours(date.getHours() - 1);
    
    const endWindow = new Date(date);
    endWindow.setHours(date.getHours() + 1);
    
    console.log(`Time window: ${startWindow.toISOString()} to ${endWindow.toISOString()}`);
    
    // Base query for this tutor's lessons in the general time frame (same day)
    const sameDayStart = new Date(date);
    sameDayStart.setHours(0, 0, 0, 0);
    
    const sameDayEnd = new Date(date);
    sameDayEnd.setHours(23, 59, 59, 999);
    
    // Convert to Firestore Timestamps
    const fsStartDay = Timestamp.fromDate(sameDayStart);
    const fsEndDay = Timestamp.fromDate(sameDayEnd);
    
    // Query for any lessons for this tutor on this day
    let tutorLessonsQuery = query(
      collection(db, 'lessons'),
      where('tutorId', '==', tutorId),
      where('date', '>=', fsStartDay),
      where('date', '<=', fsEndDay),
      // Only check for active lesson statuses
      where('status', 'in', ['scheduled', 'confirmed', 'in_progress'])
    );
    
    const tutorLessonsSnapshot = await getDocs(tutorLessonsQuery);
    
    console.log(`Found ${tutorLessonsSnapshot.docs.length} lessons for tutor on this day`);
    
    // Check each lesson to see if it overlaps with our requested time
    const overlappingLessons = tutorLessonsSnapshot.docs.filter(doc => {
      // Skip the current lesson if we're updating
      if (excludeLessonId && doc.id === excludeLessonId) {
        return false;
      }
      
      const lessonData = doc.data();
      
      // Get the lesson date and handle Firestore timestamp conversion
      const lessonDate = lessonData.date instanceof Timestamp 
        ? lessonData.date.toDate() 
        : new Date(lessonData.date);
      
      // Get lesson duration (default to 60 minutes if not specified)
      const duration = lessonData.duration || 60;
      
      // Calculate the end time of the lesson
      const lessonEndTime = new Date(lessonDate);
      lessonEndTime.setMinutes(lessonEndTime.getMinutes() + duration);
      
      // Check for overlap:
      // If start time of new lesson is before end time of existing lesson AND
      // end time of new lesson is after start time of existing lesson
      const newLessonEnd = new Date(date);
      newLessonEnd.setMinutes(newLessonEnd.getMinutes() + duration);
      
      const hasOverlap = (date < lessonEndTime && newLessonEnd > lessonDate);
      
      if (hasOverlap) {
        console.log(`Found overlapping lesson: ${doc.id}, starts at ${lessonDate.toLocaleString()}`);
      }
      
      return hasOverlap;
    });
    
    // If there are any overlapping lessons, the tutor is not available
    const isAvailable = overlappingLessons.length === 0;
    console.log(`Tutor availability result: ${isAvailable ? 'AVAILABLE' : 'NOT AVAILABLE'}`);
    
    return isAvailable;
  } catch (error) {
    console.error('Error checking tutor availability:', error);
    throw error;
  }
}; 