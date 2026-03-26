import { NextRequest, after } from 'next/server';
import { createTicket } from '@/app/actions/ticket';
import { ticketFormSchema } from '@parking-ticket-pal/types';
import { getUserId } from '@/utils/user';
import { createServerLogger } from '@/lib/logger';

const log = createServerLogger({ action: 'ticket-create' });

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  // Flush logs after the response is sent (before serverless freezes)
  after(() => log.flush());

  try {
    const userId = await getUserId('create a ticket');

    if (!userId) {
      return Response.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const body = await request.json();

    log.info('Ticket create request body', {
      vehicleReg: body.vehicleReg,
      pcnNumber: body.pcnNumber,
      issuedAt: body.issuedAt,
      contraventionCode: body.contraventionCode,
      initialAmount: body.initialAmount,
      issuer: body.issuer,
      location: body.location,
    });

    // Validate the request body matches the ticket form schema
    const validatedData = ticketFormSchema.parse({
      ...body,
      issuedAt: new Date(body.issuedAt), // Convert string to Date
    });

    // Include any additional data from OCR if provided
    const ticketData = {
      ...validatedData,
      tempImageUrl: body.tempImageUrl,
      tempImagePath: body.tempImagePath,
      extractedText: body.extractedText,
      verified: body.verified === true,
    };

    const result = await createTicket(ticketData);

    if (!result) {
      return Response.json(
        { success: false, error: 'Failed to create ticket' },
        { status: 500 },
      );
    }

    if ('error' in result) {
      return Response.json(
        { success: false, error: result.error },
        { status: 409 },
      );
    }

    const ticket = result;

    return Response.json(
      { success: true, ticket },
      {
        status: 201,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers':
            'Content-Type, Authorization, x-user-id',
          'Content-Type': 'application/json',
        },
      },
    );
  } catch (error) {
    log.error(
      'Error creating ticket',
      undefined,
      error instanceof Error ? error : undefined,
    );

    if (error instanceof Error && error.name === 'ZodError') {
      log.error('Zod validation failed', {
        zodErrors: error.message,
      });
      return Response.json(
        {
          success: false,
          error: 'Invalid request data',
          details: error.message,
        },
        { status: 400 },
      );
    }

    return Response.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-user-id',
    },
  });
}
