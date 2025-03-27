import { generateTE7Form, getFormFillDataFromTicket } from '@/app/actions';
import { NextRequest } from 'next/server';
// import { auth } from '@/auth';

export const POST = async (req: NextRequest) => {
  try {
    // TODO: put behind auth
    // get user from auth
    // const session = await auth();
    // if (!session?.user) {
    //   return Response.json(
    //     { success: false, error: 'Unauthorized' },
    //     { status: 401 }
    //   );
    // }

    // Get form data from request
    const requestData = await req.json();

    if (!requestData.pcnNumber) {
      return Response.json(
        { success: false, error: 'PCN number is required' },
        { status: 400 },
      );
    }

    // get the data to fill out the form via information from the ticket
    const formFillData = await getFormFillDataFromTicket(requestData.pcnNumber);

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
    console.error('Error in TE7 form API:', error);
    return Response.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
};

// Handle OPTIONS requests for CORS preflight
export const OPTIONS = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
};
