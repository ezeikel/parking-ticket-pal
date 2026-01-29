'use server';

import { revalidatePath } from 'next/cache';
import {
  db,
  TicketStatus,
  TicketTier,
  VerificationStatus,
} from '@parking-ticket-pal/db';
import { getUserId } from '@/utils/user';
import { createServerLogger } from '@/lib/logger';
import {
  checkLiveStatus as checkLiveStatusWorker,
  type TicketStatusValue,
} from '@/utils/automation/workerClient';
import { findIssuer } from '@/constants/index';

const logger = createServerLogger({ action: 'checkLiveStatus' });

export type LiveStatusCheckResult = {
  success: boolean;
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

    logger.info('Checking live status', {
      ticketId,
      pcnNumber: ticket.pcnNumber,
      issuerId,
    });

    // Call the worker to check live status
    // Note: Don't pass portalUrl here - the worker has the correct portal URLs
    // configured for each issuer. The websiteUrl in constants is the general
    // council website, not the PCN portal URL.
    const result = await checkLiveStatusWorker({
      ticketId,
      pcnNumber: ticket.pcnNumber,
      vehicleReg: ticket.vehicle.registrationNumber,
      issuerId,
    });

    if (!result.success) {
      logger.error('Live status check failed', {
        ticketId,
        error: result.error,
        errorMessage: result.errorMessage,
        screenshotUrl: result.screenshotUrl,
      });

      // Store the failed verification result so UI can show it on page refresh
      await db.verification.upsert({
        where: { ticketId },
        create: {
          type: 'TICKET',
          ticketId,
          status: VerificationStatus.FAILED,
          verifiedAt: new Date(),
          metadata: {
            error: result.error,
            errorMessage: result.errorMessage,
            screenshotUrl: result.screenshotUrl,
            checkedAt: result.checkedAt || new Date().toISOString(),
            // Include any partial data we got
            portalStatus: result.portalStatus || '',
            outstandingAmount: result.outstandingAmount || 0,
            canChallenge: false,
            canPay: false,
          },
        },
        update: {
          status: VerificationStatus.FAILED,
          verifiedAt: new Date(),
          metadata: {
            error: result.error,
            errorMessage: result.errorMessage,
            screenshotUrl: result.screenshotUrl,
            checkedAt: result.checkedAt || new Date().toISOString(),
            portalStatus: result.portalStatus || '',
            outstandingAmount: result.outstandingAmount || 0,
            canChallenge: false,
            canPay: false,
          },
        },
      });

      revalidatePath('/tickets/[id]', 'page');

      return {
        success: false,
        statusUpdated: false,
        error: result.error || 'Failed to check status on council portal.',
        errorCode: result.error, // e.g., 'PCN_NOT_FOUND'
        errorMessage: result.errorMessage, // e.g., 'We cannot match a case...'
        // Include screenshot even on failure for debugging
        errorScreenshotUrl: result.screenshotUrl || undefined,
      };
    }

    // Store verification result
    await db.verification.upsert({
      where: { ticketId },
      create: {
        type: 'TICKET',
        ticketId,
        status: VerificationStatus.VERIFIED,
        verifiedAt: new Date(),
        metadata: {
          portalStatus: result.portalStatus,
          mappedStatus: result.mappedStatus,
          outstandingAmount: result.outstandingAmount,
          canChallenge: result.canChallenge,
          canPay: result.canPay,
          paymentDeadline: result.paymentDeadline,
          screenshotUrl: result.screenshotUrl,
          checkedAt: result.checkedAt,
        },
      },
      update: {
        status: VerificationStatus.VERIFIED,
        verifiedAt: new Date(),
        metadata: {
          portalStatus: result.portalStatus,
          mappedStatus: result.mappedStatus,
          outstandingAmount: result.outstandingAmount,
          canChallenge: result.canChallenge,
          canPay: result.canPay,
          paymentDeadline: result.paymentDeadline,
          screenshotUrl: result.screenshotUrl,
          checkedAt: result.checkedAt,
        },
      },
    });

    // Check if we should update the ticket status
    let statusUpdated = false;
    const previousStatus = ticket.status;

    if (result.mappedStatus && result.mappedStatus !== ticket.status) {
      // Map the string status to the enum
      const newStatus = result.mappedStatus as TicketStatus;

      // Only update if the new status is a "terminal" status or indicates progression
      const terminalStatuses: TicketStatus[] = [
        TicketStatus.PAID,
        TicketStatus.CANCELLED,
        TicketStatus.REPRESENTATION_ACCEPTED,
        TicketStatus.CHARGE_CERTIFICATE,
        TicketStatus.ENFORCEMENT_BAILIFF_STAGE,
      ];

      if (terminalStatuses.includes(newStatus)) {
        await db.ticket.update({
          where: { id: ticketId },
          data: {
            status: newStatus,
            statusUpdatedAt: new Date(),
            statusUpdatedBy: 'LIVE_STATUS_CHECK',
          },
        });
        statusUpdated = true;

        logger.info('Ticket status updated from live check', {
          ticketId,
          previousStatus,
          newStatus,
        });
      }
    }

    revalidatePath('/tickets/[id]', 'page');

    return {
      success: true,
      status: {
        portalStatus: result.portalStatus,
        mappedStatus: result.mappedStatus,
        outstandingAmount: result.outstandingAmount,
        canChallenge: result.canChallenge,
        canPay: result.canPay,
        screenshotUrl: result.screenshotUrl,
        checkedAt: result.checkedAt,
      },
      statusUpdated,
      previousStatus: statusUpdated ? previousStatus : undefined,
      newStatus: statusUpdated ? result.mappedStatus ?? undefined : undefined,
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
