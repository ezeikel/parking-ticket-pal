import { generatePE3Form, getFormFillDataFromTicket } from '@/app/actions/form';
import { NextRequest } from 'next/server';
import { getUserId } from '@/utils/user';

export const POST = async (req: NextRequest) => {
  try {
    // Development bypass: allow testing with X-Test-User-Id header
    const isDevelopment = process.env.NODE_ENV === 'development';
    const testUserId = req.headers.get('X-Test-User-Id');

    let userId: string | null;

    if (isDevelopment && testUserId) {
      // In development, allow bypassing auth with test header
      userId = testUserId;
      console.log('[DEV] Using test user ID:', userId);
    } else {
      // Production: require proper authentication
      userId = await getUserId('generate PE3 form');
      if (!userId) {
        return Response.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 },
        );
      }
    }

    // Get form data from request
    const requestData = await req.json();

    if (!requestData.pcnNumber) {
      return Response.json(
        { success: false, error: 'PCN number is required' },
        { status: 400 },
      );
    }

    // Get the data to fill out the form via information from the ticket
    // Pass userId to verify ownership
    const formFillData = await getFormFillDataFromTicket(
      requestData.pcnNumber,
      userId
    );

    if (!formFillData) {
      return Response.json(
        { success: false, error: 'Failed to get form data from ticket' },
        { status: 400 },
      );
    }

    // Add reason text if provided
    if (requestData.reasonText) {
      formFillData.reasonText = requestData.reasonText;
    }

    // Add PE3-specific fields
    if (requestData.didNotReceiveNotice !== undefined) {
      formFillData.didNotReceiveNotice = requestData.didNotReceiveNotice;
    }

    if (requestData.madeRepresentations !== undefined) {
      formFillData.madeRepresentations = requestData.madeRepresentations;
    }

    if (requestData.appealedToAdjudicator !== undefined) {
      formFillData.appealedToAdjudicator = requestData.appealedToAdjudicator;
    }

    if (requestData.signed) {
      formFillData.signed = requestData.signed;
    }

    if (requestData.dated) {
      formFillData.dated = requestData.dated;
    }

    // generate the form
    const result = await generatePE3Form(formFillData);

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
    console.error('Error in PE3 form API:', error);
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
