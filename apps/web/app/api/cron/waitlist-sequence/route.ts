import { NextResponse } from 'next/server';
import { db } from '@parking-ticket-pal/db';
import { createServerLogger } from '@/lib/logger';
import { sendWaitlistEmail } from '@/lib/email';
import { posthogServer } from '@/lib/posthog-server';
import { advanceWaitlistSequence } from '@/services/waitlist-sequence';

const logger = createServerLogger({ action: 'cron-waitlist-sequence' });

// eslint-disable-next-line import-x/prefer-default-export
export async function POST(request: Request) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();

    // Find signups that are due to receive an email
    const dueSignups = await db.waitlistSignup.findMany({
      where: {
        nextSendAt: { lte: now },
        completedAt: null,
      },
    });

    logger.info('Found due waitlist signups', {
      count: dueSignups.length,
    });

    let sent = 0;
    let failed = 0;

    const results = await Promise.allSettled(
      dueSignups.map(async (signup) => {
        const stepToSend = signup.currentStep as 1 | 2;

        // Send email
        const result = await sendWaitlistEmail(signup.email, stepToSend);

        if (!result.success) {
          logger.error('Failed to send waitlist email', {
            signupId: signup.id,
            step: stepToSend,
            error: result.error,
          });
          failed += 1;
          return;
        }

        // Track send event
        if (posthogServer) {
          posthogServer.capture({
            distinctId: signup.email,
            event: 'waitlist_email_sent',
            properties: {
              email: signup.email,
              step: stepToSend,
            },
          });
        }

        // Advance sequence
        await advanceWaitlistSequence(signup.id, stepToSend, signup.createdAt);

        logger.info('Sent waitlist email', {
          signupId: signup.id,
          step: stepToSend,
          email: signup.email,
        });

        sent += 1;
      }),
    );

    // Count additional failures from rejected promises
    results.forEach((result) => {
      if (result.status === 'rejected') {
        failed += 1;
        logger.error(
          'Waitlist sequence processing failed',
          {},
          result.reason instanceof Error
            ? result.reason
            : new Error(String(result.reason)),
        );
      }
    });

    // Flush PostHog
    if (posthogServer) {
      await posthogServer.shutdown();
    }

    return NextResponse.json({
      success: true,
      processed: dueSignups.length,
      sent,
      failed,
    });
  } catch (error) {
    logger.error(
      'Cron waitlist-sequence failed',
      {},
      error instanceof Error ? error : new Error(String(error)),
    );

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
