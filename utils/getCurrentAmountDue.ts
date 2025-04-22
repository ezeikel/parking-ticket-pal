import { TicketStatus } from '@prisma/client';
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
 * Calculate the standard amount due based on ticket status and days since issued
 * @param ticket The ticket object
 * @returns The standard amount due in pence
 */
const calculateStandardAmount = (ticket: Ticket): number => {
  const { initialAmount, status, issuedAt } = ticket;

  // Calculate days since the ticket was issued using date-fns
  const daysSinceIssued = differenceInDays(new Date(), issuedAt);

  // During discount period (usually first 14 days)
  if (status === 'REDUCED_PAYMENT_DUE' || daysSinceIssued <= 14) {
    return Math.floor(initialAmount * 0.5); // 50% of full amount
  }

  // For more advanced stages, apply standard multipliers
  const stageMultipliers: Partial<Record<TicketStatus, number>> = {
    FULL_PAYMENT_DUE: 1.0,
    NOTICE_TO_OWNER_SENT: 1.0,
    APPEALED: 1.0,
    APPEAL_REJECTED: 1.0,
    TRIBUNAL_APPEAL_IN_PROGRESS: 1.0,
    TRIBUNAL_APPEAL_REJECTED: 1.0,
    ORDER_FOR_RECOVERY: 1.5, // Usually 50% more than full amount
    CCJ_PENDING: 1.5,
    CCJ_ISSUED: 1.5,
  };

  const multiplier = stageMultipliers[status] ?? 1.0;
  return Math.floor(initialAmount * multiplier);
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
