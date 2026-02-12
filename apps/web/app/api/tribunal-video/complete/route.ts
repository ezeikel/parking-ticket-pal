import { type NextRequest, NextResponse } from 'next/server';
import { completeTribunalVideo } from '@/lib/video-completion';

// Caption generation + social posting can take a while
export const maxDuration = 120;

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

    console.log(`[Tribunal Complete] Received callback for video ${videoId}`);

    await completeTribunalVideo(videoId, videoUrl, coverImageUrl ?? null);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Tribunal Complete] Error:', error);
    return NextResponse.json(
      {
        error: 'Completion failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
