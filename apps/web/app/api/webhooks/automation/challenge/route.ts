/**
 * Webhook Handler for Challenge Automation Completion
 *
 * Receives callbacks from the worker service when challenge jobs complete.
 * Updates the Challenge record with the result.
 */

import { createHmac } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { db, ChallengeStatus } from '@parking-ticket-pal/db';
import { createServerLogger } from '@/lib/logger';
import { revalidatePath } from 'next/cache';

const logger = createServerLogger({ action: 'challenge-webhook' });

/**
 * Challenge webhook payload from worker
 */
type ChallengeWebhookPayload = {
  jobId: string;
  type: 'challenge';
  status: 'completed' | 'failed';
  issuerId?: string;
  challengeId?: string;
  ticketId?: string;
  result: ChallengeResult;
  timestamp: string;
};

type ChallengeResult = {
  success: boolean;
  challengeText?: string;
  screenshotUrls?: string[];
  videoUrl?: string;
  referenceNumber?: string;
  executionMode?: 'typescript' | 'agentic';
  fallbackUsed?: boolean;
  fallbackReason?: string;
  error?: string;
};

/**
 * Verify the webhook signature using HMAC-SHA256
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

export async function POST(request: NextRequest) {
  try {
    // Get the raw body for signature verification
    const rawBody = await request.text();
    const signature = request.headers.get('x-webhook-signature');
    const secret = process.env.WORKER_SECRET;

    if (!secret) {
      logger.error('WORKER_SECRET not configured');
      return NextResponse.json(
        { error: 'Webhook not configured' },
        { status: 500 },
      );
    }

    // Verify signature
    if (!signature || !verifySignature(rawBody, signature, secret)) {
      logger.warn('Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Parse payload
    const payload: ChallengeWebhookPayload = JSON.parse(rawBody);

    logger.info('Received challenge webhook', {
      jobId: payload.jobId,
      status: payload.status,
      issuerId: payload.issuerId,
      challengeId: payload.challengeId,
    });

    // Validate payload
    if (payload.type !== 'challenge') {
      logger.warn('Invalid webhook type', { type: payload.type });
      return NextResponse.json({ error: 'Invalid payload type' }, { status: 400 });
    }

    // Find challenge by workerJobId
    const challenge = await db.challenge.findFirst({
      where: { workerJobId: payload.jobId },
      include: {
        ticket: true,
      },
    });

    if (!challenge) {
      logger.warn('Challenge not found for job', { jobId: payload.jobId });
      return NextResponse.json(
        { error: 'Challenge not found', jobId: payload.jobId },
        { status: 404 },
      );
    }

    // Don't update if already cancelled by user
    if (challenge.status === ChallengeStatus.CANCELLED) {
      logger.info('Challenge was cancelled, ignoring webhook', {
        challengeId: challenge.id,
        jobId: payload.jobId,
      });
      return NextResponse.json({
        ignored: true,
        reason: 'cancelled',
      });
    }

    // Update challenge status based on result
    const result = payload.result;
    const newStatus =
      payload.status === 'completed' && result.success
        ? ChallengeStatus.SUCCESS
        : ChallengeStatus.ERROR;

    await db.challenge.update({
      where: { id: challenge.id },
      data: {
        status: newStatus,
        submittedAt:
          newStatus === ChallengeStatus.SUCCESS ? new Date() : undefined,
        metadata: {
          challengeSubmitted: result.success,
          submittedAt: new Date().toISOString(),
          challengeText: result.challengeText,
          screenshotUrls: result.screenshotUrls || [],
          videoUrl: result.videoUrl,
          referenceNumber: result.referenceNumber,
          executionMode: result.executionMode,
          fallbackUsed: result.fallbackUsed,
          fallbackReason: result.fallbackReason,
          error: result.error,
        },
      },
    });

    logger.info('Challenge updated from webhook', {
      challengeId: challenge.id,
      ticketId: challenge.ticketId,
      newStatus,
      success: result.success,
    });

    // Revalidate the ticket page
    revalidatePath(`/tickets/${challenge.ticketId}`, 'page');

    // TODO: Send notification to user (email, push, in-app)
    // This could be implemented as a separate background job

    return NextResponse.json({
      success: true,
      challengeId: challenge.id,
      status: newStatus,
    });
  } catch (error) {
    logger.error(
      'Error processing challenge webhook',
      {},
      error instanceof Error ? error : new Error(String(error)),
    );

    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 },
    );
  }
}
