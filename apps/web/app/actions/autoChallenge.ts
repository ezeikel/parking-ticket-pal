'use server';

import { revalidatePath } from 'next/cache';
import {
  db,
  ChallengeStatus,
  PendingIssuerStatus,
} from '@parking-ticket-pal/db';
import { findIssuer, isAutomationSupported } from '@/constants/index';
import { getUserId } from '@/utils/user';
import { createServerLogger } from '@/lib/logger';
import { requestIssuerGeneration } from '@/utils/automation/workerClient';

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

// Dynamic import for built-in automation (Lewisham, Westminster, etc.)
const getAutomation = () => import('@/utils/automation');

export type AutoChallengeStatus =
  | 'submitted' // Challenge submitted successfully
  | 'submitting' // Currently being submitted
  | 'dry_run_complete' // Dry run completed (form filled but not submitted)
  | 'generating_automation' // Code generation in progress for this issuer
  | 'automation_pending_review' // PR created, awaiting human review
  | 'unsupported' // Issuer not supported, generation triggered
  | 'error'; // Error occurred

export type AutoChallengeResult = {
  success: boolean;
  challengeId?: string;
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
 * Simplified Flow:
 * 1. Check if issuer has built-in support (Lewisham, Horizon, etc.) → Run locally
 * 2. No built-in support → Check PendingIssuer status or trigger generation
 *    - Queue the challenge request for later processing
 *    - Offer challenge letter as fallback
 */
export async function initiateAutoChallenge(
  ticketId: string,
  challengeReason: string,
  customReason?: string,
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

    // Find the issuer
    const issuer = findIssuer(ticket.issuer);
    const issuerId =
      issuer?.id || ticket.issuer.toLowerCase().replace(/\s+/g, '-');
    const issuerName = issuer?.name || ticket.issuer;

    // Check if we have built-in automation support
    const hasBuiltInSupport = issuer && isAutomationSupported(issuer.id);

    const dryRun = isDryRunEnabled();

    // ========================================
    // Scenario 1: Built-in automation support
    // ========================================
    if (hasBuiltInSupport) {
      if (dryRun) {
        // Dry run: no DB record needed
        return await runBuiltInAutomation(
          ticket.pcnNumber,
          challengeReason,
          customReason,
          null, // No challenge ID - dry run
        );
      }

      // Real run: create challenge record first
      const challenge = await db.challenge.create({
        data: {
          ticketId: ticket.id,
          type: 'AUTO_CHALLENGE',
          reason: challengeReason,
          customReason: customReason || null,
          status: ChallengeStatus.PENDING,
        },
      });

      return await runBuiltInAutomation(
        ticket.pcnNumber,
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
 * Run the built-in automation for supported issuers (Lewisham, Westminster, etc.)
 *
 * For dry runs: No DB record is created. Results are returned directly.
 * For real runs: Challenge record is created and updated with results.
 */
async function runBuiltInAutomation(
  pcnNumber: string,
  challengeReason: string,
  customReason: string | undefined,
  challengeId: string | null, // null for dry runs
): Promise<AutoChallengeResult> {
  const dryRun = isDryRunEnabled();

  // For dry runs, generate a temporary ID for R2 storage paths
  const storageId = dryRun ? generateDryRunId() : challengeId!;

  try {
    const { challenge } = await getAutomation();
    const result = await challenge(pcnNumber, challengeReason, customReason, {
      dryRun,
      challengeId: storageId,
      recordVideo: true, // Always record for audit trail
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

    throw new Error('Challenge submission failed');
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
