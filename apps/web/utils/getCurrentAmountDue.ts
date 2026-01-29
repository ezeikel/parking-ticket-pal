import { TicketStatus } from '@parking-ticket-pal/db/types';
import { differenceInDays } from 'date-fns';

type PriceIncrease = {
  id: string;
  ticketId: string;
  letterId?: string | null;
  amount: number;
  reason?: string | null;
  sourceType: 'LETTER' | 'MANUAL_UPDATE' | 'SYSTEM';
  effectiveAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

type Ticket = {
  id: string;
  initialAmount: number;
  status: TicketStatus;
  issuedAt: Date;
  priceIncreases?: PriceIncrease[];
};

/**
 * Calculate the standard amount due based on days since issued
 *
 * IMPORTANT: initialAmount is stored as the DISCOUNTED (50%) amount from the ticket.
 * - Within 14 days: user pays the discounted amount (initialAmount)
 * - After 14 days: user pays the full amount (initialAmount * 2)
 *
 * For amounts beyond full charge (enforcement, charge certificate, etc.),
 * we don't know the amount - user must tell us or we get it from live portal check.
 *
 * @param ticket The ticket object
 * @returns The standard amount due in pence
 */
const calculateStandardAmount = (ticket: Ticket): number => {
  const { initialAmount, issuedAt } = ticket;

  // Calculate days since the ticket was issued using date-fns
  const daysSinceIssued = differenceInDays(new Date(), issuedAt);

  // During discount period (first 14 days from issue date)
  if (daysSinceIssued <= 14) {
    return initialAmount; // Return discounted amount as-is
  }

  // After discount period - return full amount (2x discounted)
  // For any amounts beyond this (enforcement, etc.), we rely on:
  // 1. AmountIncrease records (from user input or live portal check)
  // 2. Letter parsing
  return Math.floor(initialAmount * 2);
};

/**
 * Gets the current amount due for a ticket based on:
 * 1. The most recent price increase if any exist
 * 2. The initial amount with standard rules applied
 *
 * @param ticket The ticket with optional price increases
 * @returns The current amount due in pence
 */
export const getCurrentAmountDue = (ticket: Ticket): number => {
  // If ticket is paid or cancelled, amount is 0
  if (ticket.status === 'PAID' || ticket.status === 'CANCELLED') {
    return 0;
  }

  // If we have price increases, use the most recent one
  if (ticket.priceIncreases && ticket.priceIncreases.length > 0) {
    // Sort by effectiveAt date in descending order (most recent first)
    const sortedIncreases = [...ticket.priceIncreases].sort(
      (a, b) => b.effectiveAt.getTime() - a.effectiveAt.getTime(),
    );

    // Current date
    const now = new Date();

    // Find the most recent increase that is already effective
    const effectiveIncrease = sortedIncreases.find(
      (increase) => increase.effectiveAt <= now,
    );

    // If we found an effective increase, use its amount
    if (effectiveIncrease) {
      return effectiveIncrease.amount;
    }
  }

  // If no price increases are available or effective, calculate standard amount
  return calculateStandardAmount(ticket);
};

/**
 * Format amount as currency (£XX.XX)
 * @param amountInPence The amount in pence
 * @returns Formatted string with pound sign
 */
export const formatCurrency = (amountInPence: number): string => {
  const pounds = amountInPence / 100;
  return `£${pounds.toFixed(2)}`;
};
