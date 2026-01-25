'use server';

import { revalidatePath } from 'next/cache';
import { db, ChallengeStatus, IssuerAutomationStatus } from '@parking-ticket-pal/db';
import { Address } from '@parking-ticket-pal/types';
import { findIssuer, isAutomationSupported } from '@/constants/index';
import { getUserId } from '@/utils/user';
import { createServerLogger } from '@/lib/logger';
import {
  startLearnJob,
  startRunJob,
  type AutomationContext,
  type RecipeStep,
} from '@/utils/automation/hetznerClient';
import generateChallengeContent from '@/utils/ai/generateChallengeContent';

const logger = createServerLogger({ action: 'autoChallenge' });

// Dynamic import for built-in automation (Lewisham, Westminster, etc.)
const getAutomation = () => import('@/utils/automation');

export type AutoChallengeStatus =
  | 'submitted' // Challenge submitted successfully
  | 'submitting' // Currently being submitted
  | 'learning' // Learning the issuer's flow
  | 'pending_review' // Recipe learned, awaiting human verification
  | 'needs_human_help' // Requires manual intervention
  | 'error'; // Error occurred

export type AutoChallengeResult = {
  success: boolean;
  challengeId?: string;
  status: AutoChallengeStatus;
  message: string;
};

/**
 * Build automation context from ticket data
 */
function buildAutomationContext(
  ticket: {
    pcnNumber: string;
    vehicle: {
      registrationNumber: string;
      user: {
        name: string | null;
        email: string;
        phoneNumber: string | null;
        address: unknown;
      };
    };
  },
  challengeReason: string,
  customReason?: string
): AutomationContext {
  const user = ticket.vehicle.user;
  const address = user.address as Address | null;
  const nameParts = (user.name || '').split(' ');

  return {
    pcnNumber: ticket.pcnNumber,
    vehicleReg: ticket.vehicle.registrationNumber,
    firstName: nameParts[0] || '',
    lastName: nameParts.slice(1).join(' ') || '',
    fullName: user.name || '',
    email: user.email,
    phone: user.phoneNumber || undefined,
    addressLine1: address?.line1 || '',
    addressLine2: address?.line2 || undefined,
    city: address?.city || '',
    postcode: address?.postcode || '',
    challengeReason,
    challengeText: customReason,
  };
}

/**
 * Initiates an auto-challenge for a parking ticket.
 *
 * Flow:
 * 1. Check if issuer has built-in support (Lewisham, etc.)
 * 2. Check if issuer has a verified automation recipe
 * 3. If yes: Send to Hetzner to run automation
 * 4. If no recipe exists: Send to Hetzner to learn the flow
 * 5. Results come back via webhook
 */
