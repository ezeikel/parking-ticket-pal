/**
 * Webhook Handler for Worker Automation Results
 *
 * Receives callbacks from the worker service when
 * learn or run jobs complete.
 */

import { createHmac } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { db, ChallengeStatus, IssuerAutomationStatus } from '@parking-ticket-pal/db';
import { createServerLogger } from '@/lib/logger';

const logger = createServerLogger({ action: 'automation-webhook' });

/**
 * Webhook payload from worker
 */
type WebhookPayload = {
  jobId: string;
  type: 'learn' | 'run';
  status: 'completed' | 'failed';
  automationId: string;
  challengeId?: string;
  result: LearnResult | RunResult;
  timestamp: string;
};

type LearnResult = {
  success: boolean;
  steps?: Array<{
    order: number;
    action: string;
    selector?: string;
    value?: string;
    description: string;
    screenshotUrl?: string;
    waitFor?: string;
    optional?: boolean;
    fieldType?: string;
    placeholder?: string;
  }>;
  challengeUrl?: string;
  needsAccount?: boolean;
  captchaType?: string;
  error?: string;
  needsHumanHelp?: boolean;
  humanHelpReason?: string;
};

type RunResult = {
  success: boolean;
  challengeSubmitted: boolean;
  screenshotUrls: string[];
  error?: string;
  captchaEncountered?: boolean;
  challengeText?: string;
};

/**
 * Verify webhook signature
 */
function verifySignature(payload: string, signature: string, secret: string): boolean {
  const hmac = createHmac('sha256', secret);
  hmac.update(payload);
  const expectedSignature = hmac.digest('hex');
  return signature === expectedSignature;
}

/**
 * Handle POST requests from worker service
 */
export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('X-Webhook-Signature');
    const rawBody = await request.text();

    // Get the secret for verification
    const secret = process.env.WORKER_SECRET;
    if (!secret) {
      logger.error('Webhook secret not configured');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Verify signature
    if (!signature || !verifySignature(rawBody, signature, secret)) {
      logger.warn('Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Parse payload
    const payload: WebhookPayload = JSON.parse(rawBody);

    logger.info('Received automation webhook', {
      jobId: payload.jobId,
      type: payload.type,
      status: payload.status,
      automationId: payload.automationId,
      challengeId: payload.challengeId,
    });

    // Handle based on job type
    if (payload.type === 'learn') {
      await handleLearnResult(payload.automationId, payload.result as LearnResult);
    } else if (payload.type === 'run') {
      await handleRunResult(
        payload.automationId,
        payload.challengeId!,
        payload.result as RunResult
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error(
      'Webhook processing error',
      {},
      error instanceof Error ? error : new Error(String(error))
    );

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Handle learning result from Hetzner
 */
async function handleLearnResult(automationId: string, result: LearnResult) {
  logger.info('Processing learn result', {
    automationId,
    success: result.success,
    needsHumanHelp: result.needsHumanHelp,
  });

  if (result.needsHumanHelp) {
    // Needs manual intervention
    await db.issuerAutomation.update({
      where: { id: automationId },
      data: {
        status: IssuerAutomationStatus.NEEDS_HUMAN_HELP,
        failureReason: result.humanHelpReason || result.error,
        needsAccount: result.needsAccount || false,
        captchaType: result.captchaType,
        challengeUrl: result.challengeUrl || '',
      },
    });

    // Update any pending challenges for this automation
    await db.challenge.updateMany({
      where: {
        metadata: {
          path: ['automationId'],
          equals: automationId,
        },
        status: ChallengeStatus.PENDING,
      },
      data: {
        metadata: {
          automationId,
          needsHumanHelp: true,
          humanHelpReason: result.humanHelpReason,
        },
      },
    });

    logger.info('Automation marked as needing human help', {
      automationId,
      reason: result.humanHelpReason,
    });
  } else if (result.success && result.steps && result.steps.length > 0) {
    // Learning successful - pending review
    await db.issuerAutomation.update({
      where: { id: automationId },
      data: {
        status: IssuerAutomationStatus.PENDING_REVIEW,
        challengeUrl: result.challengeUrl || '',
        steps: result.steps,
        needsAccount: result.needsAccount || false,
        captchaType: result.captchaType,
      },
    });

    // Update any pending challenges
    await db.challenge.updateMany({
      where: {
        metadata: {
          path: ['automationId'],
          equals: automationId,
        },
        status: ChallengeStatus.PENDING,
      },
      data: {
        metadata: {
          automationId,
          learningComplete: true,
          pendingReview: true,
        },
      },
    });

    logger.info('Learning completed, pending review', {
      automationId,
      stepsCount: result.steps.length,
      challengeUrl: result.challengeUrl,
    });

    // TODO: Send notification to admin for review
  } else {
    // Learning failed
    await db.issuerAutomation.update({
      where: { id: automationId },
      data: {
        status: IssuerAutomationStatus.FAILED,
        failureReason: result.error || 'Learning failed',
        lastFailed: new Date(),
      },
    });

    // Update any pending challenges
    await db.challenge.updateMany({
      where: {
        metadata: {
          path: ['automationId'],
          equals: automationId,
        },
        status: ChallengeStatus.PENDING,
      },
      data: {
        status: ChallengeStatus.ERROR,
        metadata: {
          automationId,
          error: result.error || 'Learning failed',
        },
      },
    });

    logger.error('Learning failed', {
      automationId,
      error: result.error,
    });
  }
}

/**
 * Handle run result from Hetzner
 */
async function handleRunResult(
  automationId: string,
  challengeId: string,
  result: RunResult
) {
  logger.info('Processing run result', {
    automationId,
    challengeId,
    success: result.success,
    challengeSubmitted: result.challengeSubmitted,
  });

  if (result.success && result.challengeSubmitted) {
    // Challenge submitted successfully
    await db.challenge.update({
      where: { id: challengeId },
      data: {
        status: ChallengeStatus.SUCCESS,
        submittedAt: new Date(),
        metadata: {
          automationId,
          challengeSubmitted: true,
          submittedAt: new Date().toISOString(),
          challengeText: result.challengeText,
          screenshotUrls: result.screenshotUrls,
        },
      },
    });

    // Update automation lastVerified timestamp
    await db.issuerAutomation.update({
      where: { id: automationId },
      data: {
        lastVerified: new Date(),
      },
    });

    logger.info('Challenge submitted successfully', {
      automationId,
      challengeId,
    });

    // TODO: Send notification to user
  } else if (result.captchaEncountered && !result.success) {
    // CAPTCHA blocked the submission
    await db.challenge.update({
      where: { id: challengeId },
      data: {
        status: ChallengeStatus.PENDING,
        metadata: {
          automationId,
          captchaEncountered: true,
          needsHumanHelp: true,
          screenshotUrls: result.screenshotUrls,
        },
      },
    });

    logger.warn('Challenge blocked by CAPTCHA', {
      automationId,
      challengeId,
    });

    // TODO: Send notification to admin
  } else {
    // Submission failed
    await db.challenge.update({
      where: { id: challengeId },
      data: {
        status: ChallengeStatus.ERROR,
        metadata: {
          automationId,
          error: result.error || 'Submission failed',
          screenshotUrls: result.screenshotUrls,
        },
      },
    });

    // Update automation failure timestamp
    await db.issuerAutomation.update({
      where: { id: automationId },
      data: {
        lastFailed: new Date(),
        failureReason: result.error,
      },
    });

    logger.error('Challenge submission failed', {
      automationId,
      challengeId,
      error: result.error,
    });

    // TODO: Send notification to user
  }
}
