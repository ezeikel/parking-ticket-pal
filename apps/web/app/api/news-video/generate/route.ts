import { type NextRequest, NextResponse } from 'next/server';
import { generateAndPostNewsVideo } from '@/app/actions/news-video';
import { createServerLogger } from '@/lib/logger';
import { sendNewsVideoSkipped, sendNewsVideoFailed } from '@/lib/email';

const log = createServerLogger({ action: 'news-video-generate' });

// Discovery + script + voiceover + SFX + scene images can take 2-3 mins
// before the async render is dispatched to the worker
export const maxDuration = 300;

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

    // Support forcing a specific article via query params
    let forceArticle: Parameters<typeof generateAndPostNewsVideo>[0];
    const url = request.nextUrl.searchParams.get('url');
    if (url) {
      log.info('Forcing specific article URL', { url });

      let headline = request.nextUrl.searchParams.get('headline') || '';
      let summary = request.nextUrl.searchParams.get('summary') || '';

      // Auto-fetch headline/summary from the article page if not provided
      if (!headline) {
        try {
          const res = await fetch(url, {
            signal: AbortSignal.timeout(10000),
            headers: { 'User-Agent': 'ParkingTicketPal/1.0' },
          });
          if (res.ok) {
            const html = await res.text();
            const ogTitle =
              html.match(
                /<meta\s+property="og:title"\s+content="([^"]+)"/,
              )?.[1] ||
              html.match(
                /<meta\s+content="([^"]+)"\s+property="og:title"/,
              )?.[1];
            const titleTag = html.match(/<title>([^<]+)<\/title>/)?.[1];
            headline = ogTitle || titleTag || '';

            if (!summary) {
              const ogDesc =
                html.match(
                  /<meta\s+property="og:description"\s+content="([^"]+)"/,
                )?.[1] ||
                html.match(
                  /<meta\s+content="([^"]+)"\s+property="og:description"/,
                )?.[1] ||
                html.match(
                  /<meta\s+name="description"\s+content="([^"]+)"/,
                )?.[1];
              summary = ogDesc || '';
            }
            log.info('Auto-fetched article metadata', {
              headline,
              summary: summary.slice(0, 80),
            });
          }
        } catch (error) {
          log.error(
            'Failed to auto-fetch article metadata',
            {},
            error instanceof Error ? error : undefined,
          );
        }
      }

      if (!headline) {
        return NextResponse.json(
          {
            error:
              'headline is required — provide it via query param or ensure the URL is reachable',
          },
          { status: 400 },
        );
      }

      forceArticle = {
        url,
        source: request.nextUrl.searchParams.get('source') || 'Manual',
        headline,
        category: request.nextUrl.searchParams.get('category') || 'TRAFFIC',
        summary,
        interestScore: 1,
      };
    }

    log.info('Starting news video generation pipeline');

    const result = await generateAndPostNewsVideo(forceArticle);

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
