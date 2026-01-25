'use server';

import { revalidatePath } from 'next/cache';
import { after } from 'next/server';
import { db, ChallengeStatus, IssuerAutomationStatus } from '@parking-ticket-pal/db';
import { findIssuer, isAutomationSupported } from '@/constants/index';
import { getUserId } from '@/utils/user';
import { createServerLogger } from '@/lib/logger';
import { learnIssuerFlow } from '@/utils/automation/learn';
import { runAutomation, buildAutomationContext } from '@/utils/automation/runAutomation';

const logger = createServerLogger({ action: 'autoChallenge' });

// Dynamic import for automation to avoid loading on every page
const getAutomation = () => import('@/utils/automation');

export type AutoChallengeStatus =
  | 'submitted'           // Challenge submitted successfully
  | 'submitting'          // Currently being submitted
  | 'learning'            // Learning the issuer's flow
  | 'pending_review'      // Recipe learned, awaiting human verification
  | 'needs_human_help'    // Requires manual intervention
  | 'error';              // Error occurred

export type AutoChallengeResult = {
  success: boolean;
  challengeId?: string;
  status: AutoChallengeStatus;
  message: string;
};

/**
 * Initiates an auto-challenge for a parking ticket.
 *
 * Flow:
 * 1. Check if issuer has a verified automation recipe
 * 2a. If yes: Run existing automation and submit challenge
 * 2b. If no recipe exists: Start learning flow
 * 2c. If recipe is pending review: Return pending status
 * 2d. If recipe needs human help: Return that status
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

    // Scenario 1: Built-in automation support
    if (hasBuiltInSupport) {
      return await runBuiltInAutomation(
        ticket.pcnNumber,
        challengeReason,
        customReason,
        challenge.id,
      );
    }

    // Scenario 2: Verified learned recipe exists
    if (automation?.status === IssuerAutomationStatus.VERIFIED) {
      return await runLearnedAutomation(
        automation.id,
        ticket,
        challengeReason,
        customReason,
        challenge.id,
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

    // Scenario 6: No automation exists - start learning
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

    // Trigger the learning job in the background using Next.js after()
    after(async () => {
      try {
        logger.info('Starting background learning flow', {
          automationId: newAutomation.id,
          ticketId,
          issuerName,
        });

        const learnResult = await learnIssuerFlow({
          automationId: newAutomation.id,
          ticketId,
          pcnNumber: ticket.pcnNumber,
          vehicleReg: ticket.vehicle.registrationNumber,
          issuerName,
        });

        logger.info('Background learning flow completed', {
          automationId: newAutomation.id,
          success: learnResult.success,
          needsHumanHelp: learnResult.needsHumanHelp,
        });

        // Update the challenge status based on learning result
        if (learnResult.needsHumanHelp) {
          await db.challenge.update({
            where: { id: challenge.id },
            data: {
              metadata: {
                learningTriggered: true,
                automationId: newAutomation.id,
                learningComplete: true,
                needsHumanHelp: true,
                humanHelpReason: learnResult.humanHelpReason,
              },
            },
          });
        } else if (learnResult.success) {
          await db.challenge.update({
            where: { id: challenge.id },
            data: {
              metadata: {
                learningTriggered: true,
                automationId: newAutomation.id,
                learningComplete: true,
                pendingReview: true,
              },
            },
          });
        }
      } catch (error) {
        logger.error('Background learning flow failed', {
          automationId: newAutomation.id,
          ticketId,
        }, error instanceof Error ? error : new Error(String(error)));
      }
    });

    logger.info('Learning triggered for new issuer', {
      ticketId,
      challengeId: challenge.id,
      issuerId,
      issuerName,
    });

    return {
      success: true,
      challengeId: challenge.id,
      status: 'learning',
      message: `We're learning how to submit challenges to ${issuerName}. This may take a few minutes. We'll notify you when complete.`,
    };
  } catch (error) {
    logger.error('Error initiating auto-challenge', {
      ticketId,
      challengeReason,
    }, error instanceof Error ? error : new Error(String(error)));

    return {
      success: false,
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to initiate challenge.',
    };
  }
}

/**
 * Run the built-in automation for supported issuers
 */
async function runBuiltInAutomation(
  pcnNumber: string,
  challengeReason: string,
  customReason: string | undefined,
  challengeId: string,
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
 * Run a learned automation recipe
 */
async function runLearnedAutomation(
  automationId: string,
  ticket: any,
  challengeReason: string,
  customReason: string | undefined,
  challengeId: string,
): Promise<AutoChallengeResult> {
  // Build the automation context from ticket data
  const context = buildAutomationContext(ticket, challengeReason, customReason);

  // Mark challenge as in-progress
  await db.challenge.update({
    where: { id: challengeId },
    data: {
      status: ChallengeStatus.PENDING,
      metadata: {
        automationId,
        submissionStarted: true,
        startedAt: new Date().toISOString(),
      },
    },
  });

  logger.info('Starting learned automation', {
    automationId,
    ticketId: ticket.id,
    challengeId,
  });

  try {
    // Run the automation
    const result = await runAutomation({
      automationId,
      challengeId,
      ticketId: ticket.id,
      context,
      dryRun: false,
    });

    if (result.success && result.challengeSubmitted) {
      revalidatePath('/tickets/[id]', 'page');

      return {
        success: true,
        challengeId,
        status: 'submitted',
        message: 'Your challenge has been submitted successfully.',
      };
    }

    if (result.captchaEncountered && !result.success) {
      return {
        success: false,
        challengeId,
        status: 'needs_human_help',
        message: 'CAPTCHA verification required. Our team will complete your submission.',
      };
    }

    return {
      success: false,
      challengeId,
      status: 'error',
      message: result.error || 'Failed to submit challenge via automation.',
    };
  } catch (error) {
    logger.error('Learned automation failed', {
      automationId,
      ticketId: ticket.id,
      challengeId,
    }, error instanceof Error ? error : new Error(String(error)));

    await db.challenge.update({
      where: { id: challengeId },
      data: {
        status: ChallengeStatus.ERROR,
        metadata: {
          automationId,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      },
    });

    return {
      success: false,
      challengeId,
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to run automation.',
    };
  }
}

/**
 * Get the status of a challenge
 */
export async function getChallengeStatus(
  challengeId: string,
): Promise<{ status: ChallengeStatus; metadata: any } | null> {
  const challenge = await db.challenge.findUnique({
    where: { id: challengeId },
    select: {
      status: true,
      metadata: true,
    },
  });

  return challenge;
}
