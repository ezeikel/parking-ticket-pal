import { NextResponse } from 'next/server';
import { createServerLogger } from '@/lib/logger';
import { sendWaitlistEmail } from '@/lib/email';
import { posthogServer } from '@/lib/posthog-server';
import {
  getWaitlistEmailsForBroadcast,
  markWaitlistAsLaunched,
} from '@/services/waitlist-sequence';

const logger = createServerLogger({ action: 'cron-waitlist-launch' });

/**
 * Manual broadcast endpoint for the launch day email (step 3).
 * Call this once when the mobile app is published.
 *
 * Accepts optional appStoreUrl and playStoreUrl in the request body.
 */
// eslint-disable-next-line import-x/prefer-default-export
export async function POST(request: Request) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse optional store URLs from request body
    let appStoreUrl: string | undefined;
    let playStoreUrl: string | undefined;

    try {
      const body = await request.json();
      appStoreUrl = body.appStoreUrl;
      playStoreUrl = body.playStoreUrl;
    } catch {
      // No body or invalid JSON — use defaults
    }

    const signups = await getWaitlistEmailsForBroadcast();

    logger.info('Broadcasting waitlist launch email', {
      count: signups.length,
    });

    const sentIds: string[] = [];

    // Send sequentially with delays to respect rate limits
    const results = await signups.reduce(
      async (prevPromise, signup) => {
        const acc = await prevPromise;

        const result = await sendWaitlistEmail(signup.email, 3, {
          appStoreUrl,
          playStoreUrl,
        });

        if (result.success) {
          acc.sent += 1;
          sentIds.push(signup.id);

          if (posthogServer) {
            posthogServer.capture({
              distinctId: signup.email,
              event: 'waitlist_launch_email_sent',
              properties: { email: signup.email },
            });
          }
        } else {
          acc.failed += 1;
          logger.error('Failed to send waitlist launch email', {
            signupId: signup.id,
            email: signup.email,
            error: result.error,
          });
        }

        // 100ms delay between emails to respect rate limits
        await new Promise((resolve) => {
          setTimeout(resolve, 100);
        });

        return acc;
      },
      Promise.resolve({ sent: 0, failed: 0 }),
    );

    // Mark all sent signups as launched
    if (sentIds.length > 0) {
      await markWaitlistAsLaunched(sentIds);
    }

    // Flush PostHog
    if (posthogServer) {
      await posthogServer.shutdown();
    }

    return NextResponse.json({
      success: true,
      total: signups.length,
      sent: results.sent,
      failed: results.failed,
    });
  } catch (error) {
    logger.error(
      'Waitlist launch broadcast failed',
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
