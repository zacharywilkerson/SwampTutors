import { useState, useEffect } from 'react';
import { updateTutorWeeklyAvailability, getTutorAvailability } from '../firebase/firestore';

interface WeeklyAvailabilityProps {
  tutorId: string;
}

type TimeRange = {
  startTime: string;
  endTime: string;
};

type WeeklyAvailabilityType = {
  [key: string]: TimeRange[];
};

const TIME_OPTIONS = [
  '12 am', '1 am', '2 am', '3 am', '4 am', '5 am', '6 am', '7 am', '8 am', '9 am', '10 am', '11 am',
  '12 pm', '1 pm', '2 pm', '3 pm', '4 pm', '5 pm', '6 pm', '7 pm', '8 pm', '9 pm', '10 pm', '11 pm'
];

const DAYS_OF_WEEK = [
  { key: 'Sunday', label: 'Sunday' },
  { key: 'Monday', label: 'Monday' },
  { key: 'Tuesday', label: 'Tuesday' },
  { key: 'Wednesday', label: 'Wednesday' },
  { key: 'Thursday', label: 'Thursday' },
  { key: 'Friday', label: 'Friday' },
  { key: 'Saturday', label: 'Saturday' }
];

export default function WeeklyAvailability({ tutorId }: WeeklyAvailabilityProps) {
  const [weeklyAvailability, setWeeklyAvailability] = useState<WeeklyAvailabilityType>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const fetchAvailability = async () => {
      try {
        setLoading(true);
        console.log('Fetching availability for tutor:', tutorId);
        const availabilityData = await getTutorAvailability(tutorId);
        console.log('Received availability data:', availabilityData);
        
        if (availabilityData && availabilityData.weeklyAvailability) {
          setWeeklyAvailability(availabilityData.weeklyAvailability);
        } else {
          // Initialize with empty object
          setWeeklyAvailability({});
        }
      } catch (error) {
        console.error('Error fetching availability:', error);
        setErrorMessage('Failed to load your availability. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (tutorId) {
      fetchAvailability();
    }
  }, [tutorId]);

  const handleDayToggle = (day: string) => {
    setWeeklyAvailability(prev => {
      const updatedAvailability = { ...prev };
      
      if (updatedAvailability[day]) {
        // If already has time ranges, remove the day
        delete updatedAvailability[day];
      } else {
        // Add day with default 9am-9pm time range
        updatedAvailability[day] = [{ startTime: '9 am', endTime: '9 pm' }];
      }
      
      return updatedAvailability;
    });
  };

  const handleTimeChange = (day: string, index: number, field: 'startTime' | 'endTime', value: string) => {
    setWeeklyAvailability(prev => {
      const updatedAvailability = { ...prev };
      
      // Create a new array for the day to avoid mutation
      const updatedTimeRanges = [...(updatedAvailability[day] || [])];
      
      // Update the specific time range
      updatedTimeRanges[index] = {
        ...updatedTimeRanges[index],
        [field]: value
      };
      
      updatedAvailability[day] = updatedTimeRanges;
      return updatedAvailability;
    });
  };

  const addTimeBlock = (day: string) => {
    setWeeklyAvailability(prev => {
      const updatedAvailability = { ...prev };
      const timeRanges = [...(updatedAvailability[day] || [])];
      
      // Add a new time range with default values
      timeRanges.push({ startTime: '9 am', endTime: '5 pm' });
      
      updatedAvailability[day] = timeRanges;
      return updatedAvailability;
    });
  };

  const removeTimeBlock = (day: string, index: number) => {
    setWeeklyAvailability(prev => {
      const updatedAvailability = { ...prev };
      const timeRanges = [...(updatedAvailability[day] || [])];
      
      // Remove the time range at the specified index
      timeRanges.splice(index, 1);
      
      // If no time ranges left, remove the day entirely
      if (timeRanges.length === 0) {
        delete updatedAvailability[day];
      } else {
        updatedAvailability[day] = timeRanges;
      }
      
      return updatedAvailability;
    });
  };

  const applyToOtherDays = (fromDay: string, toDays: string[]) => {
    if (!weeklyAvailability[fromDay] || toDays.length === 0) return;
    
    setWeeklyAvailability(prev => {
      const updatedAvailability = { ...prev };
      
      toDays.forEach(day => {
        updatedAvailability[day] = [...weeklyAvailability[fromDay]];
      });
      
      return updatedAvailability;
    });
  };

  const validateTimeRanges = (): string | null => {
    // Check each day and time range for validity
    for (const day in weeklyAvailability) {
      const ranges = weeklyAvailability[day] || [];
      
      for (const range of ranges) {
        const startIndex = TIME_OPTIONS.indexOf(range.startTime);
        const endIndex = TIME_OPTIONS.indexOf(range.endTime);
        
        if (startIndex === -1 || endIndex === -1) {
          return `Invalid time format in ${day}'s schedule`;
        }
        
        if (startIndex >= endIndex) {
          return `End time must be after start time in ${day}'s schedule`;
        }
      }
    }
    
    return null; // No errors
  };

  const handleSaveAvailability = async () => {
    try {
      setSaving(true);
      setErrorMessage('');
      setSuccessMessage('');

      const validationError = validateTimeRanges();
      if (validationError) {
        setErrorMessage(validationError);
        setSaving(false);
        return;
      }
      
      console.log('Saving weekly availability for tutor:', tutorId);
      console.log('Data to save:', weeklyAvailability);
      
      await updateTutorWeeklyAvailability(tutorId, weeklyAvailability);
      
      console.log('Successfully saved availability to Firebase');
      setSuccessMessage('Your availability has been saved successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (error) {
      console.error('Error saving availability:', error);
      setErrorMessage(`Failed to save your availability: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-4 text-center">Loading your availability settings...</div>;
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <h2 className="text-2xl font-semibold mb-4">Availability</h2>
      <p className="text-gray-600 mb-2">
        Select the times you're generally available to tutor.
      </p>
      <div className="mb-10 text-sm text-gray-600">
        <p>Lessons are instantly booked based on your availability 24+ hrs out from the current moment. Keeping your availability current will make sure there are no scheduling conflicts.</p>
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

      <div className="space-y-6">
        {DAYS_OF_WEEK.map(day => (
          <div key={day.key} className="border-b pb-4">
            <div className="flex items-center mb-2">
              <input
                type="checkbox"
                id={`day-${day.key}`}
                checked={!!weeklyAvailability[day.key]}
                onChange={() => handleDayToggle(day.key)}
                className="mr-2 w-5 h-5"
              />
              <label htmlFor={`day-${day.key}`} className="font-medium text-lg">
                {day.label}
              </label>
            </div>
            
            {weeklyAvailability[day.key] && (
              <div className="ml-7 space-y-3">
                {weeklyAvailability[day.key].map((timeRange, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <select
                      value={timeRange.startTime}
                      onChange={(e) => handleTimeChange(day.key, index, 'startTime', e.target.value)}
                      className="border rounded px-3 py-2"
                    >
                      {TIME_OPTIONS.map(time => (
                        <option key={time} value={time}>{time}</option>
                      ))}
                    </select>
                    <span>to</span>
                    <select
                      value={timeRange.endTime}
                      onChange={(e) => handleTimeChange(day.key, index, 'endTime', e.target.value)}
                      className="border rounded px-3 py-2"
                    >
                      {TIME_OPTIONS.map(time => (
                        <option key={time} value={time}>{time}</option>
                      ))}
                    </select>
                    
                    <button
                      onClick={() => removeTimeBlock(day.key, index)}
                      className="text-gray-400 hover:text-gray-600"
                      aria-label="Remove time block"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
                
                <div>
                  <button
                    onClick={() => addTimeBlock(day.key)}
                    className="text-blue-500 hover:text-blue-700 flex items-center mt-2"
                  >
                    <span className="mr-1">+</span> Add a block of time
                  </button>
                </div>
                
                {weeklyAvailability[day.key] && weeklyAvailability[day.key].length > 0 && (
                  <div className="mt-3">
                    <button
                      onClick={() => {
                        // Show a dropdown to select days
                        const otherDays = DAYS_OF_WEEK
                          .filter(d => d.key !== day.key && !weeklyAvailability[d.key])
                          .map(d => d.key);
                        
                        if (otherDays.length > 0) {
                          applyToOtherDays(day.key, otherDays);
                        }
                      }}
                      className="text-blue-500 hover:text-blue-700 flex items-center"
                    >
                      <span className="mr-1">↓</span> Apply this schedule to...
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      
      <div className="mt-6">
        <button
          onClick={handleSaveAvailability}
          disabled={saving}
          className="bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-6 rounded transition duration-200"
        >
          {saving ? 'Saving...' : 'OK'}
        </button>
      </div>
    </div>
  );
} 