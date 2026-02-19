import { type NextRequest, NextResponse } from 'next/server';
import { db } from '@parking-ticket-pal/db';
import { sendNewsVideoFailed } from '@/lib/email';
import { createServerLogger } from '@/lib/logger';

const log = createServerLogger({ action: 'news-video-failed' });

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { videoId, error: errorMessage, secret } = body;

    if (!process.env.WORKER_SECRET || secret !== process.env.WORKER_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!videoId) {
      return NextResponse.json(
        { error: 'Missing required field: videoId' },
        { status: 400 },
      );
    }

    log.error('Worker reported render failure', {
      videoId,
      errorMessage,
    });

    const video = await db.newsVideo.update({
      where: { id: videoId },
      data: {
        status: 'FAILED',
        errorMessage: errorMessage ?? 'Worker render failed (no details)',
      },
    });

    if (process.env.ADMIN_EMAIL) {
      await sendNewsVideoFailed(process.env.ADMIN_EMAIL, {
        failedAt: new Date().toISOString(),
        errorMessage: errorMessage ?? 'Worker render failed',
        videoId,
        headline: video.headline ?? undefined,
        stage: 'RENDERING',
      }).catch((emailErr) => {
        log.error(
          'Failed to send failure email',
          undefined,
          emailErr instanceof Error ? emailErr : undefined,
        );
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    log.error(
      'Error handling render failure callback',
      undefined,
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json(
      {
        error: 'Failed to process failure callback',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
