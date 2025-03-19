import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getTutorAvailability, getBookedTimeSlots, getPublicBookedTimeSlots } from '../firebase/firestore';
import { onSnapshot, doc, collection, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

interface TutorBookingCalendarProps {
  tutorId: string;
  courseId?: string;
  onTimeSelected: (date: Date) => void;
  isTutorView?: boolean;
  tutorName?: string;
  tutorRate?: number;
  courseCode?: string;
  courseDescription?: string;
  isLoading?: boolean;
}

// Helper types
type AvailabilityData = {
  weeklyAvailability: {
    [day: string]: {
      startTime: string;
      endTime: string;
    }[];
  };
  exceptions: {
    slotKey: string;
    type: 'add' | 'remove';
  }[];
};

// Helpers for date handling
const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const formatDate = (date: Date): string => {
  return `${date.getMonth() + 1}/${date.getDate()}`;
};

const formatDateFull = (date: Date): string => {
  return `${DAYS_OF_WEEK[date.getDay()]}, ${MONTHS[date.getMonth()]} ${date.getDate()}`;
};

const formatTimeSlot = (time: string): string => {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes || '00'} ${ampm}`;
};

// Check if a date and time are in the past
const isPastDateTime = (date: Date, timeStr: string): boolean => {
  const now = new Date();
  
  const [hourStr, minuteStr] = timeStr.split(':');
  const hour = parseInt(hourStr);
  const minute = parseInt(minuteStr || '0');
  
  const timeDate = new Date(date);
  timeDate.setHours(hour, minute, 0, 0);
  
  return timeDate < now;
};

// Parse time string to hours (for comparison)
const parseTimeToHours = (timeStr: string): number => {
  // Handle format like "9 am" or "3 pm" or "11:30 am"
  if (timeStr.includes('am') || timeStr.includes('pm')) {
    const [time, period] = timeStr.split(' ');
    
    // Check if the time includes minutes
    let hours = 0;
    let minutes = 0;
    
    if (time.includes(':')) {
      // Handle format like "11:30 am"
      const [hourPart, minutePart] = time.split(':');
      hours = parseInt(hourPart);
      minutes = parseInt(minutePart);
    } else {
      // Handle format like "11 am"
      hours = parseInt(time);
    }
    
    // Convert to 24-hour format
    if (period === 'pm' && hours !== 12) {
      hours += 12;
    } else if (period === 'am' && hours === 12) {
      hours = 0;
    }
    
    // Return as decimal hours (e.g., 11:30 am becomes 11.5)
    return hours + (minutes / 60);
  }
  
  // Handle format like "9:00" or "15:30"
  const [hours, minutes] = timeStr.split(':');
  return parseInt(hours) + (parseInt(minutes || '0') / 60);
};

// Convert "9:00" format to "9 am" format for consistency with stored data
const convertTimeFormat = (time: string): string => {
  const [hourStr, minuteStr] = time.split(':');
  const hour = parseInt(hourStr);
  const minutes = minuteStr ? parseInt(minuteStr) : 0;
  
  // Convert hour to 12-hour format
  const period = hour >= 12 ? 'pm' : 'am';
  const hour12 = hour % 12 || 12;
  
  // Include minutes if they're not zero
  if (minutes > 0) {
    return `${hour12}:${minutes < 10 ? '0' + minutes : minutes} ${period}`;
  }
  
  // For whole hours, use the original format without minutes
  return `${hour12} ${period}`;
};

export default function TutorBookingCalendar({ tutorId, courseId, onTimeSelected, isTutorView = false, tutorName, tutorRate, courseCode, courseDescription, isLoading = false }: TutorBookingCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  
  const [availabilityData, setAvailabilityData] = useState<AvailabilityData | null>(null);
  const [bookedSlots, setBookedSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  const [bookedSlotDetails, setBookedSlotDetails] = useState<{[key: string]: {id: string, studentName: string}}>({});
  const dataFetchedRef = useRef(false);
  const availabilityListenerRef = useRef<Function | null>(null);
  const bookedSlotsListenerRef = useRef<Function | null>(null);
  const isLoadingRef = useRef<boolean>(false); // Track loading state for safety checks
  const lastUpdateTimeRef = useRef<number>(Date.now());
  const requestCountRef = useRef<number>(0);
  const forceRefreshRef = useRef<boolean>(false);

  // Update the forceRefreshAvailability function to include a safety timeout
  const forceRefreshAvailability = useCallback(() => {
    // Don't refresh if already loading
    if (isLoadingRef.current) {
      console.log('Already loading - skipping refresh request');
      return;
    }
    
    console.log('Force refreshing availability data');
    forceRefreshRef.current = true;
    
    // Clean up existing listeners
    if (availabilityListenerRef.current) {
      console.log('Cleaning up existing availability listener');
      (availabilityListenerRef.current as Function)();
      availabilityListenerRef.current = null;
    }
    
    if (bookedSlotsListenerRef.current) {
      console.log('Cleaning up existing booked slots listener');
      (bookedSlotsListenerRef.current as Function)();
      bookedSlotsListenerRef.current = null;
    }
    
    setLoading(true);
    isLoadingRef.current = true;
    
    // Safety timeout to prevent infinite loading
    const safetyTimeout = setTimeout(() => {
      if (isLoadingRef.current) {
        console.warn('Loading timeout exceeded - resetting loading state');
        setLoading(false);
        isLoadingRef.current = false;
        setError('Loading took too long. Please try refreshing the page.');
      }
    }, 5000); // 5 second safety timeout
    
    // The useEffect hooks will handle setting up new listeners
    // This safety timeout will be cleared if those succeed
    return () => clearTimeout(safetyTimeout);
  }, []);

  // Set up visibility change detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('Tab became visible - checking if refresh needed');
        // Only force refresh if not already loading and if it's been at least 30 seconds since last update
        const timeSinceLastUpdate = Date.now() - lastUpdateTimeRef.current;
        
        if (!isLoadingRef.current && timeSinceLastUpdate > 30000) {
          console.log(`Last update was ${timeSinceLastUpdate/1000}s ago - refreshing data`);
          forceRefreshAvailability();
        } else {
          console.log(`Tab visible but ${isLoadingRef.current ? 'already loading' : `last update was only ${timeSinceLastUpdate/1000}s ago`} - skipping refresh`);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [forceRefreshAvailability]);

  // Set up the availability listener
  useEffect(() => {
    // Skip if no tutorId
    if (!tutorId) {
      console.log('No tutorId, skipping availability listener setup');
      setLoading(false);
      isLoadingRef.current = false;
      return;
    }
    
    console.log(`Setting up availability listener for tutor ${tutorId}, force refresh: ${forceRefreshRef.current}`);
    setLoading(true);
    isLoadingRef.current = true;
    
    // Clean up any existing listener first
    if (availabilityListenerRef.current) {
      console.log('Cleaning up existing availability listener before creating new one');
      (availabilityListenerRef.current as Function)();
      availabilityListenerRef.current = null;
    }
    
    // Get a reference to the tutor's availability document
    const availabilityRef = doc(db, 'tutorAvailability', tutorId);
    
    console.log('Listening to document:', `tutorAvailability/${tutorId}`);
    
    // Safety timeout to prevent infinite loading
    const safetyTimeout = setTimeout(() => {
      if (isLoadingRef.current) {
        console.warn('Availability listener setup timeout exceeded - resetting loading state');
        setLoading(false);
        isLoadingRef.current = false;
        setError('Loading took too long. Please try refreshing the page.');
      }
    }, 8000); // 8 second safety timeout
    
    // Set up a new real-time listener
    const unsubscribe = onSnapshot(
      availabilityRef,
      (snapshot) => {
        // Clear the safety timeout since we received data
        clearTimeout(safetyTimeout);
        
        // Log throttling to reduce console noise
        const now = Date.now();
        const timeSinceLastUpdate = now - lastUpdateTimeRef.current;
        requestCountRef.current++;
        
        // Log every update when debugging, but throttle in production
        console.log(`Received availability update #${requestCountRef.current} from Firestore at ${new Date().toLocaleTimeString()}`);
        lastUpdateTimeRef.current = now;
        
        if (snapshot.exists()) {
          const data = snapshot.data();
          
          // Make sure the data has the expected structure and properly cast to AvailabilityData
          const availData: AvailabilityData = {
            weeklyAvailability: data.weeklyAvailability || {},
            exceptions: Array.isArray(data.exceptions) ? [...data.exceptions] : [] // Create a new array to ensure reference change
          };
          
          // Check if exceptions is array of objects or strings 
          // (for backward compatibility)
          const hasStructuredExceptions = 
            availData.exceptions.length > 0 && 
            typeof availData.exceptions[0] === 'object';
          
          // Convert old format exceptions to new format if needed
          if (!hasStructuredExceptions) {
            console.log('Converting old exception format to new format');
            availData.exceptions = (availData.exceptions as any[]).map((ex: string) => ({
              slotKey: ex,
              type: 'remove' as 'remove' // Old format only had "remove availability" exceptions
            }));
          }
          
          // Always log update details to help with debugging
          console.log(`Availability data received with ${availData.exceptions.length} exceptions`);
          if (availData.exceptions.length > 0) {
            console.log('Sample exceptions:', availData.exceptions.slice(0, 2));
          }
          
          // Always update the state on every snapshot to ensure real-time updates work
          console.log('Updating availability data in component state');
          forceRefreshRef.current = false; // Reset the force refresh flag
          
          // Create a new object to ensure React detects the change
          setAvailabilityData({ ...availData });
          
          // Time slot regeneration is now handled in a separate useEffect
          // that depends on selectedDate, availabilityData, and bookedSlots
          
          setLoading(false);
        } else {
          console.log("No availability document exists!");
          setAvailabilityData({
            weeklyAvailability: {},
            exceptions: []
          });
          setLoading(false);
        }
      },
      (error) => {
        // Clear the safety timeout since we got an error
        clearTimeout(safetyTimeout);
        
        console.error("Error getting real-time availability updates:", error);
        setError("Could not retrieve tutor's availability. Please try again later.");
        setLoading(false);
      }
    );
    
    // Update our ref to the unsubscribe function
    availabilityListenerRef.current = unsubscribe;
    
    // Clean up listener when component unmounts or tutorId changes
    return () => {
      clearTimeout(safetyTimeout);
      if (availabilityListenerRef.current) {
        console.log('Cleaning up availability listener on unmount/tutorId change');
        availabilityListenerRef.current();
        availabilityListenerRef.current = null;
      }
    };
  }, [tutorId, forceRefreshRef.current]);

  // Add an effect to regenerate time slots when selectedDate, availabilityData, or bookedSlots change
  useEffect(() => {
    if (!selectedDate || !availabilityData) {
      return;
    }
    
    console.log(`Regenerating time slots for date: ${selectedDate}`);
    const selectedDateObj = new Date(selectedDate);
    const slots = generateTimeSlots(selectedDateObj);
    console.log(`Generated ${slots.length} available time slots for selected date`);
    setAvailableTimeSlots([...slots]);
  }, [selectedDate, availabilityData, bookedSlots]);

  // Set up the booked slots listener
  useEffect(() => {
    // Skip if no tutorId
    if (!tutorId) {
      console.log('No tutorId, skipping booked slots listener setup');
      return;
    }
    
    console.log(`Setting up booked slots listener for tutor ${tutorId} - Month: ${currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}`);
    
    // Clean up any existing listener first
    if (bookedSlotsListenerRef.current) {
      console.log('Cleaning up existing booked slots listener before creating new one');
      (bookedSlotsListenerRef.current as Function)();
      bookedSlotsListenerRef.current = null;
    }

    // Safety timeout to prevent issues if listener setup fails
    const safetyTimeout = setTimeout(() => {
      console.warn('Booked slots listener setup taking longer than expected');
    }, 5000); // 5 second warning timeout
    
    // Get first and last day of the month being viewed
    const firstDay = new Date(currentMonth);
    const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0, 23, 59, 59);
    
    console.log(`Setting up booked slots listener for date range: ${firstDay.toLocaleDateString()} to ${lastDay.toLocaleDateString()}`);
    
    // Convert to Firestore Timestamps for query
    const startTimestamp = Timestamp.fromDate(firstDay);
    const endTimestamp = Timestamp.fromDate(lastDay);
    
    try {
      let slotsQuery;
      
      if (isTutorView) {
        // For tutors - show all bookings with details
        slotsQuery = query(
          collection(db, 'lessons'),
          where('tutorId', '==', tutorId),
          where('date', '>=', startTimestamp),
          where('date', '<=', endTimestamp)
        );
      } else {
        // For students - only need to know which slots are booked
        slotsQuery = query(
          collection(db, 'lessons'),
          where('tutorId', '==', tutorId),
          where('date', '>=', startTimestamp),
          where('date', '<=', endTimestamp)
        );
      }
      
      console.log(`Firestore query created for booked slots - tutorId: ${tutorId}, startDate: ${startTimestamp.toDate().toLocaleString()}, endDate: ${endTimestamp.toDate().toLocaleString()}`);
      
      const unsubscribe = onSnapshot(
        slotsQuery,
        (snapshot) => {
          // Always log changes for debugging purposes
          console.log(`Received booked slots update at ${new Date().toLocaleTimeString()}, changes: ${snapshot.docChanges().length}`);
          
          if (snapshot.docChanges().length > 0) {
            // Log the specific changes for debugging
            snapshot.docChanges().forEach((change) => {
              console.log(`  Booked slot ${change.type}: ${change.doc.id}, timestamp: ${change.doc.data().date?.toDate().toLocaleString() || 'unknown'}`);
            });
          }
          
          const bookedSlotsData: any[] = [];
          const detailsMap: {[key: string]: {id: string, studentName: string}} = {};
          
          snapshot.forEach((doc) => {
            const data = doc.data();
            if (!data.date) return;
            
            // Convert Firestore Timestamp to Date, ensuring it's handled properly
            let date;
            try {
              // Check if it's a Firestore Timestamp
              if (data.date && typeof data.date.toDate === 'function') {
                date = data.date.toDate();
              } else if (data.date instanceof Date) {
                date = data.date;
              } else {
                // Try to parse it as a date if it's a string
                date = new Date(data.date);
              }
              
              if (isNaN(date.getTime())) {
                console.warn(`Invalid date in booking record ${doc.id}`);
                return;
              }
            } catch (err) {
              console.error(`Error processing date for booking ${doc.id}:`, err);
              return;
            }
            
            const bookedSlot = {
              id: doc.id,
              date: date,
              studentName: data.studentName || 'Student',
              duration: data.duration || 60
            };
            
            bookedSlotsData.push(bookedSlot);
            
            // Create a map entry for tutor view
            if (isTutorView) {
              const key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}-${date.getHours()}-${date.getMinutes()}`;
              detailsMap[key] = {
                id: doc.id,
                studentName: data.studentName || 'Student'
              };
            }
          });
          
          // Always update the state if we have changes or it's a new snapshot
          // We MUST update on any snapshot, because new bookings should be reflected immediately
          // even if docChanges() is empty (which can happen in some Firestore caching scenarios)
          
          console.log(`Updating booked slots state with ${bookedSlotsData.length} slots at ${new Date().toLocaleTimeString()}`);
          
          // Log any changes in detail for debugging
          if (bookedSlots.length !== bookedSlotsData.length) {
            console.log(`Number of booked slots changed: ${bookedSlots.length} → ${bookedSlotsData.length}`);
          }

          // Always create new reference for bookedSlots to ensure React detects the change
          setBookedSlots(bookedSlotsData);
          
          if (isTutorView) {
            setBookedSlotDetails({...detailsMap});
          }
          
          // If a date is already selected, regenerate the time slots
          if (selectedDate) {
            console.log(`Regenerating time slots for ${selectedDate} due to booking changes`);
            const selectedDateObj = new Date(selectedDate);
            const slots = generateTimeSlots(selectedDateObj);
            console.log(`Generated ${slots.length} time slots after booking update`);
            setAvailableTimeSlots([...slots]);
          }
        },
        (error) => {
          console.error("Error getting real-time booked slots updates:", error);
          // For student view, continue without error message
          if (isTutorView) {
            setError('Could not load booked sessions. Please try again later.');
          }
        }
      );
      
      // Update our ref to the unsubscribe function
      bookedSlotsListenerRef.current = unsubscribe;
      
      // Clean up listener when component unmounts or month changes
      return () => {
        clearTimeout(safetyTimeout);
        if (bookedSlotsListenerRef.current) {
          console.log('Cleaning up booked slots listener on unmount/tutorId change');
          bookedSlotsListenerRef.current();
          bookedSlotsListenerRef.current = null;
        }
      };
    } catch (error) {
      console.error('Error setting up booked slots listener:', error);
      // Don't show error to students - calendar will work with potentially incomplete data
      if (isTutorView) {
        setError('Could not load booked sessions. Please try again later.');
      }
    }
  }, [tutorId, currentMonth, isTutorView]);
  
  // Add a separate useEffect for re-running the listener when forceRefreshRef changes
  useEffect(() => {
    if (forceRefreshRef.current && tutorId) {
      console.log('Force refresh triggered for booked slots - cleaning up listener');
      // The main booked slots listener useEffect will re-run because we've cleaned up the listener
      if (bookedSlotsListenerRef.current) {
        (bookedSlotsListenerRef.current as Function)();
        bookedSlotsListenerRef.current = null;
      }
    }
  }, [forceRefreshRef.current, tutorId]);
  
  // Set loading state tracking ref whenever loading state changes
  useEffect(() => {
    isLoadingRef.current = loading;
  }, [loading]);

  // Generate calendar days for the current month
  const generateCalendarDays = (): (Date | null)[][] => {
    const firstDayOfMonth = new Date(currentMonth);
    const lastDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    
    // Get the day of the week for the first day (0 = Sunday, 6 = Saturday)
    const firstDayOfWeek = firstDayOfMonth.getDay();
    
    // Create 6 rows of 7 days each to cover all possible month layouts
    const days: (Date | null)[][] = [[], [], [], [], [], []];
    
    // Fill in days of current month only
    let currentRow = 0;
    let currentCol = firstDayOfWeek;
    
    // Fill in empty cells for the first week
    for (let i = 0; i < firstDayOfWeek; i++) {
      days[0][i] = null;
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      if (currentCol === 7) {
        currentRow++;
        currentCol = 0;
      }
      
      const currentDate = new Date(currentMonth);
      currentDate.setDate(day);
      
      if (!days[currentRow]) days[currentRow] = [];
      days[currentRow][currentCol] = currentDate;
      
      currentCol++;
    }
    
    // Fill in the remaining cells with null instead of next month days
    if (currentCol < 7) {
      for (let i = currentCol; i < 7; i++) {
        days[currentRow][i] = null;
      }
    }
    
    // Remove empty rows
    return days.filter(row => row.some(day => day !== null));
  };
  
  // Modified to check if a time slot would overlap with any booked lesson
  const isTimeSlotBooked = (date: Date, timeStr: string): boolean => {
    if (!bookedSlots || bookedSlots.length === 0) return false;
    
    // Parse the time string (e.g., "9:00" to hours and minutes)
    const [hours, minutes] = timeStr.split(':');
    const slotTime = new Date(date);
    slotTime.setHours(parseInt(hours), parseInt(minutes || '0'), 0, 0);
    
    // Calculate the end time for a 1-hour lesson
    const slotEndTime = new Date(slotTime);
    slotEndTime.setHours(slotEndTime.getHours() + 1);
    
    // Log detailed info about the slot time we're checking
    const isImportantTime = (
      date.getDate() === new Date().getDate() || // Today
      slotTime.getHours() === 12 || // Noon
      slotTime.getHours() === 15 || // 3 PM
      slotTime.getHours() === 17 // 5 PM
    );
    
    if (isImportantTime) {
      console.log(`Checking if slot at ${slotTime.toLocaleString()} is booked...`);
    }
    
    // Check if this time would overlap with any existing booking
    const isBooked = bookedSlots.some(bookedSlot => {
      // Handle both object and Date formats that might come from different methods
      if (!bookedSlot) return false;
      
      // Extract the date, handling both formats
      const bookedTime = bookedSlot instanceof Date 
        ? new Date(bookedSlot) 
        : bookedSlot.date instanceof Date 
          ? new Date(bookedSlot.date) 
          : null;
      
      if (!bookedTime) return false;
      
      // Check if the booking is on the same day
      const sameDay = 
        bookedTime.getFullYear() === date.getFullYear() &&
        bookedTime.getMonth() === date.getMonth() &&
        bookedTime.getDate() === date.getDate();
        
      if (!sameDay) return false;
      
      // Calculate the end time of the booked slot (assuming 1-hour duration)
      const bookedEndTime = new Date(bookedTime);
      bookedEndTime.setHours(
        bookedEndTime.getHours() + 
        (typeof bookedSlot === 'object' && bookedSlot.duration ? bookedSlot.duration / 60 : 1)
      );
      
      // Check for overlap:
      // If start time of new slot is before end time of booked slot AND
      // end time of new slot is after start time of booked slot
      const hasOverlap = (slotTime < bookedEndTime && slotEndTime > bookedTime);
      
      if (hasOverlap && isImportantTime) {
        console.log(`  Found overlap with booking at ${bookedTime.toLocaleString()}, duration: ${typeof bookedSlot === 'object' && bookedSlot.duration ? bookedSlot.duration : 60} minutes`);
      }
      
      return hasOverlap;
    });
    
    if (isImportantTime && isBooked) {
      console.log(`  Slot at ${slotTime.toLocaleString()} is booked`);
    }
    
    return isBooked;
  };
  
  // Get details for a booked time slot - Not needed anymore since we don't show booked slots
  const getBookedSlotDetails = (date: Date, timeStr: string): {id: string, studentName: string} | null => {
    // Since we're not showing booked slots, this function is not needed
    return null;
  };
  
  // Generate available time slots for the selected date - update to handle tutor view differently
  const generateTimeSlots = (date: Date): string[] => {
    if (!availabilityData) return [];
    
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const dayOfWeek = DAYS_OF_WEEK[date.getDay()];
    const dayRanges = availabilityData.weeklyAvailability[dayOfWeek] || [];
    
    // Format date string for looking up exceptions (e.g., "4/15")
    const dateStr = formatDate(date);
    
    console.log(`Checking availability for ${date.toDateString()}, weekly availability:`, dayRanges);
    console.log(`Exceptions for ${dateStr}:`, availabilityData.exceptions.filter(ex => ex.slotKey.startsWith(dateStr)));
    
    // Find all exceptions for this date
    const dateExceptions = availabilityData.exceptions.filter(ex => ex.slotKey.startsWith(dateStr));
    const addExceptions = dateExceptions.filter(ex => ex.type === 'add');
    const removeExceptions = dateExceptions.filter(ex => ex.type === 'remove');
    
    console.log(`Add exceptions for ${dateStr}:`, addExceptions);
    console.log(`Remove exceptions for ${dateStr}:`, removeExceptions);
    
    // First, determine if we have any "add" exceptions for this day
    const hasAddExceptions = addExceptions.length > 0;
    
    // Create a map of time slots to their unavailability reasons (for debugging)
    const timeSlotDebug: { [key: string]: { available: boolean, reason: string } } = {};
    
    // Get all remove exception times as decimal values for easy comparison
    const removeExceptionTimes = removeExceptions.map(ex => {
      const timePart = ex.slotKey.split('-')[1]; // Extract the time part
      return parseTimeToHours(timePart);
    });
    
    // Check if a time is explicitly available due to an "add" exception
    const isTimeAddedException = (timeValue: number): boolean => {
      // Convert decimal hours to formatted time string
      const hours = Math.floor(timeValue);
      const minutes = Math.round((timeValue % 1) * 60);
      
      let formattedTime = '';
      if (minutes === 0) {
        const period = hours >= 12 ? 'pm' : 'am';
        const hour12 = hours % 12 || 12;
        formattedTime = `${hour12} ${period}`;
      } else {
        const period = hours >= 12 ? 'pm' : 'am';
        const hour12 = hours % 12 || 12;
        formattedTime = `${hour12}:${minutes} ${period}`;
      }
      
      const slotKey = `${dateStr}-${formattedTime}`;
      return addExceptions.some(ex => ex.slotKey === slotKey);
    };
    
    // Check if a time is explicitly unavailable due to a "remove" exception
    const isTimeRemovedException = (timeValue: number): boolean => {
      // Convert decimal hours to formatted time string
      const hours = Math.floor(timeValue);
      const minutes = Math.round((timeValue % 1) * 60);
      
      let formattedTime = '';
      if (minutes === 0) {
        const period = hours >= 12 ? 'pm' : 'am';
        const hour12 = hours % 12 || 12;
        formattedTime = `${hour12} ${period}`;
      } else {
        const period = hours >= 12 ? 'pm' : 'am';
        const hour12 = hours % 12 || 12;
        formattedTime = `${hour12}:${minutes} ${period}`;
      }
      
      const slotKey = `${dateStr}-${formattedTime}`;
      return removeExceptions.some(ex => ex.slotKey === slotKey);
    };
    
    // Check if a time slot is within weekly availability
    const isInWeeklyAvailability = (startTime: number, endTime: number): boolean => {
      if (dayRanges.length === 0) return false;
      
      return dayRanges.some(range => {
        const rangeStartValue = parseTimeToHours(range.startTime);
        const rangeEndValue = parseTimeToHours(range.endTime);
        return startTime >= rangeStartValue && endTime <= rangeEndValue;
      });
    };
    
    // Log remove exception times for debugging
    console.log(`Remove exception times (decimal):`, removeExceptionTimes);
    
    // If we have "add" exceptions, we need to:
    // 1. Sort them by time
    // 2. Generate half-hour slots in between consecutive add exceptions
    if (hasAddExceptions) {
      // Sort add exceptions by time
      const sortedAddTimes = addExceptions
        .map(ex => {
          const timePart = ex.slotKey.split('-')[1]; // Extract the time part (e.g., "11 am")
          return parseTimeToHours(timePart);
        })
        .sort((a, b) => a - b);
      
      console.log(`Sorted add exception times:`, sortedAddTimes);
      
      // Generate all possible slots, including half-hour slots
      const allTimeSlots: string[] = [];
      
      for (let hour = 0; hour < 24; hour++) {
        for (let minute of [0, 30]) {
          const timeStr = `${hour}:${minute === 0 ? '00' : '30'}`;
          
          // Skip times in the past for today
          if (isToday && isPastDateTime(date, timeStr)) {
            continue;
          }
          
          // Skip already booked slots or slots that would overlap with booked slots
          if (isTimeSlotBooked(date, timeStr)) {
            continue;
          }
          
          // Convert to the format used in weekly availability (e.g., "9 am", "3 pm")
          const formattedTime = convertTimeFormat(timeStr);
          
          // Get current time and end time (1 hour later) as decimal values
          const timeValue = parseTimeToHours(formattedTime);
          const endTimeValue = timeValue + 1; // 1-hour lesson
          
          // Debug for 11:00 and 11:30
          if (hour === 11 || hour === 10 || hour === 12) {
            console.log(`Checking slot: ${timeStr} (${formattedTime}) - Time value: ${timeValue}, End: ${endTimeValue}`);
          }
          
          // CASE 1: There are "add" exceptions for this day
          
          // Check if this time is an "add" exception OR
          // Check if this time is between two consecutive "add" exceptions that are 1 hour or less apart
          let isSlotAvailable = false;
          
          // First, check if this exact time has an "add" exception
          if (isTimeAddedException(timeValue)) {
            // The start time is an "add" exception
            
            // If a time has an "add" exception, it should be considered available
            // regardless of end time - this is the key fix for the 12:00pm slot issue
            isSlotAvailable = true;
            
            // For extra debug info, still check these conditions, but don't use them
            // to determine availability
            const endTimeHasAddException = isTimeAddedException(endTimeValue);
            let hasAddExceptionDuringLesson = false;
            for (let t = timeValue + 0.5; t < endTimeValue; t += 0.5) {
              if (isTimeAddedException(t)) {
                hasAddExceptionDuringLesson = true;
                break;
              }
            }
            
            if (hour === 11 || hour === 10 || hour === 12) {
              console.log(`  Start time is an add exception`);
              console.log(`  End time has add exception: ${endTimeHasAddException}`);
              console.log(`  Has add exception during lesson: ${hasAddExceptionDuringLesson}`);
              console.log(`  Is in weekly availability: ${isInWeeklyAvailability(timeValue, endTimeValue)}`);
              console.log(`  Slot available: ${isSlotAvailable}`);
            }
          } else {
            // This exact time doesn't have an "add" exception
            
            // Check if we're in between two consecutive "add" exceptions
            let isInBetweenAddExceptions = false;
            
            // Special handling for half-hour slots between consecutive full-hour add exceptions
            if (minute === 30) {
              // For half-hour slots (e.g., 10:30), check if the previous and next 
              // hour both have add exceptions (e.g., 10:00 and 11:00)
              const previousHourHasException = sortedAddTimes.includes(hour);
              const nextHourHasException = sortedAddTimes.includes(hour + 1);
              
              if (previousHourHasException && nextHourHasException) {
                isInBetweenAddExceptions = true;
                if (hour === 10 || hour === 11) {
                  console.log(`  Half-hour ${hour}:30 is between consecutive add exceptions`);
                }
              }
            } else {
              // Regular check for slots between exceptions
              for (let i = 0; i < sortedAddTimes.length - 1; i++) {
                const currentAddTime = sortedAddTimes[i];
                const nextAddTime = sortedAddTimes[i + 1];
                
                // Check if the gap between exceptions is not too large (max 1 hour)
                const isConsecutiveWindow = (nextAddTime - currentAddTime) <= 1;
                
                // To be "in between", the current time must be after currentAddTime
                // and the end time must be before or equal to nextAddTime
                // AND the exceptions must be consecutive (not more than 1 hour apart)
                if (timeValue > currentAddTime && endTimeValue <= nextAddTime && isConsecutiveWindow) {
                  isInBetweenAddExceptions = true;
                  break;
                }
              }
            }
            
            // Also check weekly availability
            const isInWeekly = isInWeeklyAvailability(timeValue, endTimeValue);
            
            // If we're in between add exceptions, we're available
            isSlotAvailable = isInBetweenAddExceptions;
            
            // If we don't have any add exceptions for this day, or we're not in between them,
            // fall back to weekly availability
            if (!hasAddExceptions || (!isInBetweenAddExceptions && isInWeekly)) {
              isSlotAvailable = isInWeekly;
            }
            
            if (hour === 11 || hour === 10 || hour === 12) {
              console.log(`  Not an add exception time`);
              console.log(`  Is in between add exceptions: ${isInBetweenAddExceptions}`);
              console.log(`  Is in weekly availability: ${isInWeekly}`);
              console.log(`  Slot available: ${isSlotAvailable}`);
            }
          }
          
          // Finally, check for remove exceptions - these override everything else
          if (isTimeRemovedException(timeValue)) {
            isSlotAvailable = false;
            if (hour === 11 || hour === 10 || hour === 12) {
              console.log(`  Overridden by remove exception`);
            }
          }
          
          // If after all checks, the slot is still available, add it to our list
          if (isSlotAvailable) {
            allTimeSlots.push(timeStr);
            if (hour === 11 || hour === 10 || hour === 12) {
              console.log(`  ADDING to available slots`);
            }
          }
        }
      }
      
      console.log(`All available time slots for ${date.toDateString()}:`, allTimeSlots);
      return allTimeSlots;
    } else {
      // CASE 2: No "add" exceptions for this day, use weekly availability
      // but respect "remove" exceptions
      const allTimeSlots: string[] = [];
      
      // Generate time slots from weekly availability, excluding remove exceptions
      for (let hour = 0; hour < 24; hour++) {
        for (let minute of [0, 30]) {
          const timeStr = `${hour}:${minute === 0 ? '00' : '30'}`;
          
          // Skip times in the past for today
          if (isToday && isPastDateTime(date, timeStr)) {
            continue;
          }
          
          // Skip already booked slots
          if (isTimeSlotBooked(date, timeStr)) {
            continue;
          }
          
          // Format time for comparison
          const formattedTime = convertTimeFormat(timeStr);
          const timeValue = parseTimeToHours(formattedTime);
          const endTimeValue = timeValue + 1; // 1-hour lesson
          
          // Debug for key time slots
          const isDebugHour = hour === 11 || hour === 10 || hour === 12;
          if (isDebugHour) {
            console.log(`Checking slot (no add exceptions): ${timeStr} (${formattedTime}) - Value: ${timeValue}, End: ${endTimeValue}`);
          }
          
          // Check if slot is within weekly availability
          let isAvailable = isInWeeklyAvailability(timeValue, endTimeValue);
          
          // If the slot isn't available based on weekly availability, don't bother checking exceptions
          if (!isAvailable) {
            if (isDebugHour) console.log(`  Slot not in weekly availability`);
            continue;
          }
          
          // Check remove exceptions - most important part!
          let hasRemoveException = false;
          
          // First, check if the start time has a remove exception
          hasRemoveException = isTimeRemovedException(timeValue);
          if (hasRemoveException) {
            if (isDebugHour) console.log(`  Start time has remove exception`);
            continue; // Skip this slot
          }
          
          // For March 18, we need to handle the "remove" exceptions properly
          // Check if this time slot overlaps with ANY remove exception time
          for (const exceptionTime of removeExceptionTimes) {
            // Improved check for half-hour slots - Check if the time slot overlaps with a remove exception
            // A 1-hour lesson at X:30 overlaps with a remove exception at X:00 because it runs from X:30 to X+1:30
            // Similarly, a slot like 15:30 (3:30pm) should be unavailable if 15:00 (3pm) is removed

            // For full hour slots, normal check if remove exception is during lesson
            if (timeValue % 1 === 0) {  // Full hour (e.g., 12:00)
              if (exceptionTime > timeValue && exceptionTime < endTimeValue) {
                hasRemoveException = true;
                if (isDebugHour) console.log(`  Slot overlaps with remove exception at ${exceptionTime}`);
                break;
              }
            } 
            // For half hour slots, check if the previous full hour is removed
            else {  // Half hour (e.g., 12:30)
              const precedingHour = Math.floor(timeValue);
              if (exceptionTime === precedingHour || 
                  (exceptionTime > timeValue && exceptionTime < endTimeValue)) {
                hasRemoveException = true;
                if (isDebugHour) console.log(`  Half-hour slot overlaps with remove exception at ${exceptionTime}`);
                break;
              }
            }
          }
          
          // If there's a remove exception, skip this slot
          if (hasRemoveException) {
            continue;
          }
          
          // If we've passed all checks, add this slot as available
          if (isDebugHour) console.log(`  ADDING to available slots`);
          allTimeSlots.push(timeStr);
        }
      }
      
      console.log(`All available time slots for ${date.toDateString()}:`, allTimeSlots);
      return allTimeSlots;
    }
  };
  
  // Modified to check if a date has any non-booked available times
  const hasAvailableTimes = (date: Date): boolean => {
    if (!availabilityData) return false;
    
    const dayOfWeek = DAYS_OF_WEEK[date.getDay()];
    const dayRanges = availabilityData.weeklyAvailability[dayOfWeek] || [];
    
    // Format date string for exceptions
    const dateStr = formatDate(date);
    
    // Find all exceptions for this date
    const dateExceptions = availabilityData.exceptions.filter(ex => ex.slotKey.startsWith(dateStr));
    const addExceptions = dateExceptions.filter(ex => ex.type === 'add');
    const removeExceptions = dateExceptions.filter(ex => ex.type === 'remove');
    
    // Generate time slots for this date
    const availableSlots = generateTimeSlots(date);
    
    // If we have any available slots after all checks, return true
    return availableSlots.length > 0;
  };
  
  // Format time display for the UI
  const formatTimeDisplay = (timeStr: string): string => {
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const minute = minutes || '00';
    
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    
    return `${hour12}:${minute} ${ampm}`;
  };

  // Handle time selection - modified to store time without triggering callback
  const handleTimeSelected = (timeStr: string) => {
    if (!selectedDate) return;
    
    setSelectedTimeSlot(timeStr);
    
    // We don't automatically call onTimeSelected here anymore
    // This will be done by a dedicated "Book Lesson" button in the parent component
  };
  
  // Public method to get the selected date and time
  const getSelectedDateTime = (): Date | null => {
    if (!selectedDate || !selectedTimeSlot) return null;
    
    const dateParts = selectedDate.split('-');
    const year = parseInt(dateParts[0]);
    const month = parseInt(dateParts[1]) - 1;
    const day = parseInt(dateParts[2]);
    
    const [hours, minutes] = selectedTimeSlot.split(':');
    
    const dateTime = new Date(year, month, day);
    dateTime.setHours(parseInt(hours), parseInt(minutes || '0'), 0, 0);
    
    return dateTime;
  };

  // New method to confirm selection
  const confirmSelection = () => {
    const dateTime = getSelectedDateTime();
    if (dateTime) {
      onTimeSelected(dateTime);
    }
  };
  
  // Handle date selection - updated to use memoized function
  const handleDateSelected = (date: Date) => {
    // Check if date is in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (date < today) {
      return;
    }
    
    // Clear selected time slot when changing date
    setSelectedTimeSlot(null);
    
    // Create a copy to avoid modification issues
    const newDate = new Date(date);
    
    // Format as YYYY-MM-DD for consistent comparison
    const formattedDate = `${newDate.getFullYear()}-${newDate.getMonth() + 1}-${newDate.getDate()}`;
    console.log(`User selected date: ${formattedDate} (${newDate.toLocaleDateString('en-US', {weekday: 'long', month: 'long', day: 'numeric'})})`);
    console.log(`Currently have ${bookedSlots.length} booked slots for this month`);
    
    // Check for booked slots on this specific date
    const bookedSlotsOnSelectedDate = bookedSlots.filter(slot => {
      const slotDate = slot.date instanceof Date ? slot.date : new Date(slot.date);
      return slotDate.getFullYear() === newDate.getFullYear() && 
             slotDate.getMonth() === newDate.getMonth() && 
             slotDate.getDate() === newDate.getDate();
    });
    
    if (bookedSlotsOnSelectedDate.length > 0) {
      console.log(`Found ${bookedSlotsOnSelectedDate.length} booked slots on selected date:`);
      bookedSlotsOnSelectedDate.forEach(slot => {
        const slotDate = slot.date instanceof Date ? slot.date : new Date(slot.date);
        console.log(`  - Booked at ${slotDate.toLocaleTimeString()}, duration: ${slot.duration} minutes`);
      });
    }
    
    setSelectedDate(formattedDate);
    
    // Generate available time slots for this date - use the function directly
    const slots = generateTimeSlots(newDate);
    console.log(`Generated ${slots.length} available time slots for ${formattedDate}`);
    
    // Always create a new array to ensure React detects the change
    setAvailableTimeSlots([...slots]);
  };
  
  // Handle month navigation
  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };
  
  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  // Render the calendar
  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex flex-col lg:flex-row gap-4 w-full">
        {/* Left side - Calendar */}
        <div className="w-full lg:w-1/3 bg-white p-4 rounded-lg shadow">
          {error ? (
            <div className="flex flex-col items-center justify-center h-64">
              <p className="text-red-600 mb-4">{error}</p>
              <button 
                onClick={forceRefreshAvailability}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Try Again
              </button>
            </div>
          ) : loading ? (
            <div className="flex justify-center items-center h-64">
              <span className="text-gray-500">Loading calendar...</span>
            </div>
          ) : (
            <div>
              {/* Calendar header */}
              <div className="flex justify-between items-center mb-4">
                <button
                  onClick={prevMonth}
                  className="p-2 rounded hover:bg-gray-100"
                  aria-label="Previous Month"
                >
                  &lt;
                </button>
                <h2 className="text-lg font-semibold">
                  {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </h2>
                <button
                  onClick={nextMonth}
                  className="p-2 rounded hover:bg-gray-100"
                  aria-label="Next Month"
                >
                  &gt;
                </button>
              </div>

              {/* Days of week */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} className="text-center font-medium text-sm text-gray-500">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar days - Calendly style */}
              <div className="grid grid-cols-7 gap-1">
                {generateCalendarDays().map((row, rowIndex) => (
                  <React.Fragment key={`row-${rowIndex}`}>
                    {row.map((day, dayIndex) => {
                      // Skip null days (outside current month)
                      if (!day) return <div key={`day-${dayIndex}`} className="p-2"></div>;
                      
                      // Check if today or past
                      const isToday = day.toDateString() === new Date().toDateString();
                      const isPast = day < new Date();
                      
                      // Format the date for comparison with selected date
                      const formattedDate = `${day.getFullYear()}-${day.getMonth() + 1}-${day.getDate()}`;
                      
                      // Check if this day has any available times
                      const hasAvailable = !isPast && hasAvailableTimes(day);
                      
                      // Check if this day is the currently selected date
                      const isSelected = formattedDate === selectedDate;
                      
                      return (
                        <div 
                          key={`day-${rowIndex}-${dayIndex}`}
                          className="relative p-2 flex items-center justify-center"
                          onClick={() => {
                            if (!isPast) {
                              handleDateSelected(day);
                            }
                          }}
                        >
                          <div 
                            className={`
                              w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-full 
                              ${isPast ? 'text-gray-400' : 'text-gray-800'} 
                              ${hasAvailable && !isSelected ? 'bg-blue-100 hover:bg-blue-200 cursor-pointer' : ''}
                              ${isSelected ? 'bg-blue-500 text-white' : ''}
                              ${!hasAvailable && !isPast ? 'cursor-default' : ''}
                            `}
                          >
                            {day.getDate()}
                          </div>
                          
                          {/* Dot indicator only for today */}
                          {isToday && (
                            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 flex justify-center">
                              <div className="h-1 w-1 bg-blue-500 rounded-full"></div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right side - Time slots */}
        <div className="w-full lg:w-1/3 bg-white p-4 rounded-lg shadow">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div>
              <span className="ml-3 text-gray-500">Loading available times...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-64">
              <p className="text-red-600 mb-4">{error}</p>
              <button 
                onClick={forceRefreshAvailability}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Try Again
              </button>
            </div>
          ) : !selectedDate ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <p>Select a date to see available time slots</p>
              <p className="text-sm mt-2">Available dates have blue highlighting</p>
            </div>
          ) : (
            <div>
              <h3 className="text-lg font-semibold mb-4">
                {new Date(selectedDate).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric'
                })}
              </h3>
              
              {availableTimeSlots.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-2 gap-3 h-100 overflow-y-auto pr-1">
                  {availableTimeSlots.map((time, index) => (
                    <button
                      key={index}
                      className={`py-4 px-4 border rounded-lg text-left hover:bg-blue-50 hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-300 transition-colors
                        ${selectedTimeSlot === time ? 'bg-blue-50 border-blue-500' : 'border-gray-200'}
                      `}
                      onClick={() => handleTimeSelected(time)}
                    >
                      <span className="font-medium">{formatTimeDisplay(time)}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-100 text-gray-500">
                  <p>No available times on this date</p>
                  <p className="text-sm mt-2">Please select another date</p>
                </div>
              )}
            </div>
          )}
        </div>
      {/* Enhanced Preview section - shows below the calendar when a time is selected */}
      {selectedDate && selectedTimeSlot && !isTutorView && (
        <div className="w-full lg:w-1/3 bg-white p-6 rounded-lg shadow-md border border-blue-100">
          <h3 className="text-xl font-semibold mb-4">Selected Lesson Details</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Tutor Information */}
            {tutorName && (
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Tutor</h4>
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-blue-200 rounded-full flex items-center justify-center text-blue-800 font-bold mr-3">
                    {tutorName.charAt(0) || "T"}
                  </div>
                  <div>
                    <p className="font-medium">{tutorName}</p>
                    {tutorRate && <p className="text-sm text-gray-600">${tutorRate}/hour</p>}
                  </div>
                </div>
              </div>
            )}
            
            {/* Course Information */}
            {courseCode && (
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Course</h4>
                <p className="mb-1">{courseCode}</p>
                {courseDescription && (
                  <p className="text-sm text-gray-600">{courseDescription}</p>
                )}
              </div>
            )}
          </div>

          {/* Date & Time */}
          <div className="border-t border-gray-200 pt-4 mb-4">
            <h4 className="font-medium text-gray-700 mb-2">Date & Time</h4>
            <div className="bg-blue-50 p-4 rounded-lg mb-2">
              <p className="font-medium">
                {new Date(selectedDate).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                })} at {formatTimeDisplay(selectedTimeSlot)}
              </p>
            </div>
            <p className="text-sm text-gray-600">1 hour session</p>
          </div>
          
          {/* Total Cost */}
          {tutorRate && (
            <div className="border-t border-gray-200 pt-4 mb-4">
              <h4 className="font-medium text-gray-700 mb-2">Total</h4>
              <p className="text-xl font-semibold">${tutorRate}</p>
            </div>
          )}
          
          <button
            onClick={confirmSelection}
            disabled={loading}
            className={`w-full py-3 px-4 ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'} text-white font-medium rounded-lg transition-colors`}
          >
            {loading ? 'Booking...' : 'Confirm This Time Selection'}
          </button>
        </div>
      )}
      </div>

    </div>
  );
} 