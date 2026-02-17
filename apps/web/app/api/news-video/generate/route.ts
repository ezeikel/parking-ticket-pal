import { type NextRequest, NextResponse } from 'next/server';
import { generateAndPostNewsVideo } from '@/app/actions/news-video';
import { createServerLogger } from '@/lib/logger';
import { sendNewsVideoSkipped, sendNewsVideoFailed } from '@/lib/email';

const log = createServerLogger({ action: 'news-video-generate' });

// Pipeline now returns after dispatching async render (~90s)
export const maxDuration = 120;

const handleRequest = async (request: NextRequest) => {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (
      process.env.CRON_SECRET &&
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    log.info('Starting news video generation pipeline');

    const result = await generateAndPostNewsVideo();

    if ('skipped' in result && result.skipped) {
      log.info('No new articles found, skipped');

      const digestEmail = process.env.SOCIAL_DIGEST_EMAIL;
      if (digestEmail) {
        try {
          const diagnostics =
            'diagnostics' in result ? result.diagnostics : undefined;
          await sendNewsVideoSkipped(digestEmail, {
            checkedAt: new Date().toISOString(),
            diagnostics,
          });
          log.info('Skipped notification email sent');
        } catch (error) {
          log.error(
            'Failed to send skipped notification email',
            {},
            error instanceof Error ? error : undefined,
          );
        }
      }

      return NextResponse.json({
        success: true,
        skipped: true,
        message: 'No new articles found',
        timestamp: new Date().toISOString(),
      });
    }

    if (!result.success) {
      log.error('News video generation failed', { error: result.error });

      const digestEmail = process.env.SOCIAL_DIGEST_EMAIL;
      if (digestEmail) {
        try {
          await sendNewsVideoFailed(digestEmail, {
            failedAt: new Date().toISOString(),
            errorMessage: result.error || 'Unknown error',
            videoId: result.videoId,
            headline:
              'headline' in result ? (result.headline as string) : undefined,
          });
          log.info('Failure notification email sent');
        } catch (emailErr) {
          log.error(
            'Failed to send failure notification email',
            {},
            emailErr instanceof Error ? emailErr : undefined,
          );
        }
      }

      return NextResponse.json(
        { error: result.error, videoId: result.videoId },
        { status: 500 },
      );
    }

    log.info('News video pipeline dispatched', {
      videoId: result.videoId,
      status: 'status' in result ? result.status : 'unknown',
    });

    return NextResponse.json({
      success: true,
      message: 'News video rendering dispatched',
      videoId: result.videoId,
      status: 'status' in result ? result.status : 'RENDERING',
      headline: 'headline' in result ? result.headline : undefined,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    log.error(
      'Error in news video generation',
      undefined,
      error instanceof Error ? error : undefined,
    );

    const digestEmail = process.env.SOCIAL_DIGEST_EMAIL;
    if (digestEmail) {
      try {
        await sendNewsVideoFailed(digestEmail, {
          failedAt: new Date().toISOString(),
          errorMessage:
            error instanceof Error ? error.message : 'Unknown error',
        });
      } catch {
        // Best-effort — don't let email failure mask the original error
      }
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
};

export const GET = handleRequest;
export const POST = handleRequest;
