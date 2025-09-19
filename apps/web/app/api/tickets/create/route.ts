import { NextRequest } from 'next/server';
import { createTicket } from '@/app/actions/ticket';
import { ticketFormSchema } from '@/types';
import { getUserId } from '@/utils/user';

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId('create a ticket');
    
    if (!userId) {
      return Response.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
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
    };

    const ticket = await createTicket(ticketData);

    if (!ticket) {
      return Response.json(
        { success: false, error: 'Failed to create ticket' },
        { status: 500 }
      );
    }

    return Response.json(
      { success: true, ticket },
      {
        status: 201,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('API Error creating ticket:', error);
    
    if (error instanceof Error && error.name === 'ZodError') {
      return Response.json(
        { success: false, error: 'Invalid request data', details: error.message },
        { status: 400 }
      );
    }

    return Response.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}