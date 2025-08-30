import {
  addDays,
  formatDistance,
  isBefore,
  isAfter,
  isSameDay,
  parseISO,
  format,
  differenceInDays,
} from 'date-fns';

/**
 * Format a date string preserving the calendar date regardless of timezone
 * This ensures July 13th always displays as "13 July yyyy" regardless of BST/GMT
 */
export const formatDateStringUTC = (dateString: string): string => {
  const date = parseISO(dateString);
  // Extract the UTC date components to preserve calendar date
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();

  // Create a local date with the same calendar components
  const localDate = new Date(year, month, day);
  return format(localDate, 'dd MMMM yyyy');
};

/**
 * Calculate the standard payment due date (28 days after issue date)
 */
export const calculateDueDate = (issueDate: Date): Date =>
  addDays(issueDate, 28);

/**
 * Format a date as a string using the format: "dd MMMM yyyy" (e.g. "15 March 2023")
 */
export const formatDateString = (date: Date): string =>
  format(date, 'dd MMMM yyyy');

/**
 * Get the status of a due date relative to today
 * Returns: { status: 'future' | 'near' | 'today' | 'past', daysMessage: string, color: string }
 */
export const getDueDateStatus = (dueDate: Date) => {
  const today = new Date();
  const nearFutureDaysThreshold = 7; // Within 7 days is considered "near"

  // Calculate days until due
  const daysMessage = formatDistance(dueDate, today, { addSuffix: true });

  if (isSameDay(dueDate, today)) {
    return {
      status: 'today',
      daysMessage: 'Today',
      color: 'amber',
    };
  } if (isBefore(dueDate, today)) {
    return {
      status: 'past',
      daysMessage,
      color: 'red',
    };
  } if (
    isBefore(today, dueDate) &&
    isAfter(today, addDays(dueDate, -nearFutureDaysThreshold))
  ) {
    return {
      status: 'near',
      daysMessage,
      color: 'amber',
    };
  } 
    return {
      status: 'future',
      daysMessage,
      color: 'green',
    };
  
};

/**
 * Format a date with due date status information
 * @param dateString ISO date string
 * @returns { formattedDate: string, dueDate: Date, status: { status: string, daysMessage: string, color: string } }
 */
export const formatDateWithDueStatus = (dateString: string) => {
  const date = parseISO(dateString);
  const formattedDate = formatDateStringUTC(dateString); // use timezone-safe formatting
  const dueDate = calculateDueDate(date);
  const dueDateFormatted = formatDateString(dueDate);
  const status = getDueDateStatus(dueDate);

  return {
    formattedDate,
    dueDate,
    dueDateFormatted,
    status,
  };
};

/**
 * Calculate the current amount due based on days since issue date
 * @param initialAmount The initial penalty amount
 * @param issuedAtString ISO date string when the ticket was issued
 * @returns { amount: number, isDiscounted: boolean, daysUntilIncrease: number | null, message: string }
 */
export const calculateAmountDue = (
  initialAmount: number,
  issuedAtString: string,
) => {
  const issuedAt = parseISO(issuedAtString);
  const today = new Date();
  const daysSinceIssue = differenceInDays(today, issuedAt);

  // Discount period: First 14 days
  const discountPeriodDays = 14;
  const standardPeriodDays = 28;

  if (daysSinceIssue <= discountPeriodDays) {
    // Within discount period
    const daysRemaining = discountPeriodDays - daysSinceIssue;

    return {
      amount: initialAmount,
      isDiscounted: true,
      daysUntilIncrease: daysRemaining,
      message:
        daysRemaining > 0
          ? `Discount price for ${daysRemaining} more ${daysRemaining === 1 ? 'day' : 'days'}`
          : 'Last day for discount price',
      status: 'discount',
    };
  } if (daysSinceIssue <= standardPeriodDays) {
    // Standard full charge period
    return {
      amount: initialAmount * 2,
      isDiscounted: false,
      daysUntilIncrease: null,
      message: 'Standard charge (discount expired)',
      status: 'standard',
    };
  } 
    // Beyond standard period - could escalate further
    return {
      amount: initialAmount * 2,
      isDiscounted: false,
      daysUntilIncrease: null,
      message: 'May be subject to further penalties',
      status: 'overdue',
    };
  
};
