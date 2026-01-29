'use server';

import { revalidatePath } from 'next/cache';
import {
  db,
  TicketTier,
  VerificationStatus,
} from '@parking-ticket-pal/db';
import { getUserId } from '@/utils/user';
import { createServerLogger } from '@/lib/logger';
import {
  startStatusCheck,
  type TicketStatusValue,
} from '@/utils/automation/workerClient';
import { findIssuer } from '@/constants/index';

const logger = createServerLogger({ action: 'checkLiveStatus' });

export type LiveStatusCheckResult = {
  success: boolean;
  jobId?: string; // Job ID for polling
  status?: {
    portalStatus: string;
    mappedStatus: TicketStatusValue | null;
    outstandingAmount: number;
    canChallenge: boolean;
    canPay: boolean;
    screenshotUrl: string;
    checkedAt: string;
  };
  statusUpdated: boolean;
  previousStatus?: string;
  newStatus?: string;
  error?: string;
  errorCode?: string; // e.g., 'PCN_NOT_FOUND', 'BOT_DETECTION'
  errorMessage?: string; // Human-readable error from portal
  // Screenshot captured even on failure (useful for debugging)
  errorScreenshotUrl?: string;
};

/**
 * Check the live status of a ticket on the council portal.
 * PREMIUM tier only - uses agentic browser automation.
 *
 * Updates the ticket status in the database if it has changed,
 * and stores the verification result for display in the UI.
 */
export async function checkLiveStatus(
  ticketId: string,
): Promise<LiveStatusCheckResult> {
  const userId = await getUserId('check live status');

  if (!userId) {
    return {
      success: false,
      statusUpdated: false,
      error: 'You must be signed in to check ticket status.',
    };
  }

  try {
    // Get the ticket with related data
    const ticket = await db.ticket.findUnique({
      where: { id: ticketId },
      include: {
        vehicle: {
          include: {
            user: true,
          },
        },
        verification: true,
      },
    });

    if (!ticket) {
      return {
        success: false,
        statusUpdated: false,
        error: 'Ticket not found.',
      };
    }

    // Verify the ticket belongs to the user
    if (ticket.vehicle.user.id !== userId) {
      return {
        success: false,
        statusUpdated: false,
        error: 'You do not have permission to check this ticket.',
      };
    }

    // Check if user has PREMIUM tier
    if (ticket.tier !== TicketTier.PREMIUM) {
      return {
        success: false,
        statusUpdated: false,
        error: 'Live status check is only available for PREMIUM tickets.',
      };
    }

    // Find the issuer to get portal URL
    const issuer = findIssuer(ticket.issuer);
    const issuerId =
      issuer?.id || ticket.issuer.toLowerCase().replace(/\s+/g, '-');

    logger.info('Starting live status check', {
      ticketId,
      pcnNumber: ticket.pcnNumber,
      issuerId,
    });

    // Start the job - returns immediately with jobId
    // Note: Don't pass portalUrl here - the worker has the correct portal URLs
    // configured for each issuer. The websiteUrl in constants is the general
    // council website, not the PCN portal URL.
    const { jobId } = await startStatusCheck({
      ticketId,
      pcnNumber: ticket.pcnNumber,
      vehicleReg: ticket.vehicle.registrationNumber,
      issuerId,
    });

    logger.info('Status check job started', { ticketId, jobId });

    // Store the pending verification with jobId so we can poll later
    await db.verification.upsert({
      where: { ticketId },
      create: {
        type: 'TICKET',
        ticketId,
        status: VerificationStatus.UNVERIFIED, // UNVERIFIED = pending job
        verifiedAt: new Date(),
        metadata: {
          jobId,
          checkedAt: new Date().toISOString(),
          issuerId,
        },
      },
      update: {
        status: VerificationStatus.UNVERIFIED, // UNVERIFIED = pending job
        verifiedAt: new Date(),
        metadata: {
          jobId,
          checkedAt: new Date().toISOString(),
          issuerId,
        },
      },
    });

    revalidatePath('/tickets/[id]', 'page');

    // Return immediately - frontend will poll for result
    return {
      success: true,
      jobId,
      statusUpdated: false,
    };
  } catch (error) {
    logger.error(
      'Error checking live status',
      { ticketId },
      error instanceof Error ? error : new Error(String(error)),
    );

    return {
      success: false,
      statusUpdated: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to check ticket status.',
    };
  }
}

/**
 * Get the cached live status from the last verification check.
 */
export async function getCachedLiveStatus(ticketId: string) {
  const verification = await db.verification.findUnique({
    where: { ticketId },
  });

  if (!verification || verification.type !== 'TICKET') {
    return null;
  }

  const metadata = verification.metadata as {
    portalStatus?: string;
    mappedStatus?: string;
    outstandingAmount?: number;
    canChallenge?: boolean;
    canPay?: boolean;
    screenshotUrl?: string;
    checkedAt?: string;
    // Error fields for failed checks
    error?: string;
    errorMessage?: string;
  } | null;

  if (!metadata) {
    return null;
  }

  return {
    portalStatus: metadata.portalStatus || '',
    mappedStatus: metadata.mappedStatus || null,
    outstandingAmount: metadata.outstandingAmount || 0,
    canChallenge: metadata.canChallenge ?? false,
    canPay: metadata.canPay ?? false,
    screenshotUrl: metadata.screenshotUrl || '',
    checkedAt: metadata.checkedAt || verification.verifiedAt?.toISOString(),
    // Include error info for failed checks
    status: verification.status,
    error: metadata.error,
    errorMessage: metadata.errorMessage,
  };
}
