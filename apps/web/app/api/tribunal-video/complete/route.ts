import { type NextRequest, NextResponse } from 'next/server';
import { completeTribunalVideo } from '@/lib/video-completion';
import { createServerLogger } from '@/lib/logger';

const log = createServerLogger({ action: 'tribunal-video-complete' });

// Caption generation + social posting (IG polls up to 150s) + email
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { videoId, videoUrl, coverImageUrl, secret } = body;

    // Verify shared secret
    if (!process.env.WORKER_SECRET || secret !== process.env.WORKER_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!videoId || !videoUrl) {
      return NextResponse.json(
        { error: 'Missing required fields: videoId, videoUrl' },
        { status: 400 },
      );
    }

    log.info('Received callback for video', { videoId });

    await completeTribunalVideo(videoId, videoUrl, coverImageUrl ?? null);

    return NextResponse.json({ success: true });
  } catch (error) {
    log.error(
      'Error completing tribunal video',
      undefined,
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json(
      {
        error: 'Completion failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