export async function initiateAutoChallenge(
  ticketId: string,
  challengeReason: string,
  customReason?: string
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
    const issuerId = issuer?.id || ticket.issuer.toLowerCase().replace(/\s+/g, '-');
    const issuerName = issuer?.name || ticket.issuer;

    // Check if we have built-in automation support
    const hasBuiltInSupport = issuer && isAutomationSupported(issuer.id);

    // Check if we have a learned automation recipe
    const automation = await db.issuerAutomation.findUnique({
      where: { issuerId },
    });

    // Create the challenge record first
    const challenge = await db.challenge.create({
      data: {
        ticketId: ticket.id,
        type: 'AUTO_CHALLENGE',
        reason: challengeReason,
        customReason: customReason || null,
        status: ChallengeStatus.PENDING,
      },
    });

    // Scenario 1: Built-in automation support (runs locally for now)
    if (hasBuiltInSupport) {
      return await runBuiltInAutomation(
        ticket.pcnNumber,
        challengeReason,
        customReason,
        challenge.id
      );
    }

    // Scenario 2: Verified learned recipe exists - send to Hetzner
    if (automation?.status === IssuerAutomationStatus.VERIFIED) {
      return await triggerLearnedAutomation(
        automation,
        ticket,
        challengeReason,
        customReason,
        challenge.id
      );
    }

    // Scenario 3: Recipe is currently being learned
    if (automation?.status === IssuerAutomationStatus.LEARNING) {
      await db.challenge.update({
        where: { id: challenge.id },
        data: {
          status: ChallengeStatus.PENDING,
          metadata: {
            waitingForLearning: true,
            automationId: automation.id,
          },
        },
      });

      return {
        success: true,
        challengeId: challenge.id,
        status: 'learning',
        message: `We're still learning how to submit challenges to ${issuerName}. We'll complete your submission once ready.`,
      };
    }

    // Scenario 4: Recipe exists but needs review
    if (automation?.status === IssuerAutomationStatus.PENDING_REVIEW) {
      await db.challenge.update({
        where: { id: challenge.id },
        data: {
          status: ChallengeStatus.PENDING,
          metadata: {
            waitingForReview: true,
            automationId: automation.id,
          },
        },
      });

      return {
        success: true,
        challengeId: challenge.id,
        status: 'pending_review',
        message: `Our team is reviewing the ${issuerName} submission process. We'll complete your challenge once verified.`,
      };
    }

    // Scenario 5: Recipe needs human intervention
    if (automation?.status === IssuerAutomationStatus.NEEDS_HUMAN_HELP) {
      await db.challenge.update({
        where: { id: challenge.id },
        data: {
          status: ChallengeStatus.PENDING,
          metadata: {
            needsHumanHelp: true,
            automationId: automation.id,
            reason: automation.failureReason,
          },
        },
      });

      return {
        success: true,
        challengeId: challenge.id,
        status: 'needs_human_help',
        message: `${issuerName} requires manual setup. Our team will complete your submission shortly.`,
      };
    }

    // Scenario 6: No automation exists - trigger learning on Hetzner
    const newAutomation = await db.issuerAutomation.create({
      data: {
        issuerId,
        issuerName,
        challengeUrl: '', // Will be discovered during learning
        steps: [],
        status: IssuerAutomationStatus.LEARNING,
      },
    });

    await db.challenge.update({
      where: { id: challenge.id },
      data: {
        status: ChallengeStatus.PENDING,
        metadata: {
          learningTriggered: true,
          automationId: newAutomation.id,
        },
      },
    });

    // Trigger learning job on Hetzner
    // Only LocalAuthority has websiteUrl
    const issuerWebsite = issuer && 'websiteUrl' in issuer ? issuer.websiteUrl : undefined;
    const learnResult = await startLearnJob({
      automationId: newAutomation.id,
      issuerName,
      issuerWebsite,
      pcnNumber: ticket.pcnNumber,
      vehicleReg: ticket.vehicle.registrationNumber,
    });

    if (!learnResult.success) {
      logger.error('Failed to start learning job', {
        automationId: newAutomation.id,
        error: learnResult.error,
      });

      // Update automation status to failed
      await db.issuerAutomation.update({
        where: { id: newAutomation.id },
        data: {
          status: IssuerAutomationStatus.FAILED,
          failureReason: learnResult.error || 'Failed to start learning job',
        },
      });

      return {
        success: false,
        challengeId: challenge.id,
        status: 'error',
        message: 'Failed to start learning the submission process. Please try again later.',
      };
    }

    logger.info('Learning job started on Hetzner', {
      ticketId,
      challengeId: challenge.id,
      automationId: newAutomation.id,
      jobId: learnResult.jobId,
      issuerName,
    });

    // Update challenge with job ID
    await db.challenge.update({
      where: { id: challenge.id },
      data: {
        metadata: {
          learningTriggered: true,
          automationId: newAutomation.id,
          hetznerJobId: learnResult.jobId,
        },
      },
    });

    return {
      success: true,
      challengeId: challenge.id,
      status: 'learning',
      message: `We're learning how to submit challenges to ${issuerName}. This may take a few minutes. We'll notify you when complete.`,
    };
  } catch (error) {
    logger.error(
      'Error initiating auto-challenge',
      {
        ticketId,
        challengeReason,
      },
      error instanceof Error ? error : new Error(String(error))
    );

    return {
      success: false,
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to initiate challenge.',
    };
  }
}

