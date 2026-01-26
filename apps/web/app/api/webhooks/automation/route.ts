/**
 * Webhook Handler for Worker Automation Results
 *
 * Receives callbacks from the worker service when:
 * - Code generation jobs complete (new approach - creates PRs)
 * - Legacy learn/run jobs complete (for backwards compatibility)
 */

import { createHmac } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import {
  db,
  ChallengeStatus,
  PendingIssuerStatus,
  PendingChallengeStatus,
} from '@parking-ticket-pal/db';
import { createServerLogger } from '@/lib/logger';

const logger = createServerLogger({ action: 'automation-webhook' });

/**
 * Webhook payload types
 */
type WebhookPayload =
  | GenerationWebhookPayload
  | LegacyLearnWebhookPayload
  | LegacyRunWebhookPayload;

// New: Code generation results
type GenerationWebhookPayload = {
  jobId: string;
  type: 'generation';
  issuerId: string;
  status: 'completed' | 'failed';
  result: GenerationResult;
  timestamp: string;
};

type GenerationResult = {
  success: boolean;
  prUrl?: string;
  prNumber?: number;
  error?: string;
  generatedCode?: string; // For debugging
  analysis?: {
    challengeUrl: string;
    formFields: Array<{
      selector: string;
      label?: string;
      name?: string;
      type: string;
    }>;
    hasCaptcha: boolean;
    captchaType?: string;
    needsAccount: boolean;
  };
};

// Legacy: Learn job results (kept for backwards compatibility)
type LegacyLearnWebhookPayload = {
  jobId: string;
  type: 'learn';
  status: 'completed' | 'failed';
  automationId: string;
  result: LegacyLearnResult;
  timestamp: string;
};

type LegacyLearnResult = {
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

// Legacy: Run job results (kept for backwards compatibility)
type LegacyRunWebhookPayload = {
  jobId: string;
  type: 'run';
  status: 'completed' | 'failed';
  automationId: string;
  challengeId: string;
  result: LegacyRunResult;
  timestamp: string;
};

type LegacyRunResult = {
  success: boolean;
  challengeSubmitted: boolean;
  screenshotUrls: string[];
  videoUrl?: string;
  dryRun?: boolean;
  error?: string;
  captchaEncountered?: boolean;
  challengeText?: string;
};

/**
 * Verify webhook signature
 */
function verifySignature(
  payload: string,
  signature: string,
  secret: string,
): boolean {
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
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 },
      );
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
    });

    // Handle based on job type
    if (payload.type === 'generation') {
      await handleGenerationResult(
        payload.issuerId,
        payload.result,
      );
    } else if (payload.type === 'learn') {
      // Legacy handler
      await handleLegacyLearnResult(
        payload.automationId,
        payload.result,
      );
    } else if (payload.type === 'run') {
      // Legacy handler
      await handleLegacyRunResult(
        payload.automationId,
        payload.challengeId,
        payload.result,
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error(
      'Webhook processing error',
      {},
      error instanceof Error ? error : new Error(String(error)),
    );

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * Handle code generation result from worker
 * Updates PendingIssuer status and notifies queued challenges
 */
async function handleGenerationResult(
  issuerId: string,
  result: GenerationResult,
) {
  logger.info('Processing generation result', {
    issuerId,
    success: result.success,
    prUrl: result.prUrl,
  });

  const pendingIssuer = await db.pendingIssuer.findUnique({
    where: { issuerId },
  });

  if (!pendingIssuer) {
    logger.error('PendingIssuer not found', { issuerId });
    return;
  }

  if (result.success && result.prUrl) {
    // PR created successfully
    await db.pendingIssuer.update({
      where: { id: pendingIssuer.id },
      data: {
        status: PendingIssuerStatus.PR_CREATED,
        prUrl: result.prUrl,
        prNumber: result.prNumber,
        generatedAt: new Date(),
      },
    });

    // Update all pending challenges for this issuer
    await db.pendingChallenge.updateMany({
      where: {
        issuerId,
        status: PendingChallengeStatus.WAITING,
      },
      data: {
        // Keep as WAITING - will become READY when PR is merged
      },
    });

    logger.info('Generation completed, PR created', {
      issuerId,
      prUrl: result.prUrl,
      prNumber: result.prNumber,
    });

    // TODO: Send notification to admin about new PR
    // TODO: Send notification to users who requested this issuer
  } else {
    // Generation failed
    await db.pendingIssuer.update({
      where: { id: pendingIssuer.id },
      data: {
        status: PendingIssuerStatus.FAILED,
        failureReason: result.error || 'Generation failed',
      },
    });

    // Update pending challenges to failed
    await db.pendingChallenge.updateMany({
      where: {
        issuerId,
        status: PendingChallengeStatus.WAITING,
      },
      data: {
        status: PendingChallengeStatus.FAILED,
      },
    });

    logger.error('Generation failed', {
      issuerId,
      error: result.error,
    });

    // TODO: Send notification to users about failure
  }
}

// ============================================
// LEGACY HANDLERS (for backwards compatibility)
// These can be removed once all old jobs are processed
// ============================================

/**
 * @deprecated Use handleGenerationResult instead
 * Handle learning result from Hetzner (legacy)
 */
async function handleLegacyLearnResult(
  automationId: string,
  result: LegacyLearnResult,
) {
  logger.info('Processing legacy learn result', {
    automationId,
    success: result.success,
    needsHumanHelp: result.needsHumanHelp,
  });

  // Legacy: This used IssuerAutomation table which we're deprecating
  // Just log for now - these shouldn't happen with new code
  logger.warn('Received legacy learn webhook - IssuerAutomation is deprecated', {
    automationId,
  });
}

/**
 * @deprecated Remove after transition
 * Handle run result from Hetzner (legacy)
 */
async function handleLegacyRunResult(
  automationId: string,
  challengeId: string,
  result: LegacyRunResult,
) {
  logger.info('Processing legacy run result', {
    automationId,
    challengeId,
    success: result.success,
    challengeSubmitted: result.challengeSubmitted,
    dryRun: result.dryRun,
    hasVideo: !!result.videoUrl,
  });

  // Handle dry-run completion (form filled but not submitted)
  if (result.success && result.dryRun && !result.challengeSubmitted) {
    await db.challenge.update({
      where: { id: challengeId },
      data: {
        status: ChallengeStatus.PENDING,
        metadata: {
          automationId,
          dryRun: true,
          dryRunComplete: true,
          completedAt: new Date().toISOString(),
          challengeText: result.challengeText,
          screenshotUrls: result.screenshotUrls,
          videoUrl: result.videoUrl,
        },
      },
    });

    logger.info('Dry run completed successfully', {
      automationId,
      challengeId,
      screenshotCount: result.screenshotUrls?.length,
      hasVideo: !!result.videoUrl,
    });

    return;
  }

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
          videoUrl: result.videoUrl,
        },
      },
    });

    logger.info('Challenge submitted successfully', {
      automationId,
      challengeId,
      screenshotCount: result.screenshotUrls?.length,
      hasVideo: !!result.videoUrl,
    });
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
          videoUrl: result.videoUrl,
        },
      },
    });

    logger.error('Challenge submission failed', {
      automationId,
      challengeId,
      error: result.error,
      screenshotCount: result.screenshotUrls?.length,
      hasVideo: !!result.videoUrl,
    });
  }
}
