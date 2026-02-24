'use server';

import { db, TicketTier, OnboardingExitReason } from '@parking-ticket-pal/db';
import { createServerLogger } from '@/lib/logger';
import { posthogServer } from '@/lib/posthog-server';
import {
  addDays,
  addHours,
  differenceInDays,
  differenceInHours,
  format,
} from 'date-fns';
import type { OnboardingEmailData } from '@/lib/email';

const logger = createServerLogger({ action: 'onboarding-sequence' });

// Schedule offsets in hours from sequence creation
const STEP_OFFSETS_HOURS = [1, 48, 96, 168, 240, 288];
const MIN_GAP_HOURS = 12;

/**
 * Creates an onboarding sequence for a FREE-tier ticket
 */
export const createOnboardingSequence = async (
  userId: string,
  ticketId: string,
) => {
  // Guard: skip if user already has an active sequence
  const existing = await db.onboardingSequence.findFirst({
    where: {
      userId,
      completedAt: null,
    },
  });

  if (existing) {
    logger.debug(
      'Skipping onboarding sequence — user already has active sequence',
      {
        userId,
        ticketId,
        existingSequenceId: existing.id,
      },
    );
    return null;
  }

  // Guard: skip if ticket tier is not FREE
  const ticket = await db.ticket.findUnique({
    where: { id: ticketId },
    select: { tier: true, issuedAt: true },
  });

  if (!ticket || ticket.tier !== TicketTier.FREE) {
    return null;
  }

  // Guard: skip if user has email notifications disabled
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { notificationPreferences: true },
  });

  if (user?.notificationPreferences) {
    const prefs = user.notificationPreferences as { email?: boolean };
    if (prefs.email === false) {
      return null;
    }
  }

  // Guard: skip if 14-day window has already passed
  const deadlineDate = addDays(ticket.issuedAt, 14);
  if (deadlineDate < new Date()) {
    return null;
  }

  const now = new Date();
  const nextSendAt = addHours(now, 1);

  const sequence = await db.onboardingSequence.create({
    data: {
      userId,
      ticketId,
      currentStep: 1,
      nextSendAt,
    },
  });

  if (posthogServer) {
    posthogServer.capture({
      distinctId: userId,
      event: 'onboarding_sequence_started',
      properties: { ticketId },
    });
    await posthogServer.shutdown();
  }

  logger.info('Created onboarding sequence', {
    sequenceId: sequence.id,
    userId,
    ticketId,
    nextSendAt: nextSendAt.toISOString(),
  });

  return sequence;
};

/**
 * Checks exit conditions for a sequence.
 * Returns the exit reason if the sequence should stop, or null to continue.
 */
export const checkExitConditions = async (sequence: {
  id: string;
  userId: string;
  ticketId: string;
  currentStep: number;
}): Promise<OnboardingExitReason | null> => {
  const ticket = await db.ticket.findUnique({
    where: { id: sequence.ticketId },
    select: { tier: true, status: true, issuedAt: true },
  });

  // Ticket deleted (cascading delete would remove the sequence too, but check anyway)
  if (!ticket) {
    return OnboardingExitReason.TICKET_DELETED;
  }

  // Ticket upgraded
  if (ticket.tier !== TicketTier.FREE) {
    return OnboardingExitReason.UPGRADED;
  }

  // Ticket paid or cancelled
  if (ticket.status === 'PAID' || ticket.status === 'CANCELLED') {
    return OnboardingExitReason.TICKET_PAID;
  }

  // User unsubscribed from email
  const user = await db.user.findUnique({
    where: { id: sequence.userId },
    select: { notificationPreferences: true },
  });

  if (user?.notificationPreferences) {
    const prefs = user.notificationPreferences as { email?: boolean };
    if (prefs.email === false) {
      return OnboardingExitReason.UNSUBSCRIBED;
    }
  }

  // Deadline passed — stop sending motivational emails after step 3
  const deadline = addDays(ticket.issuedAt, 14);
  if (deadline < new Date() && sequence.currentStep > 3) {
    return OnboardingExitReason.DEADLINE_PASSED;
  }

  return null;
};

/**
 * Calculates when the next email should be sent.
 * Compresses schedule if the 14-day deadline is approaching.
 */
export const calculateNextSendAt = (
  sequenceCreatedAt: Date,
  nextStep: number,
  ticketIssuedAt: Date,
): Date => {
  const discountDeadline = addDays(ticketIssuedAt, 14);
  const now = new Date();

  // Default schedule
  const defaultOffset = STEP_OFFSETS_HOURS[nextStep - 1];
  if (defaultOffset === undefined) {
    // Past step 6, shouldn't happen
    return addHours(now, 1);
  }

  const defaultSendAt = addHours(sequenceCreatedAt, defaultOffset);

  // If default schedule fits before deadline, use it
  if (defaultSendAt < discountDeadline) {
    return defaultSendAt;
  }

  // Compress remaining steps evenly with minimum 12h gap
  const hoursUntilDeadline = differenceInHours(discountDeadline, now);
  const remainingSteps = 6 - nextStep + 1;

  if (remainingSteps <= 0 || hoursUntilDeadline <= 0) {
    return addHours(now, 1);
  }

  const gapHours = Math.max(
    MIN_GAP_HOURS,
    Math.floor(hoursUntilDeadline / remainingSteps),
  );

  return addHours(now, gapHours);
};