/**
 * Run the built-in automation for supported issuers (Lewisham, Westminster, etc.)
 * This still runs locally since these automations are hardcoded.
 */
async function runBuiltInAutomation(
  pcnNumber: string,
  challengeReason: string,
  customReason: string | undefined,
  challengeId: string
): Promise<AutoChallengeResult> {
  try {
    const { challenge } = await getAutomation();
    const result = await challenge(pcnNumber, challengeReason, customReason);

    if (result && result.success) {
      await db.challenge.update({
        where: { id: challengeId },
        data: {
          status: ChallengeStatus.SUCCESS,
          submittedAt: new Date(),
          metadata: {
            challengeSubmitted: true,
            submittedAt: new Date().toISOString(),
            challengeText: result.challengeText,
          },
        },
      });

      revalidatePath('/tickets/[id]', 'page');

      return {
        success: true,
        challengeId,
        status: 'submitted',
        message: 'Your challenge has been submitted successfully.',
      };
    }

    throw new Error('Challenge submission failed');
  } catch (error) {
    await db.challenge.update({
      where: { id: challengeId },
      data: {
        status: ChallengeStatus.ERROR,
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      },
    });

    throw error;
  }
}

/**
 * Trigger a learned automation to run on Hetzner
 */
async function triggerLearnedAutomation(
  automation: {
    id: string;
    steps: unknown;
  },
  ticket: {
    id: string;
    pcnNumber: string;
    vehicle: {
      registrationNumber: string;
      user: {
        name: string | null;
        email: string;
        phoneNumber: string | null;
        address: unknown;
      };
    };
  },
  challengeReason: string,
  customReason: string | undefined,
  challengeId: string
): Promise<AutoChallengeResult> {
  // Build the automation context
  const context = buildAutomationContext(ticket, challengeReason, customReason);

  // Generate challenge text if not provided
  if (!context.challengeText) {
    const generatedText = await generateChallengeContent({
      pcnNumber: context.pcnNumber,
      challengeReason: context.challengeReason,
      additionalDetails: undefined,
      contentType: 'form-field',
      formFieldPlaceholderText: '',
      userEvidenceImageUrls: [],
    });
    context.challengeText = generatedText || '';
  }

  // Mark challenge as in-progress
  await db.challenge.update({
    where: { id: challengeId },
    data: {
      status: ChallengeStatus.PENDING,
      metadata: {
        automationId: automation.id,
        submissionStarted: true,
        startedAt: new Date().toISOString(),
      },
    },
  });

  logger.info('Starting learned automation on Hetzner', {
    automationId: automation.id,
    ticketId: ticket.id,
    challengeId,
  });

  // Send to Hetzner for execution
  const runResult = await startRunJob({
    automationId: automation.id,
    challengeId,
    steps: automation.steps as RecipeStep[],
    context,
    dryRun: false,
  });

  if (!runResult.success) {
    logger.error('Failed to start automation job', {
      automationId: automation.id,
      challengeId,
      error: runResult.error,
    });

    await db.challenge.update({
      where: { id: challengeId },
      data: {
        status: ChallengeStatus.ERROR,
        metadata: {
          automationId: automation.id,
          error: runResult.error || 'Failed to start automation',
        },
      },
    });

    return {
      success: false,
      challengeId,
      status: 'error',
      message: 'Failed to start the automation. Please try again later.',
    };
  }

  // Update challenge with job ID - results will come via webhook
  await db.challenge.update({
    where: { id: challengeId },
    data: {
      metadata: {
        automationId: automation.id,
        submissionStarted: true,
        startedAt: new Date().toISOString(),
        hetznerJobId: runResult.jobId,
      },
    },
  });

  logger.info('Automation job started on Hetzner', {
    automationId: automation.id,
    challengeId,
    jobId: runResult.jobId,
  });

  // Return submitting status - webhook will update when done
  return {
    success: true,
    challengeId,
    status: 'submitting',
    message: 'Your challenge is being submitted. You will be notified when complete.',
  };
}

/**
 * Get the status of a challenge
 */
export async function getChallengeStatus(
  challengeId: string
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
