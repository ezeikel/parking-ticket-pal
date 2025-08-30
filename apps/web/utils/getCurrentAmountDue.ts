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
 * Calculate the standard amount due based on ticket status and days since issued
 * @param ticket The ticket object
 * @returns The standard amount due in pence
 */
const calculateStandardAmount = (ticket: Ticket): number => {
  const { initialAmount, status, issuedAt } = ticket;

  // Calculate days since the ticket was issued using date-fns
  const daysSinceIssued = differenceInDays(new Date(), issuedAt);

  // During discount period (usually first 14 days)
  if (status === TicketStatus.ISSUED_DISCOUNT_PERIOD || daysSinceIssued <= 14) {
    return Math.floor(initialAmount * 0.5); // 50% of full amount
  }

  // For more advanced stages, apply standard multipliers
  const stageMultipliers: Partial<Record<TicketStatus, number>> = {
    [TicketStatus.ISSUED_FULL_CHARGE]: 1.0,
    [TicketStatus.NOTICE_TO_OWNER]: 1.0,
    [TicketStatus.FORMAL_REPRESENTATION]: 1.0,
    [TicketStatus.NOTICE_OF_REJECTION]: 1.0,
    [TicketStatus.CHARGE_CERTIFICATE]: 1.0,
    [TicketStatus.ORDER_FOR_RECOVERY]: 1.5, // Usually 50% more than full amount
    [TicketStatus.ENFORCEMENT_BAILIFF_STAGE]: 1.5,
    [TicketStatus.CCJ_ISSUED]: 1.5,
  };

  const multiplier = stageMultipliers[status] ?? 1.0;
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
