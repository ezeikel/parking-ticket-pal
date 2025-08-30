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

export default createUTCDate;
