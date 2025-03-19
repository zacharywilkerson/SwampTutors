import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { getTutorAvailability, addAvailabilityException, removeAvailabilityException, updateTutorAvailability, getBookedTimeSlots } from '../firebase/firestore';

interface CalendarAvailabilityProps {
  tutorId: string;
}

// Helper types
type DaySchedule = {
  [timeSlot: string]: {
    available: boolean;
    booked?: boolean;
    studentName?: string;
    changed?: boolean; // Track if this slot has been changed
    isPast?: boolean; // Track if this slot is in the past
  };
};

type WeekSchedule = {
  [date: string]: DaySchedule;
};

// More precise exception type
type Exception = {
  slotKey: string;
  type: 'add' | 'remove'; // 'add' = make available, 'remove' = make unavailable
};

type ExceptionChanges = {
  add: Exception[];
  remove: string[];
};

// Helper functions to manage dates
const getDayOfWeek = (date: Date): string => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[date.getDay()];
};

const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
};

const getWeekDates = (startDate: Date): Date[] => {
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    dates.push(date);
  }
  return dates;
};

// Helper to format display time
const formatDisplayTime = (timeStr: string): string => {
  return timeStr.replace(' ', '');
};

// Helper to parse time strings to numeric hours (for comparison)
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

// Check if a date and time are in the past
const isPastDateTime = (dateStr: string, timeStr: string): boolean => {
  const now = new Date();
  const [month, day] = dateStr.split('/').map(Number);
  const [timeValue, period] = timeStr.split(' ');
  let hours = parseInt(timeValue);
  
  if (period === 'pm' && hours !== 12) {
    hours += 12;
  } else if (period === 'am' && hours === 12) {
    hours = 0;
  }
  
  // Create a date object for the slot time
  const slotDate = new Date();
  
  // Get current date components for easier comparison
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-indexed month
  const currentDay = now.getDate();
  
  // Set the year based on whether the date is likely in the past or future
  // For this calendar view, we're never showing dates more than a year away
  if (month < currentMonth) {
    // If the month is earlier than current month, it's likely this year (could be past)
    slotDate.setFullYear(currentYear);
  } else if (month > currentMonth) {
    // If month is later than current month, it could be last year
    slotDate.setFullYear(currentYear - 1);
  } else {
    // Same month, check the day
    if (day < currentDay) {
      // If day is earlier in this month, it's this year and already past
      slotDate.setFullYear(currentYear);
    } else {
      // Same month, day is today or future, it's this year
      slotDate.setFullYear(currentYear);
    }
  }
  
  slotDate.setMonth(month - 1); // Month is 0-indexed in Date
  slotDate.setDate(day);
  slotDate.setHours(hours);
  slotDate.setMinutes(0);
  slotDate.setSeconds(0);
  slotDate.setMilliseconds(0);
  
  // Now we can simply compare if this date is before now
  return slotDate < now;
};

// Helper to get the next hour (e.g., "9 am" → "10 am")
const getNextHour = (timeStr: string): string => {
  const [time, period] = timeStr.split(' ');
  let hours = parseInt(time);
  
  // Convert to 24-hour format
  if (period === 'pm' && hours !== 12) {
    hours += 12;
  } else if (period === 'am' && hours === 12) {
    hours = 0;
  }
  
  // Add one hour
  hours = (hours + 1) % 24;
  
  // Convert back to 12-hour format
  const isPM = hours >= 12;
  const hour12 = hours % 12 || 12;
  
  return `${hour12} ${isPM ? 'pm' : 'am'}`;
};

