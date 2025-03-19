/**
 * Utility function to convert various date formats to a JavaScript Date object.
 * Handles Firebase Timestamps, serialized timestamps, Date objects, and strings.
 * 
 * @param dateField The date field to convert, which could be:
 *   - A Firebase Timestamp (with toDate method)
 *   - A serialized Timestamp (with seconds and nanoseconds)
 *   - A JavaScript Date object
 *   - A date string
 * @returns A JavaScript Date object
 */
export const convertToDate = (dateField: any): Date => {
  if (!dateField) return new Date();
  
  // Check if it's a Firebase Timestamp (has toDate method)
  if (typeof dateField.toDate === 'function') {
    return dateField.toDate();
  }
  
  // Check if it's an object with seconds and nanoseconds (serialized Timestamp)
  if (dateField.seconds !== undefined && dateField.nanoseconds !== undefined) {
    return new Date(dateField.seconds * 1000);
  }
  
  // If it's already a Date object, return it
  if (dateField instanceof Date) {
    return dateField;
  }
  
  // If it's a date string or timestamp number, convert to Date
  return new Date(dateField);
}; 