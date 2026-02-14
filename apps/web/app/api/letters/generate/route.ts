import { generateChallengeLetterByPcn } from '@/app/actions/letter';
import { NextRequest } from 'next/server';
import { getUserId } from '@/utils/user';
import { createServerLogger } from '@/lib/logger';

const log = createServerLogger({ action: 'letter-generate' });

export const maxDuration = 60;

export const POST = async (req: NextRequest) => {
  try {
    // Development bypass: allow testing with X-Test-User-Id header
    const isDevelopment = process.env.NODE_ENV === 'development';
    const testUserId = req.headers.get('X-Test-User-Id');

    let userId: string | null;

    if (isDevelopment && testUserId) {
      // In development, allow bypassing auth with test header
      userId = testUserId;
      log.debug('Using test user ID', { userId });
    } else {
      // Production: require proper authentication
      userId = await getUserId('generate a challenge letter');
      if (!userId) {
        return Response.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 },
        );
      }
    }

    // Get request data
    const requestData = await req.json();
    const { pcnNumber, challengeReason, additionalDetails } = requestData;

    if (!pcnNumber) {
      return Response.json(
        { success: false, error: 'PCN number is required' },
        { status: 400 },
      );
    }

    if (!challengeReason) {
      return Response.json(
        { success: false, error: 'Challenge reason is required' },
        { status: 400 },
      );
    }

    // Use shared generateChallengeLetterByPcn function
    // It handles ticket lookup and ownership verification
    const result = await generateChallengeLetterByPcn(
      pcnNumber,
      challengeReason,
      userId,
      additionalDetails,
    );

    if (!result) {
      return Response.json(
        { success: false, error: 'Failed to generate challenge letter' },
        { status: 400 },
      );
    }

    return Response.json(result, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  } catch (error) {
    log.error(
      'Error in challenge letter API',
      undefined,
      error instanceof Error ? error : undefined,
    );
    return Response.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
};

// Handle OPTIONS requests for CORS preflight
export const OPTIONS = () =>
  new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
