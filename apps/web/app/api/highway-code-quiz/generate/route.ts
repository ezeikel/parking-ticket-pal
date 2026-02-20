import { type NextRequest, NextResponse } from 'next/server';
import { generateAndPostHighwayCodeQuiz } from '@/app/actions/highway-code-quiz';
import { createServerLogger } from '@/lib/logger';

const log = createServerLogger({ action: 'highway-code-quiz-generate' });

// Quiz slides are stills — pipeline should complete well within 60s
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

    log.info('Starting Highway Code quiz generation pipeline');

    const result = await generateAndPostHighwayCodeQuiz();

    if (!result.success) {
      log.error('Highway Code quiz generation failed', {
        error: result.error,
      });
      return NextResponse.json(
        { error: result.error, quizPostId: result.quizPostId },
        { status: 500 },
      );
    }

    log.info('Highway Code quiz pipeline completed', {
      quizPostId: result.quizPostId,
      signName: result.signName,
    });

    return NextResponse.json({
      success: true,
      message: 'Highway Code quiz generated and posted',
      quizPostId: result.quizPostId,
      signName: result.signName,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    log.error(
      'Error in Highway Code quiz generation',
      undefined,
      error instanceof Error ? error : undefined,
    );

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
