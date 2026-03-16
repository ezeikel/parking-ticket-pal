import { NextRequest } from 'next/server';
import { getUserId } from '@/utils/user';
import { reExtractFromImage } from '@/app/actions/ocr';

export const maxDuration = 60;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

export const OPTIONS = () =>
  new Response(null, { status: 204, headers: corsHeaders });

export const POST = async (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id: ticketId } = await params;

  if (!ticketId) {
    return Response.json(
      { success: false, error: 'Ticket ID is required' },
      { status: 400, headers: corsHeaders },
    );
  }

  const userId = await getUserId('re-extract ticket data');

  if (!userId) {
    return Response.json(
      { success: false, error: 'Unauthorized' },
      { status: 401, headers: corsHeaders },
    );
  }

  const result = await reExtractFromImage(ticketId);

  return Response.json(result, {
    status: result.success ? 200 : 400,
    headers: corsHeaders,
  });
};
