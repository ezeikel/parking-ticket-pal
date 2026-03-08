import {
  generateN244Form,
  getFormFillDataFromTicket,
} from '@/app/actions/form';
import { NextRequest } from 'next/server';
import { getUserId } from '@/utils/user';
import { createServerLogger } from '@/lib/logger';

const log = createServerLogger({ action: 'form-n244' });

export const maxDuration = 60;

export const POST = async (req: NextRequest) => {
  try {
    // Development bypass: allow testing with X-Test-User-Id header
    const isDevelopment = process.env.NODE_ENV === 'development';
    const testUserId = req.headers.get('X-Test-User-Id');

    let userId: string | null;

    if (isDevelopment && testUserId) {
      userId = testUserId;
      log.debug('Using test user ID', { userId });
    } else {
      userId = await getUserId('generate N244 form');
      if (!userId) {
        return Response.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 },
        );
      }
    }

    const requestData = await req.json();

    if (!requestData.pcnNumber) {
      return Response.json(
        { success: false, error: 'PCN number is required' },
        { status: 400 },
      );
    }

    const formFillData = await getFormFillDataFromTicket(
      requestData.pcnNumber,
      userId,
    );

    if (!formFillData) {
      return Response.json(
        { success: false, error: 'Failed to get form data from ticket' },
        { status: 400 },
      );
    }

    // Add N244-specific fields
    if (requestData.orderRequestText) {
      formFillData.orderRequestText = requestData.orderRequestText;
    }

    if (requestData.evidenceText) {
      formFillData.reasonText = requestData.evidenceText;
    }

    const result = await generateN244Form(formFillData);

    if (!result.success) {
      return Response.json(
        { success: false, error: result.error },
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
      'Error in N244 form API',
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
