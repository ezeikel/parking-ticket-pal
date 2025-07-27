/**
 * Create a UTC date from a local date, preserving the calendar date
 * This ensures that July 13th stays July 13th regardless of timezone
 *
 * Solves the BST issue where:
 * - User selects "13 July 2025"
 * - Frontend creates ambiguous Date object
 * - During BST, it could be interpreted as "12 July 23:00 UTC"
 * - This function forces it to be "13 July 00:00 UTC"
 *
 * @param localDate - The date object (potentially with timezone confusion)
 * @returns A new Date object in UTC with the same calendar date
 */
const createUTCDate = (localDate: Date): Date =>
  new Date(
    Date.UTC(
      localDate.getFullYear(),
      localDate.getMonth(),
      localDate.getDate(),
    ),
  );

/**
 * Create a local date from a UTC date string, preserving the calendar date
 * This is the inverse of createUTCDate - for displaying/editing dates
 *
 * Solves the display issue where:
 * - Database stores "2025-07-13T00:00:00.000Z" (correct)
 * - new Date(utcString) creates July 13th UTC midnight
 * - During BST, this displays as July 12th 23:00 local time
 * - This function creates a local Date that represents July 13th local time
 *
 * @param utcDateString - ISO string from database (e.g. "2025-07-13T00:00:00.000Z")
 * @returns A new Date object in local timezone with the same calendar date
 */
export const createLocalDateFromUTC = (utcDateString: string): Date => {
  const utcDate = new Date(utcDateString);
  // Extract the UTC date components
  const year = utcDate.getUTCFullYear();
  const month = utcDate.getUTCMonth();
  const day = utcDate.getUTCDate();

  // Create a local date with the same calendar components
  return new Date(year, month, day);
};

export default createUTCDate;
