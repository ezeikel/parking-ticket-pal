import { type NextRequest, NextResponse } from 'next/server';
import { generateAndPostNewsVideo } from '@/app/actions/news-video';

// 5 minutes max for video rendering pipeline
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
        { status: 500 }
      );
    }

    console.log(
      `Successfully generated news video: ${result.videoId}`
    );

    return NextResponse.json({
      success: true,
      message: 'News video generated and posted',
      videoId: result.videoId,
      videoUrl: result.videoUrl,
      headline: result.headline,
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
      { status: 500 }
    );
  }
};

export const GET = handleRequest;
export const POST = handleRequest;