/**
 * Advances a sequence to the next step or marks it complete.
 */
export const advanceSequence = async (
  sequenceId: string,
  currentStep: number,
  ticketIssuedAt: Date,
  sequenceCreatedAt: Date,
) => {
  if (currentStep >= 6) {
    await db.onboardingSequence.update({
      where: { id: sequenceId },
      data: {
        completedAt: new Date(),
        exitReason: OnboardingExitReason.SEQUENCE_COMPLETE,
      },
    });
    return;
  }

  const nextStep = currentStep + 1;
  const nextSendAt = calculateNextSendAt(
    sequenceCreatedAt,
    nextStep,
    ticketIssuedAt,
  );

  await db.onboardingSequence.update({
    where: { id: sequenceId },
    data: {
      currentStep: nextStep,
      nextSendAt,
    },
  });
};

/**
 * Exits all active onboarding sequences for a given ticket.
 * Called by payment webhook and ticket deletion.
 */
export const exitOnboardingSequenceForTicket = async (
  ticketId: string,
  reason: OnboardingExitReason,
) => {
  await db.onboardingSequence.updateMany({
    where: {
      ticketId,
      completedAt: null,
    },
    data: {
      completedAt: new Date(),
      exitReason: reason,
    },
  });
};

/**
 * Assembles the props for each onboarding email template.
 */
export const buildOnboardingEmailData = async (
  step: number,
  user: { name?: string | null; email: string },
  ticket: {
    id: string;
    pcnNumber: string;
    issuer: string;
    initialAmount: number;
    issuedAt: Date;
    contraventionCode: string;
    prediction?: { numberOfCases: number } | null;
  },
): Promise<OnboardingEmailData> => {
  const name = user.name || undefined;
  const ticketId = ticket.id;
  const { pcnNumber } = ticket;
  const { issuer } = ticket;

  // Amounts: stored in pence, convert to pounds
  const fullAmountPounds = (ticket.initialAmount / 100).toFixed(2);
  const discountAmountPounds = (ticket.initialAmount / 200).toFixed(2);

  const discountDeadline = addDays(ticket.issuedAt, 14);
  const daysUntilDiscount = Math.max(
    0,
    differenceInDays(discountDeadline, new Date()),
  );
  const deadlineDate = format(discountDeadline, 'd MMMM yyyy');

  const numberOfCases = ticket.prediction?.numberOfCases || 0;

  switch (step) {
    case 1:
      return {
        step: 1,
        data: {
          name,
          pcnNumber,
          issuer,
          numberOfCases,
          ticketId,
        },
      };

    case 2:
      return {
        step: 2,
        data: {
          name,
          pcnNumber,
          issuer,
          ticketId,
          discountAmount: discountAmountPounds,
          fullAmount: fullAmountPounds,
          discountDeadline: deadlineDate,
          daysUntilDiscount,
        },
      };

    case 3: {
      // Fetch aggregate issuer stats (public tribunal data, not gated)
      const normalizedIssuer = ticket.issuer.toLowerCase().replace(/\s+/g, '-');
      let issuerAllowedCount = 0;
      let issuerTotalCases = 0;

      const issuerStats = await db.issuerContraventionStats.findFirst({
        where: { issuerId: normalizedIssuer },
        select: { allowedCount: true, totalCases: true },
      });

      if (issuerStats) {
        issuerAllowedCount = issuerStats.allowedCount;
        issuerTotalCases = issuerStats.totalCases;
      } else {
        // Fall back to general contravention stats
        const contraventionStats = await db.contraventionStats.findUnique({
          where: { contraventionCode: ticket.contraventionCode },
          select: { allowedCount: true, totalCases: true },
        });
        if (contraventionStats) {
          issuerAllowedCount = contraventionStats.allowedCount;
          issuerTotalCases = contraventionStats.totalCases;
        }
      }

      return {
        step: 3,
        data: {
          name,
          pcnNumber,
          issuer,
          ticketId,
          issuerAllowedCount,
          issuerTotalCases,
        },
      };
    }

    case 4:
      return {
        step: 4,
        data: {
          name,
          pcnNumber,
          issuer,
          ticketId,
          fullAmount: fullAmountPounds,
        },
      };

    case 5:
      return {
        step: 5,
        data: {
          name,
          pcnNumber,
          ticketId,
          discountAmount: discountAmountPounds,
          fullAmount: fullAmountPounds,
          daysUntilDiscount,
        },
      };

    case 6:
      return {
        step: 6,
        data: {
          name,
          pcnNumber,
          ticketId,
          discountAmount: discountAmountPounds,
          fullAmount: fullAmountPounds,
          deadlineDate,
        },
      };

    default:
      // Fallback to step 1 (shouldn't happen)
      return {
        step: 1,
        data: {
          name,
          pcnNumber,
          issuer,
          numberOfCases,
          ticketId,
        },
      };
  }
};

/**
 * Determines if step 6 should fire early because the deadline is <=2 days away.
 */
export const shouldJumpToFinalStep = (
  currentStep: number,
  ticketIssuedAt: Date,
): boolean => {
  if (currentStep >= 6) return false;
  const deadline = addDays(ticketIssuedAt, 14);
  const daysUntilDeadline = differenceInDays(deadline, new Date());
  return daysUntilDeadline <= 2;
};
