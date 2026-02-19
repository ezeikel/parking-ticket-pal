import { type NextRequest, NextResponse } from 'next/server';
import { db } from '@parking-ticket-pal/db';
import { createServerLogger } from '@/lib/logger';

const log = createServerLogger({ action: 'tribunal-video-failed' });

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

    await db.tribunalCaseVideo.update({
      where: { id: videoId },
      data: {
        status: 'FAILED',
        errorMessage: errorMessage ?? 'Worker render failed (no details)',
      },
    });

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
