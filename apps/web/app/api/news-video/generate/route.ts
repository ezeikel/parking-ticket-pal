import { type NextRequest, NextResponse } from 'next/server';
import { generateAndPostNewsVideo } from '@/app/actions/news-video';

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

    console.log('Starting news video generation pipeline...');

    const result = await generateAndPostNewsVideo();

    if ('skipped' in result && result.skipped) {
      console.log('No new articles found, skipped');
      return NextResponse.json({
        success: true,
        skipped: true,
        message: 'No new articles found',
        timestamp: new Date().toISOString(),
      });
    }

    if (!result.success) {
      console.error('News video generation failed:', result.error);
      return NextResponse.json(
        { error: result.error, videoId: result.videoId },
        { status: 500 },
      );
    }

    console.log(
      `News video pipeline dispatched: ${result.videoId} (status: ${'status' in result ? result.status : 'unknown'})`,
    );

    return NextResponse.json({
      success: true,
      message: 'News video rendering dispatched',
      videoId: result.videoId,
      status: 'status' in result ? result.status : 'RENDERING',
      headline: 'headline' in result ? result.headline : undefined,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in news video generation:', error);

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
