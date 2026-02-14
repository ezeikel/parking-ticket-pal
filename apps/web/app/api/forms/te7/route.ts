import { generateTE7Form, getFormFillDataFromTicket } from '@/app/actions/form';
import { NextRequest } from 'next/server';
import { getUserId } from '@/utils/user';
import { createServerLogger } from '@/lib/logger';

const log = createServerLogger({ action: 'form-te7' });

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
      userId = await getUserId('generate TE7 form');
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
      userId,
    );

    if (!formFillData) {
      return Response.json(
        { success: false, error: 'Failed to get form data from ticket' },
        { status: 400 },
      );
    }

    // add reason text if provided
    if (requestData.reasonText) {
      formFillData.reasonText = requestData.reasonText;
    }

    // Add TE7-specific fields
    if (requestData.filingOption) {
      formFillData.filingOption = requestData.filingOption;
    }

    if (requestData.signatureOption) {
      formFillData.signatureOption = requestData.signatureOption;
    }

    if (requestData.statementType) {
      formFillData.statementType = requestData.statementType;
    }

    if (requestData.officerOfCompany !== undefined) {
      formFillData.officerOfCompany = requestData.officerOfCompany;
    }

    if (requestData.partnerOfFirm !== undefined) {
      formFillData.partnerOfFirm = requestData.partnerOfFirm;
    }

    if (requestData.litigationFriend !== undefined) {
      formFillData.litigationFriend = requestData.litigationFriend;
    }

    if (requestData.titleOther) {
      formFillData.titleOther = requestData.titleOther;
    }

    if (requestData.signedName) {
      formFillData.signedName = requestData.signedName;
    }

    if (requestData.dated) {
      formFillData.dated = requestData.dated;
    }

    if (requestData.printFullName) {
      formFillData.printFullName = requestData.printFullName;
    }

    // generate the form
    const result = await generateTE7Form(formFillData);

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
      'Error in TE7 form API',
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
