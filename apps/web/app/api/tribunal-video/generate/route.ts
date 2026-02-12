import { type NextRequest, NextResponse } from 'next/server';
import { generateAndPostTribunalVideo } from '@/app/actions/tribunal-video';

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

    console.log('Starting tribunal case video generation pipeline...');

    const result = await generateAndPostTribunalVideo();

    if (!result.success) {
      console.error('Tribunal video generation failed:', result.error);
      return NextResponse.json(
        { error: result.error, videoId: result.videoId },
        { status: 500 },
      );
    }

    console.log(
      `Tribunal video pipeline dispatched: ${result.videoId} (status: ${'status' in result ? result.status : 'unknown'})`,
    );

    return NextResponse.json({
      success: true,
      message: 'Tribunal case video rendering dispatched',
      videoId: result.videoId,
      status: 'status' in result ? result.status : 'RENDERING',
      caseReference:
        'caseReference' in result ? result.caseReference : undefined,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in tribunal video generation:', error);

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
