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
 * Calculate the standard amount due based on ticket status and days since issued
 *
 * IMPORTANT: initialAmount is stored as the DISCOUNTED (50%) amount from the ticket.
 * - Within 14 days: user pays the discounted amount (initialAmount)
 * - After 14 days: user pays the full amount (initialAmount * 2)
 * - Enforcement stages: user pays 150% of full amount (initialAmount * 3)
 *
 * @param ticket The ticket object
 * @returns The standard amount due in pence
 */
const calculateStandardAmount = (ticket: Ticket): number => {
  const { initialAmount, status, issuedAt } = ticket;

  // Calculate days since the ticket was issued using date-fns
  const daysSinceIssued = differenceInDays(new Date(), issuedAt);

  // During discount period (first 14 days from issue date)
  // Use date as source of truth, not status - status might not be updated
  if (daysSinceIssued <= 14) {
    return initialAmount; // Return discounted amount as-is
  }

  // After discount period, calculate based on status
  // Base multiplier is 2x (full amount = 2x discounted amount)
  const stageMultipliers: Partial<Record<TicketStatus, number>> = {
    [TicketStatus.ISSUED_FULL_CHARGE]: 2.0, // Full amount
    [TicketStatus.NOTICE_TO_OWNER]: 2.0,
    [TicketStatus.FORMAL_REPRESENTATION]: 2.0,
    [TicketStatus.NOTICE_OF_REJECTION]: 2.0,
    [TicketStatus.CHARGE_CERTIFICATE]: 2.0,
    [TicketStatus.ORDER_FOR_RECOVERY]: 3.0, // 150% of full = 3x discounted
    [TicketStatus.ENFORCEMENT_BAILIFF_STAGE]: 3.0,
    [TicketStatus.CCJ_ISSUED]: 3.0,
  };

  const multiplier = stageMultipliers[status] ?? 2.0; // Default to full amount after discount
  return Math.floor(initialAmount * multiplier);
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