export default function CalendarAvailability({ tutorId }: CalendarAvailabilityProps) {
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const today = new Date();
    const day = today.getDay(); // 0 is Sunday, 6 is Saturday
    const diff = today.getDate() - day;
    return new Date(today.setDate(diff));
  });
  
  const [weekDates, setWeekDates] = useState<Date[]>([]);
  const [weekSchedule, setWeekSchedule] = useState<WeekSchedule>({});
  const [originalSchedule, setOriginalSchedule] = useState<WeekSchedule>({}); // To track changes
  const [pendingChanges, setPendingChanges] = useState<{[key: string]: { available: boolean, changed: boolean }}>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [availabilityData, setAvailabilityData] = useState<any>(null);
  const [bookedLessons, setBookedLessons] = useState<any[]>([]);
  const tableBodyRef = useRef<HTMLDivElement>(null);
  
  // Generate time slots for full 24 hours - memoize to prevent reference changes on every render
  const timeSlots = (() => {
    const slots = [];
    for (let hour = 0; hour < 24; hour++) {
      slots.push(`${hour === 0 || hour === 12 ? 12 : hour % 12}${hour < 12 ? ' am' : ' pm'}`);
    }
    return slots;
  })();
  
  // Visible time slots (9am-9pm by default)
  const visibleTimeSlots = timeSlots.filter(slot => {
    const hour = parseTimeToHours(slot);
    return hour >= 9 && hour < 21; // 9am to 9pm
  });

  // Replace dataFetched state with a ref to avoid re-renders
  const dataFetchedRef = useRef(false);

  useEffect(() => {
    // Update week dates when current week start changes
    setWeekDates(getWeekDates(currentWeekStart));
  }, [currentWeekStart]);
  
  // Scroll to 9am when component mounts - but only on initial load
  useEffect(() => {
    // Only run this effect on initial load when changing from loading to non-loading
    if (tableBodyRef.current && !loading) {
      // Store a flag in ref to track if we've already scrolled
      if (!tableBodyRef.current.dataset.initialScrollDone) {
        // Find the 9am row
        const nineAmIndex = timeSlots.findIndex(slot => slot === '9 am');
        if (nineAmIndex !== -1) {
          const rowHeight = 40; // Estimated height of a row
          tableBodyRef.current.scrollTop = nineAmIndex * rowHeight;
          tableBodyRef.current.dataset.initialScrollDone = 'true';
        }
      }
    }
  }, [loading, timeSlots]);

  // Separate the data fetching logic from the schedule building to avoid circular dependency
  useEffect(() => {
    const fetchInitialData = async () => {
      if (dataFetchedRef.current || !tutorId) return;
      
      try {
        setLoading(true);
        console.log('Fetching calendar availability for tutor:', tutorId);
        const data = await getTutorAvailability(tutorId);
        console.log('Received availability data:', data);
        
        // Ensure data has the proper structure
        const availData = data || { weeklyAvailability: {}, exceptions: [] };
        
        // Initialize with default structure if needed
        if (!availData.weeklyAvailability) availData.weeklyAvailability = {};
        if (!availData.exceptions) availData.exceptions = [];
        
        // Check if exceptions is array of objects or strings 
        // (for backward compatibility)
        const hasStructuredExceptions = 
          availData.exceptions.length > 0 && 
          typeof availData.exceptions[0] === 'object';
        
        // Convert old format exceptions to new format if needed
        if (!hasStructuredExceptions) {
          console.log('Converting old exception format to new format');
          availData.exceptions = availData.exceptions.map((ex: string) => ({
            slotKey: ex,
            type: 'remove' // Old format only had "remove availability" exceptions
          }));
        }
        
        setAvailabilityData(availData);
        dataFetchedRef.current = true;
      } catch (error) {
        console.error('Error fetching calendar availability:', error);
        setErrorMessage('Failed to load your calendar. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchInitialData();
  }, [tutorId]); // Only depend on tutorId for initial data fetch

  // Separate effect for building the schedule when week dates change or data changes
  useEffect(() => {
    if (!weekDates.length || !tutorId || !availabilityData) return;
    
    console.log('Building week schedule with cached availability data');
    
    // Build the week schedule
    const newWeekSchedule: WeekSchedule = {};
    
    weekDates.forEach(date => {
      const dayOfWeek = getDayOfWeek(date);
      const dateStr = formatDate(date);
      
      // Initialize time slots for this day
      newWeekSchedule[dateStr] = {};
      
      // Fill in availability based on weekly settings and exceptions
      timeSlots.forEach(timeSlot => {
        const slotKey = `${dateStr}-${timeSlot}`;
        const isPast = isPastDateTime(dateStr, timeSlot);
        
        // Add debugging for past dates
        if (isPast) {
          console.log(`Detected past slot: ${slotKey}, marked as isPast=true`);
        }
        
        // First check if this time is in weekly schedule
        const isInWeeklyAvailability = isTimeSlotAvailable(
          timeSlot, 
          availabilityData.weeklyAvailability[dayOfWeek] || []
        );
        
        // Then check if there are any exceptions that apply to this slot
        const exception = availabilityData.exceptions.find((ex: Exception) => ex.slotKey === slotKey);
        
        // Determine if slot is available based on weekly settings and exceptions
        let isAvailable = isInWeeklyAvailability;
        
        if (exception) {
          // Exception overrides the weekly availability
          isAvailable = exception.type === 'add'; // 'add' = make available, 'remove' = make unavailable
        }
        
        // Create the base slot
        newWeekSchedule[dateStr][timeSlot] = {
          available: isAvailable,
          booked: false, // We'll update this with lesson data in a separate call
          isPast
        };
        
        // Apply any pending changes for this slot if they exist
        if (pendingChanges[slotKey] && !isPast) {
          newWeekSchedule[dateStr][timeSlot] = {
            ...newWeekSchedule[dateStr][timeSlot],
            available: pendingChanges[slotKey].available,
            changed: pendingChanges[slotKey].changed
          };
        }
      });
    });
    
    setWeekSchedule(newWeekSchedule);
    // Only set the original schedule on first load, not on navigation
    if (Object.keys(originalSchedule).length === 0) {
      setOriginalSchedule(JSON.parse(JSON.stringify(newWeekSchedule))); // Deep clone for comparison
    }
  }, [weekDates, availabilityData, tutorId, pendingChanges]);

  // Fetch booked lessons when week changes
  useEffect(() => {
    const fetchBookedLessons = async () => {
      if (!tutorId || !weekDates.length) return;
      
      try {
        // Get first and last day of the week
        const startDate = weekDates[0];
        const endDate = new Date(weekDates[6]);
        endDate.setHours(23, 59, 59, 999); // End of the last day
        
        // Fetch booked slots for this week
        const bookedLessonsData = await getBookedTimeSlots(tutorId, startDate, endDate);
        setBookedLessons(bookedLessonsData);
        
        console.log('Fetched booked lessons:', bookedLessonsData);
      } catch (error) {
        console.error('Error fetching booked lessons:', error);
      }
    };
    
    fetchBookedLessons();
  }, [tutorId, weekDates]);
  
  // Apply booked lessons to the schedule
  useEffect(() => {
    if (!weekSchedule || Object.keys(weekSchedule).length === 0 || bookedLessons.length === 0) return;
    
    // Create a copy of the current schedule
    const updatedSchedule = JSON.parse(JSON.stringify(weekSchedule));
    
    // Add booked lessons to the schedule
    bookedLessons.forEach(lesson => {
      const lessonDate = new Date(lesson.date);
      const dateStr = formatDate(lessonDate);
      
      // Get the time in the format used in our schedule (e.g., "9 am")
      const hours = lessonDate.getHours();
      const isPM = hours >= 12;
      const hour12 = hours % 12 || 12; // Convert to 12-hour format
      const timeSlot = `${hour12} ${isPM ? 'pm' : 'am'}`;
      
      // Check if this date exists in our schedule
      if (updatedSchedule[dateStr] && updatedSchedule[dateStr][timeSlot]) {
        updatedSchedule[dateStr][timeSlot] = {
          ...updatedSchedule[dateStr][timeSlot],
          booked: true,
          studentName: lesson.studentName || 'Student',
          lessonId: lesson.id
        };
      }
    });
    
    // Only update if there are changes
    if (JSON.stringify(updatedSchedule) !== JSON.stringify(weekSchedule)) {
      setWeekSchedule(updatedSchedule);
    }
  }, [weekSchedule, bookedLessons]);

  // Check if a time slot falls within any of the available time ranges
  const isTimeSlotAvailable = (
    timeSlot: string, 
    availableRanges: { startTime: string, endTime: string }[]
  ): boolean => {
    if (!availableRanges.length) return false;
    
    // Convert timeSlot to a comparable number (hours)
    const timeValue = parseTimeToHours(timeSlot);
    
    // Check if the time falls within any range
    return availableRanges.some(range => {
      const startValue = parseTimeToHours(range.startTime);
      const endValue = parseTimeToHours(range.endTime);
      return timeValue >= startValue && timeValue < endValue;
    });
  };

  const goToPreviousWeek = () => {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(newStart.getDate() - 7);
    setCurrentWeekStart(newStart);
  };

  const goToNextWeek = () => {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(newStart.getDate() + 7);
    setCurrentWeekStart(newStart);
  };

  const goToCurrentWeek = () => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day;
    setCurrentWeekStart(new Date(today.setDate(diff)));
  };

  // Collect changes without saving immediately
  const toggleTimeSlotAvailability = (date: string, timeSlot: string) => {
    // Don't allow toggling if the slot is already booked
    if (weekSchedule[date]?.[timeSlot]?.booked) {
      return;
    }

    // Don't allow toggling if the time is in the past
    if (weekSchedule[date]?.[timeSlot]?.isPast) {
      return;
    }

    // Create a slot key for the change
    const slotKey = `${date}-${timeSlot}`;
    
    // Create an updated copy of the weekSchedule with the toggled availability
    const updatedSchedule = JSON.parse(JSON.stringify(weekSchedule));
    
    if (updatedSchedule[date] && updatedSchedule[date][timeSlot]) {
      // Get the new availability status (toggled)
      const newAvailability = !updatedSchedule[date][timeSlot].available;
      
      // Update the week schedule
      updatedSchedule[date][timeSlot] = {
        ...updatedSchedule[date][timeSlot],
        available: newAvailability,
        changed: newAvailability !== originalSchedule[date]?.[timeSlot]?.available
      };
      
      // Update the pendingChanges to track this change
      setPendingChanges(prev => {
        const isChangedFromOriginal = newAvailability !== originalSchedule[date]?.[timeSlot]?.available;
        
        if (isChangedFromOriginal) {
          // Add to pending changes
          return {
            ...prev,
            [slotKey]: {
              available: newAvailability,
              changed: true
            }
          };
        } else {
          // Remove from pending changes if it's back to its original state
          const updated = { ...prev };
          delete updated[slotKey];
          return updated;
        }
      });
    }
    
    // Update the state with the new schedule
    setWeekSchedule(updatedSchedule);
    setHasUnsavedChanges(true);
  };

  // Save all changes at once
  const saveChanges = async () => {
    if (!hasUnsavedChanges || !availabilityData || Object.keys(pendingChanges).length === 0) return;
    
    try {
      setSaving(true);
      setErrorMessage('');
      setSuccessMessage('');
      
      console.log('Original availability exceptions:', availabilityData.exceptions || []);
      
      // Make a deep copy of the current availability data to update
      const updatedAvailability = JSON.parse(JSON.stringify(availabilityData));
      
      // Ensure exceptions array exists and has the new format
      if (!updatedAvailability.exceptions) {
        updatedAvailability.exceptions = [];
      }
      
      // Track what exceptions we need to add or remove
      const exceptionsToAdd: Exception[] = [];
      const exceptionsToRemove: string[] = [];
      
      // Process all pending changes
      for (const slotKey in pendingChanges) {
        const change = pendingChanges[slotKey];
        const [dateStr, timeSlot] = slotKey.split('-');
        const date = new Date(dateStr);
        
        // Skip if the time is in the past
        if (isPastDateTime(dateStr, timeSlot)) continue;
        
        // Check if this is in the weekly schedule
        const dayOfWeek = getDayOfWeek(date);
        const isInWeeklySchedule = isTimeSlotAvailable(
          timeSlot,
          updatedAvailability.weeklyAvailability[dayOfWeek] || []
        );
        
        // Find if there's an existing exception for this slot
        const existingExceptionIndex = updatedAvailability.exceptions.findIndex(
          (ex: Exception) => ex.slotKey === slotKey
        );
        
        console.log(`Processing change for slot ${slotKey}: now ${change.available ? 'available' : 'unavailable'}`);
        
        // If there's an existing exception, remove it first
        if (existingExceptionIndex !== -1) {
          exceptionsToRemove.push(slotKey);
        }
        
        // Check if we need to add a new exception
        if (
          (isInWeeklySchedule && !change.available) || // Should be available but we want unavailable
          (!isInWeeklySchedule && change.available)    // Should be unavailable but we want available
        ) {
          exceptionsToAdd.push({
            slotKey,
            type: change.available ? 'add' : 'remove'
          });
        }
      }
      
      console.log('Exceptions to add:', exceptionsToAdd);
      console.log('Exceptions to remove:', exceptionsToRemove);
      
      // Only save if there are changes
      if (exceptionsToAdd.length > 0 || exceptionsToRemove.length > 0) {
        // Remove exceptions that need to be removed
        updatedAvailability.exceptions = updatedAvailability.exceptions.filter(
          (ex: Exception) => !exceptionsToRemove.includes(ex.slotKey)
        );
        
        // Add new exceptions
        updatedAvailability.exceptions = [
          ...updatedAvailability.exceptions,
          ...exceptionsToAdd
        ];
        
        console.log('Final exceptions after changes:', updatedAvailability.exceptions);
        
        // Save to Firebase
        await updateTutorAvailability(tutorId, updatedAvailability);
        
        console.log('Successfully saved calendar changes');
        setSuccessMessage('Your availability has been updated successfully!');
        
        // Update local availability data
        setAvailabilityData(updatedAvailability);
        
        // Reset the pending changes
        setPendingChanges({});
        
        // Update the original schedule to match the current one
        setOriginalSchedule(JSON.parse(JSON.stringify(weekSchedule)));
        
        // Clear changed flags
        setWeekSchedule(prev => {
          const updated = { ...prev };
          for (const date in updated) {
            for (const timeSlot in updated[date]) {
              if (updated[date][timeSlot].changed) {
                updated[date][timeSlot] = { 
                  ...updated[date][timeSlot],
                  changed: false
                };
              }
            }
          }
          return updated;
        });
        
        setHasUnsavedChanges(false);
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          setSuccessMessage('');
        }, 3000);
      } else {
        console.log('No changes to save');
        setSuccessMessage('No changes to save.');
        setTimeout(() => {
          setSuccessMessage('');
        }, 3000);
      }
    } catch (error) {
      console.error('Error saving availability changes:', error);
      setErrorMessage(`Failed to save your availability: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const discardChanges = () => {
    // Reset to original state
    setWeekSchedule(JSON.parse(JSON.stringify(originalSchedule)));
    setPendingChanges({}); // Clear all pending changes
    setHasUnsavedChanges(false);
  };

  // Update hasUnsavedChanges when pendingChanges changes
  useEffect(() => {
    setHasUnsavedChanges(Object.keys(pendingChanges).length > 0);
  }, [pendingChanges]);

  if (loading) {
    return <div className="p-4 text-center">Loading your calendar...</div>;
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold">Calendar View</h2>
        <div className="space-x-2">
          <Link href="/tutor/availability" className="text-blue-500 hover:underline">
            Edit availability
          </Link>
        </div>
      </div>
      
      {errorMessage && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {errorMessage}
        </div>
      )}
      
      {successMessage && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {successMessage}
        </div>
      )}
      
      <div className="flex justify-between items-center mb-6">
        <div className="flex space-x-2">
          <button 
            onClick={goToPreviousWeek}
            className="p-2 border rounded hover:bg-gray-100"
            aria-label="Previous week"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={goToNextWeek}
            className="p-2 border rounded hover:bg-gray-100"
            aria-label="Next week"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        
        <div className="text-lg font-medium">
          {weekDates.length > 0 && (
            `${formatDate(weekDates[0])} - ${formatDate(weekDates[6])}, ${weekDates[0].getFullYear()}`
          )}
        </div>
        
        <button
          onClick={goToCurrentWeek}
          className="px-3 py-1 border rounded hover:bg-gray-100"
        >
          Today
        </button>
      </div>
      
      <div className="mb-2 text-sm text-gray-600">
        <p>All times are in EST. Scroll to see all hours.</p>
      </div>
      
      <div className="overflow-x-auto">
        <div className="relative">
          {/* Increase max-height for more visible time slots */}
          <div className="overflow-y-auto max-h-[600px]" ref={tableBodyRef}>
            <table className="min-w-full border-collapse">
              <thead className="sticky top-0 z-10 bg-white">
                <tr>
                  {/* Empty corner cell */}
                  <th className="border-b border-gray-200 p-2 text-left w-20 sticky left-0 z-20 bg-white"></th>
                  {/* Day headers */}
                  {weekDates.map(date => (
                    <th 
                      key={date.toISOString()} 
                      className="border-b border-gray-200 p-2 text-center min-w-[100px]"
                    >
                      <div>{getDayOfWeek(date).substring(0, 3)}</div>
                      <div>{formatDate(date)}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Time slots rows */}
                {timeSlots.map(timeSlot => (
                  <tr key={timeSlot} className="border-b border-gray-200">
                    {/* Time column - kept sticky */}
                    <td className="p-2 text-left font-medium sticky left-0 bg-white z-10 border-r border-gray-200">
                      {formatDisplayTime(timeSlot)}
                    </td>
                    
                    {/* Day cells */}
                    {weekDates.map(date => {
                      const dateStr = formatDate(date);
                      const slot = weekSchedule[dateStr]?.[timeSlot] || { available: false, isPast: false };
                      
                      // Format the time range display (e.g. "9:00 - 10:00")
                      const hourNum = parseTimeToHours(timeSlot);
                      const nextHour = (hourNum + 1) % 24;
                      const displayStartTime = `${hourNum}:00`;
                      const displayEndTime = `${nextHour}:00`;
                      const timeDisplay = `${displayStartTime} - ${displayEndTime}`;
                      
                      // Determine class names based on slot status
                      let cellClass = "p-2 relative border border-gray-200"; // Lighter border color
                      
                      // Handle booked slots first (even if past)
                      if (slot.booked) {
                        cellClass += " bg-orange-500 text-white";
                      } 
                      // Then handle past slots (they should always be gray unless booked)
                      else if (slot.isPast) {
                        cellClass += " bg-gray-100"; // Remove hover and cursor styling for past slots
                      }
                      // Then handle available and unavailable slots
                      else if (slot.available) {
                        cellClass += " bg-white hover:bg-blue-50 cursor-pointer";
                      } else {
                        cellClass += " bg-gray-100 hover:bg-gray-200 cursor-pointer";
                      }
                      
                      // More comprehensive debug logging to troubleshoot past date rendering
                      if (slot.isPast && slot.available) {
                        console.log(`Past AND available slot found: ${dateStr}-${timeSlot} - This should be gray, not white`);
                      }
                      
                      return (
                        <td 
                          key={`${dateStr}-${timeSlot}-${slot.available ? 'available' : 'unavailable'}`} 
                          className={cellClass}
                          title={slot.isPast ? "Past time slots cannot be modified" : ""}
                          onClick={() => {
                            // Only allow clicking if not booked and not in the past
                            if (!slot.booked && !slot.isPast) {
                              console.log(`Toggling slot: ${dateStr}-${timeSlot} from ${slot.available ? 'available' : 'unavailable'} to ${!slot.available ? 'available' : 'unavailable'}`);
                              toggleTimeSlotAvailability(dateStr, timeSlot);
                            } else if (slot.isPast) {
                              console.log(`Cannot toggle past slot: ${dateStr}-${timeSlot}`);
                              // Could add a visual feedback or notification here
                            }
                          }}
                        >
                          <div className="text-xs text-left">
                            {slot.booked ? (
                              <div>
                                <div className="text-left absolute top-1 left-1">{timeDisplay}</div>
                                <div className="font-medium mt-5 text-center">{slot.studentName}</div>
                              </div>
                            ) : slot.isPast ? (
                              // Past slots don't show time text unless booked (handled above)
                              ""
                            ) : slot.available ? (
                              // Available, non-past slots show time text
                              <span className="absolute top-1 left-1">{timeDisplay}</span>
                            ) : (
                              // Unavailable slots show no time text
                              ""
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      {/* Legend section */}
      <div className="mt-6 flex items-center space-x-4 text-sm flex-wrap">
        <div className="flex items-center mr-2 mb-2">
          <div className="w-4 h-4 bg-white border border-gray-200 mr-2"></div>
          <span>Available</span>
        </div>
        <div className="flex items-center mr-2 mb-2">
          <div className="w-4 h-4 bg-orange-500 border border-gray-200 mr-2"></div>
          <span>Booked</span>
        </div>
        <div className="flex items-center mr-2 mb-2">
          <div className="w-4 h-4 bg-gray-100 border border-gray-200 mr-2"></div>
          <span>Unavailable or Past</span>
        </div>
      </div>
      
      <div className="mt-6 text-sm text-gray-600">
        <p>Click on any time slot to toggle availability. Blocked times will not be shown to students as available for booking.</p>
        <p className="mt-1"><strong>Note:</strong> Times in the past cannot be edited.</p>
      </div>

      <div className="mt-6 flex space-x-4">
        <button
          onClick={saveChanges}
          disabled={saving || !hasUnsavedChanges}
          className={`${
            hasUnsavedChanges 
              ? 'bg-green-500 hover:bg-green-600' 
              : 'bg-gray-300'
          } text-white font-medium py-2 px-6 rounded transition duration-200`}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>

        {hasUnsavedChanges && (
          <button
            onClick={discardChanges}
            className="border border-red-500 text-red-500 hover:bg-red-50 font-medium py-2 px-6 rounded transition duration-200"
          >
            Discard Changes
          </button>
        )}
      </div>
    </div>
  );
} 