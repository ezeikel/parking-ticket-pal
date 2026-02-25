'use server';

import { revalidatePath } from 'next/cache';
import {
  db,
  Prisma,
  ChallengeStatus,
  PendingIssuerStatus,
  TicketStatus,
} from '@parking-ticket-pal/db';
import { findIssuer } from '@/constants/index';
import { getUserId } from '@/utils/user';
import { createServerLogger } from '@/lib/logger';
import {
  requestIssuerGeneration,
  startChallenge,
  runChallenge,
  isIssuerSupported,
  type Address,
} from '@/utils/automation/workerClient';
import { track } from '@/utils/analytics-server';
import { TRACKING_EVENTS } from '@/constants/events';

const logger = createServerLogger({ action: 'autoChallenge' });

/**
 * Check if dry-run mode is enabled via environment variable.
 * When true, automations will fill forms but skip final submission.
 */
const isDryRunEnabled = () => process.env.AUTOMATION_DRY_RUN === 'true';

/**
 * Generate a temporary ID for dry runs (not stored in DB).
 * Format: dry-run-{timestamp}-{random}
 */
const generateDryRunId = () =>
  `dry-run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export type AutoChallengeStatus =
  | 'started' // Challenge job started (async - poll for progress)
  | 'submitted' // Challenge submitted successfully
  | 'submitting' // Currently being submitted (legacy sync mode)
  | 'dry_run_complete' // Dry run completed (form filled but not submitted)
  | 'generating_automation' // Code generation in progress for this issuer
  | 'automation_pending_review' // PR created, awaiting human review
  | 'unsupported' // Issuer not supported, generation triggered
  | 'error'; // Error occurred

export type AutoChallengeResult = {
  success: boolean;
  challengeId?: string;
  jobId?: string; // Worker job ID for polling
  pendingChallengeId?: string; // For queued challenges while waiting for automation
  status: AutoChallengeStatus;
  message: string;
  prUrl?: string; // GitHub PR URL if automation is pending review
  // Dry run results (not persisted to DB)
  dryRunResults?: {
    screenshotUrls: string[];
    videoUrl?: string;
    challengeText?: string;
  };
};

/**
 * Initiates an auto-challenge for a parking ticket.
 *
 * Async Flow (new):
 * 1. Creates/updates Challenge record with status IN_PROGRESS
 * 2. Calls worker which returns jobId immediately
 * 3. Updates Challenge with workerJobId for polling
 * 4. Returns jobId and challengeId for frontend polling
 *
 * Retry Support:
 * Pass existingChallengeId to retry a failed challenge with updated reason.
 *
 * Legacy Fallback:
 * For unsupported issuers, triggers code generation and queues challenge.
 */
export async function initiateAutoChallenge(
  ticketId: string,
  challengeReason: string,
  customReason?: string,
  existingChallengeId?: string, // For retry - reuse existing challenge record
): Promise<AutoChallengeResult> {
  const userId = await getUserId('initiate auto-challenge');

  if (!userId) {
    return {
      success: false,
      status: 'error',
      message: 'You must be signed in to challenge a ticket.',
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
      },
    });

    if (!ticket) {
      return {
        success: false,
        status: 'error',
        message: 'Ticket not found.',
      };
    }

    // Verify the ticket belongs to the user
    if (ticket.vehicle.user.id !== userId) {
      return {
        success: false,
        status: 'error',
        message: 'You do not have permission to challenge this ticket.',
      };
    }

    // Pre-flight check: Ensure ticket is in a challengeable state
    const nonChallengeableStatuses: TicketStatus[] = [
      TicketStatus.PAID,
      TicketStatus.CANCELLED,
      TicketStatus.REPRESENTATION_ACCEPTED,
      TicketStatus.APPEAL_UPHELD,
      TicketStatus.CHARGE_CERTIFICATE,
      TicketStatus.ORDER_FOR_RECOVERY,
      TicketStatus.ENFORCEMENT_BAILIFF_STAGE,
      TicketStatus.COURT_PROCEEDINGS,
      TicketStatus.CCJ_ISSUED,
    ];

    if (nonChallengeableStatuses.includes(ticket.status)) {
      const statusMessages: Record<TicketStatus, string> = {
        [TicketStatus.PAID]: 'This ticket has been paid.',
        [TicketStatus.CANCELLED]: 'This ticket has been cancelled.',
        [TicketStatus.REPRESENTATION_ACCEPTED]:
          'Your challenge has already been accepted.',
        [TicketStatus.APPEAL_UPHELD]: 'Your appeal has already been upheld.',
        [TicketStatus.CHARGE_CERTIFICATE]:
          'This ticket has progressed to a charge certificate. Challenge is no longer available.',
        [TicketStatus.ORDER_FOR_RECOVERY]:
          'This ticket is in debt recovery. Challenge is no longer available.',
        [TicketStatus.ENFORCEMENT_BAILIFF_STAGE]:
          'This ticket is at enforcement stage. Challenge is no longer available.',
        [TicketStatus.COURT_PROCEEDINGS]:
          'This ticket is in court proceedings. Challenge is no longer available.',
        [TicketStatus.CCJ_ISSUED]:
          'A CCJ has been issued. Challenge is no longer available.',
        // Default for any other status (shouldn't reach here)
        [TicketStatus.ISSUED_DISCOUNT_PERIOD]: '',
        [TicketStatus.ISSUED_FULL_CHARGE]: '',
        [TicketStatus.NOTICE_TO_OWNER]: '',
        [TicketStatus.FORMAL_REPRESENTATION]: '',
        [TicketStatus.NOTICE_OF_REJECTION]: '',
        [TicketStatus.TEC_OUT_OF_TIME_APPLICATION]: '',
        [TicketStatus.PE2_PE3_APPLICATION]: '',
        [TicketStatus.APPEAL_TO_TRIBUNAL]: '',
        [TicketStatus.NOTICE_TO_KEEPER]: '',
        [TicketStatus.APPEAL_SUBMITTED_TO_OPERATOR]: '',
        [TicketStatus.APPEAL_REJECTED_BY_OPERATOR]: '',
        [TicketStatus.POPLA_APPEAL]: '',
        [TicketStatus.IAS_APPEAL]: '',
        [TicketStatus.APPEAL_REJECTED]: '',
        [TicketStatus.DEBT_COLLECTION]: '',
      };

      return {
        success: false,
        status: 'error',
        message:
          statusMessages[ticket.status] ||
          'This ticket cannot be challenged in its current state.',
      };
    }

    // Find the issuer
    const issuer = findIssuer(ticket.issuer);
    const issuerId =
      issuer?.id || ticket.issuer.toLowerCase().replace(/\s+/g, '-');
    const issuerName = issuer?.name || ticket.issuer;

    // Check if worker supports this issuer
    const hasWorkerSupport = await isIssuerSupported(issuerId);

    const dryRun = isDryRunEnabled();

    // Ensure user has an email (required for challenge submissions)
    if (!ticket.vehicle.user.email) {
      return {
        success: false,
        status: 'error',
        message:
          'An email address is required to challenge a ticket. Please update your profile.',
      };
    }

    // Transform ticket to the format expected by runWorkerChallenge
    const userAddress = ticket.vehicle.user.address as {
      line1?: string | null;
      line2?: string | null;
      city?: string | null;
      postcode?: string | null;
      country?: string | null;
    } | null;

    const ticketForChallenge: TicketForChallenge = {
      id: ticket.id,
      pcnNumber: ticket.pcnNumber,
      vehicle: {
        registrationNumber: ticket.vehicle.registrationNumber,
        make: ticket.vehicle.make,
        model: ticket.vehicle.model,
        user: {
          id: ticket.vehicle.user.id,
          name: ticket.vehicle.user.name,
          email: ticket.vehicle.user.email,
          phoneNumber: ticket.vehicle.user.phoneNumber,
          address: userAddress,
        },
      },
    };

    // ========================================
    // Scenario 1: Worker-supported automation (async)
    // ========================================
    if (hasWorkerSupport) {
      if (dryRun) {
        // Dry run: no DB record needed - use legacy sync mode
        // TODO: Consider supporting async dry runs in the future
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        return await runWorkerChallengeLegacy(
          ticketForChallenge,
          issuerId,
          challengeReason,
          customReason,
          null, // No challenge ID - dry run
        );
      }

      // Real run: create or update challenge record
      let challenge;
      if (existingChallengeId) {
        // Retry: update existing challenge record
        challenge = await db.challenge.update({
          where: { id: existingChallengeId },
          data: {
            reason: challengeReason,
            customReason: customReason || null,
            status: ChallengeStatus.IN_PROGRESS,
            workerJobId: null, // Clear old job ID
            metadata: Prisma.DbNull, // Clear old results
          },
        });
      } else {
        // New challenge: create record
        challenge = await db.challenge.create({
          data: {
            ticketId: ticket.id,
            type: 'AUTO_CHALLENGE',
            reason: challengeReason,
            customReason: customReason || null,
            status: ChallengeStatus.IN_PROGRESS,
          },
        });
      }

      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      return await runWorkerChallengeAsync(
        ticketForChallenge,
        issuerId,
        challengeReason,
        customReason,
        challenge.id,
      );
    }

    // ========================================
    // Scenario 2: No built-in support
    // Check PendingIssuer status or trigger generation
    // ========================================

    // Check if there's a pending issuer record
    const pendingIssuer = await db.pendingIssuer.findUnique({
      where: { issuerId },
    });

    // If a PR has already been merged, the automation should be available
    // This shouldn't happen in normal flow (code would be deployed), but handle it
    if (pendingIssuer?.status === PendingIssuerStatus.PR_MERGED) {
      logger.warn('PR merged but automation not found in code', {
        issuerId,
        prUrl: pendingIssuer.prUrl,
      });
      return {
        success: false,
        status: 'error',
        message:
          'Automation was added but not yet deployed. Please try again in a few minutes.',
      };
    }

    // If PR is created, inform user it's pending review
    if (pendingIssuer?.status === PendingIssuerStatus.PR_CREATED) {
      // Queue the challenge for later processing
      const pendingChallenge = await db.pendingChallenge.create({
        data: {
          ticketId: ticket.id,
          issuerId,
          challengeReason,
          customReason: customReason || null,
        },
      });

      return {
        success: true,
        pendingChallengeId: pendingChallenge.id,
        status: 'automation_pending_review',
        message: `We're reviewing the automation for ${issuerName}. Your challenge has been queued and will be processed once approved. In the meantime, you can generate a challenge letter to submit manually.`,
        prUrl: pendingIssuer.prUrl || undefined,
      };
    }

    // If generation is in progress
    if (pendingIssuer?.status === PendingIssuerStatus.GENERATING) {
      // Queue the challenge for later processing
      const pendingChallenge = await db.pendingChallenge.create({
        data: {
          ticketId: ticket.id,
          issuerId,
          challengeReason,
          customReason: customReason || null,
        },
      });

      return {
        success: true,
        pendingChallengeId: pendingChallenge.id,
        status: 'generating_automation',
        message: `We're adding support for ${issuerName}. Your challenge has been queued and will be processed once ready. In the meantime, you can generate a challenge letter to submit manually.`,
      };
    }

    // If previous generation failed, try again
    if (pendingIssuer?.status === PendingIssuerStatus.FAILED) {
      // Update to retry
      await db.pendingIssuer.update({
        where: { id: pendingIssuer.id },
        data: {
          status: PendingIssuerStatus.GENERATING,
          failureReason: null,
          requestedBy: userId,
          requestedAt: new Date(),
        },
      });

      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      return await triggerIssuerGeneration(
        pendingIssuer.id,
        issuerId,
        issuerName,
        issuer && 'websiteUrl' in issuer ? issuer.websiteUrl : undefined,
        ticket.id,
        challengeReason,
        customReason,
        userId,
      );
    }

    // No pending issuer record - create one and trigger generation
    const newPendingIssuer = await db.pendingIssuer.create({
      data: {
        issuerId,
        issuerName,
        issuerWebsite:
          issuer && 'websiteUrl' in issuer ? issuer.websiteUrl : null,
        status: PendingIssuerStatus.GENERATING,
        requestedBy: userId,
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    return await triggerIssuerGeneration(
      newPendingIssuer.id,
      issuerId,
      issuerName,
      issuer && 'websiteUrl' in issuer ? issuer.websiteUrl : undefined,
      ticket.id,
      challengeReason,
      customReason,
      userId,
    );
  } catch (error) {
    logger.error(
      'Error initiating auto-challenge',
      {
        ticketId,
        challengeReason,
      },
      error instanceof Error ? error : new Error(String(error)),
    );

    return {
      success: false,
      status: 'error',
      message:
        error instanceof Error
          ? error.message
          : 'Failed to initiate challenge.',
    };
  }
}

/**
 * Ticket type for worker challenge (minimal fields needed)
 */
type TicketForChallenge = {
  id: string;
  pcnNumber: string;
  vehicle: {
    registrationNumber: string;
    make?: string | null;
    model?: string | null;
    user: {
      id: string;
      name: string | null;
      email: string;
      phoneNumber?: string | null;
      address?: {
        line1?: string | null;
        line2?: string | null;
        city?: string | null;
        postcode?: string | null;
        country?: string | null;
      } | null;
    };
  };
};

/**
 * Run automation via the worker service (ASYNC mode).
 * Returns immediately with jobId for polling.
 *
 * The worker runs the automation in the background and sends a webhook on completion.
 * Frontend polls /api/challenges/[id]/status for progress updates.
 */
async function runWorkerChallengeAsync(
  ticket: TicketForChallenge,
  issuerId: string,
  challengeReason: string,
  customReason: string | undefined,
  challengeId: string,
): Promise<AutoChallengeResult> {
  const startTime = Date.now();
  await track(TRACKING_EVENTS.AUTOMATION_STARTED, {
    ticket_id: ticket.id,
    issuer: issuerId,
    action: 'challenge',
  });

  try {
    // Build user address with fallback defaults
    const userAddress: Address = {
      line1: ticket.vehicle.user.address?.line1 || '',
      line2: ticket.vehicle.user.address?.line2 || undefined,
      city: ticket.vehicle.user.address?.city || undefined,
      postcode: ticket.vehicle.user.address?.postcode || '',
      country: ticket.vehicle.user.address?.country || 'United Kingdom',
    };

    const result = await startChallenge({
      issuerId,
      pcnNumber: ticket.pcnNumber,
      vehicleReg: ticket.vehicle.registrationNumber,
      vehicleMake: ticket.vehicle.make || undefined,
      vehicleModel: ticket.vehicle.model || undefined,
      challengeReason,
      additionalDetails: customReason,
      ticketId: ticket.id,
      challengeId,
      user: {
        id: ticket.vehicle.user.id,
        name: ticket.vehicle.user.name || 'Unknown',
        email: ticket.vehicle.user.email,
        phoneNumber: ticket.vehicle.user.phoneNumber || undefined,
        address: userAddress,
      },
      dryRun: false,
    });

    if (result.success && result.jobId) {
      // Update challenge with worker job ID for polling
      await db.challenge.update({
        where: { id: challengeId },
        data: {
          workerJobId: result.jobId,
        },
      });

      revalidatePath('/tickets/[id]', 'page');

      await track(TRACKING_EVENTS.AUTOMATION_COMPLETED, {
        ticket_id: ticket.id,
        issuer: issuerId,
        action: 'challenge',
        duration_ms: Date.now() - startTime,
      });

      return {
        success: true,
        challengeId,
        jobId: result.jobId,
        status: 'started',
        message: 'Challenge automation started. Tracking progress...',
      };
    }

    // Failed to start job
    await db.challenge.update({
      where: { id: challengeId },
      data: {
        status: ChallengeStatus.ERROR,
        metadata: {
          error: result.error || 'Failed to start challenge job',
        },
      },
    });

    await track(TRACKING_EVENTS.AUTOMATION_FAILED, {
      ticket_id: ticket.id,
      issuer: issuerId,
      action: 'challenge',
      error: result.error || 'Failed to start challenge job',
      duration_ms: Date.now() - startTime,
    });

    return {
      success: false,
      challengeId,
      status: 'error',
      message: result.error || 'Failed to start challenge automation.',
    };
  } catch (error) {
    // Update challenge with error
    await db.challenge.update({
      where: { id: challengeId },
      data: {
        status: ChallengeStatus.ERROR,
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      },
    });

    await track(TRACKING_EVENTS.AUTOMATION_FAILED, {
      ticket_id: ticket.id,
      issuer: issuerId,
      action: 'challenge',
      error: error instanceof Error ? error.message : 'Unknown error',
      duration_ms: Date.now() - startTime,
    });

    throw error;
  }
}

/**
 * Run automation via the worker service (LEGACY sync mode).
 * The worker has Playwright and can access .gov.uk sites from its Hetzner server.
 *
 * For dry runs: No DB record is created. Results are returned directly.
 * For real runs: Challenge record is created and updated with results.
 *
 * @deprecated Use runWorkerChallengeAsync for real runs. This is kept for dry runs only.
 */
async function runWorkerChallengeLegacy(
  ticket: TicketForChallenge,
  issuerId: string,
  challengeReason: string,
  customReason: string | undefined,
  challengeId: string | null, // null for dry runs
): Promise<AutoChallengeResult> {
  const dryRun = isDryRunEnabled();

  // For dry runs, generate a temporary ID for R2 storage paths
  const storageId = dryRun ? generateDryRunId() : challengeId!;

  try {
    // Build user address with fallback defaults
    const userAddress: Address = {
      line1: ticket.vehicle.user.address?.line1 || '',
      line2: ticket.vehicle.user.address?.line2 || undefined,
      city: ticket.vehicle.user.address?.city || undefined,
      postcode: ticket.vehicle.user.address?.postcode || '',
      country: ticket.vehicle.user.address?.country || 'United Kingdom',
    };

    const result = await runChallenge({
      issuerId,
      pcnNumber: ticket.pcnNumber,
      vehicleReg: ticket.vehicle.registrationNumber,
      vehicleMake: ticket.vehicle.make || undefined,
      vehicleModel: ticket.vehicle.model || undefined,
      challengeReason,
      additionalDetails: customReason,
      ticketId: ticket.id,
      challengeId: storageId,
      user: {
        id: ticket.vehicle.user.id,
        name: ticket.vehicle.user.name || 'Unknown',
        email: ticket.vehicle.user.email,
        phoneNumber: ticket.vehicle.user.phoneNumber || undefined,
        address: userAddress,
      },
      dryRun,
    });

    if (result && result.success) {
      // Dry run: Return results directly without DB update
      if (dryRun) {
        return {
          success: true,
          status: 'dry_run_complete',
          message:
            'Dry run completed. Form was filled but not submitted. Check screenshots for review.',
          dryRunResults: {
            screenshotUrls: result.screenshotUrls || [],
            videoUrl: result.videoUrl,
            challengeText: result.challengeText,
          },
        };
      }

      // Normal submission - update DB record
      await db.challenge.update({
        where: { id: challengeId! },
        data: {
          status: ChallengeStatus.SUCCESS,
          submittedAt: new Date(),
          metadata: {
            challengeSubmitted: true,
            submittedAt: new Date().toISOString(),
            challengeText: result.challengeText,
            screenshotUrls: result.screenshotUrls || [],
            videoUrl: result.videoUrl,
            referenceNumber: result.referenceNumber,
          },
        },
      });

      revalidatePath('/tickets/[id]', 'page');

      return {
        success: true,
        challengeId: challengeId!,
        status: 'submitted',
        message: 'Your challenge has been submitted successfully.',
      };
    }

    throw new Error(result.error || 'Challenge submission failed');
  } catch (error) {
    // Only update DB if this is a real run (not dry run)
    if (!dryRun && challengeId) {
      await db.challenge.update({
        where: { id: challengeId },
        data: {
          status: ChallengeStatus.ERROR,
          metadata: {
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        },
      });
    }

    throw error;
  }
}

/**
 * Trigger automation code generation for an unsupported issuer.
 * Also creates a pending challenge record.
 */
async function triggerIssuerGeneration(
  pendingIssuerId: string,
  issuerId: string,
  issuerName: string,
  issuerWebsite: string | undefined,
  ticketId: string,
  challengeReason: string,
  customReason: string | undefined,
  _userId: string, // For future use (notifications, tracking)
): Promise<AutoChallengeResult> {
  // Queue the challenge for later processing
  const pendingChallenge = await db.pendingChallenge.create({
    data: {
      ticketId,
      issuerId,
      challengeReason,
      customReason: customReason || null,
    },
  });

  // Trigger generation on worker
  const result = await requestIssuerGeneration({
    issuerId,
    issuerName,
    issuerWebsite,
  });

  if (!result.success) {
    logger.error('Failed to start issuer generation', {
      pendingIssuerId,
      issuerId,
      error: result.error,
    });

    // Update status to failed
    await db.pendingIssuer.update({
      where: { id: pendingIssuerId },
      data: {
        status: PendingIssuerStatus.FAILED,
        failureReason: result.error || 'Failed to start generation',
      },
    });

    // Update pending challenge status
    await db.pendingChallenge.update({
      where: { id: pendingChallenge.id },
      data: { status: 'FAILED' },
    });

    return {
      success: false,
      status: 'error',
      message: `Failed to start automation generation for ${issuerName}. Please try again later or use the challenge letter option.`,
    };
  }

  logger.info('Issuer generation started', {
    pendingIssuerId,
    issuerId,
    issuerName,
    jobId: result.jobId,
    pendingChallengeId: pendingChallenge.id,
  });

  return {
    success: true,
    pendingChallengeId: pendingChallenge.id,
    status: 'unsupported',
    message: `We're adding support for ${issuerName}. This typically takes 24-48 hours. Your challenge has been queued and you'll be notified when it's processed. In the meantime, you can generate a challenge letter to submit manually.`,
  };
}

/**
 * Get the status of a challenge
 */
export async function getChallengeStatus(
  challengeId: string,
): Promise<{ status: ChallengeStatus; metadata: unknown } | null> {
  const challenge = await db.challenge.findUnique({
    where: { id: challengeId },
    select: {
      status: true,
      metadata: true,
    },
  });

  return challenge;
}

/**
 * Get the status of a pending challenge (for unsupported issuers)
 */
export async function getPendingChallengeStatus(pendingChallengeId: string) {
  const pendingChallenge = await db.pendingChallenge.findUnique({
    where: { id: pendingChallengeId },
  });

  if (!pendingChallenge) {
    return null;
  }

  const pendingIssuer = await db.pendingIssuer.findUnique({
    where: { issuerId: pendingChallenge.issuerId },
  });

  return {
    challenge: pendingChallenge,
    issuer: pendingIssuer,
  };
}
