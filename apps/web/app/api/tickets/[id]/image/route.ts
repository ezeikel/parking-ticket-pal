import { NextRequest } from 'next/server';
import { MediaSource, MediaType, db } from '@parking-ticket-pal/db';
import { del, put } from '@/lib/storage';
import { getUserId } from '@/utils/user';
import { STORAGE_PATHS } from '@/constants';
import { createServerLogger } from '@/lib/logger';

const log = createServerLogger({ action: 'ticket-image-api' });

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

export const OPTIONS = () =>
  new Response(null, { status: 204, headers: corsHeaders });

export const POST = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id: ticketId } = await params;

  if (!ticketId) {
    return Response.json(
      { success: false, error: 'Ticket ID is required' },
      { status: 400, headers: corsHeaders },
    );
  }

  const userId = await getUserId('add image to ticket');

  if (!userId) {
    return Response.json(
      { success: false, error: 'Unauthorized' },
      { status: 401, headers: corsHeaders },
    );
  }

  try {
    const body = await request.json();
    const { tempImageUrl, tempImagePath } = body;

    if (!tempImageUrl || !tempImagePath) {
      return Response.json(
        { success: false, error: 'Temp image URL and path are required' },
        { status: 400, headers: corsHeaders },
      );
    }

    // Verify ticket belongs to user
    const ticket = await db.ticket.findFirst({
      where: {
        id: ticketId,
        vehicle: { userId },
      },
    });

    if (!ticket) {
      return Response.json(
        { success: false, error: 'Ticket not found' },
        { status: 404, headers: corsHeaders },
      );
    }

    // Extract file extension from temp path
    const extension = tempImagePath.split('.').pop() || 'jpg';

    // Move file to permanent location
    const permanentPath = STORAGE_PATHS.TICKET_IMAGE.replace(
      '%s',
      ticketId,
    ).replace('%s', extension);

    // Download temp file and upload to permanent location
    const tempResponse = await fetch(tempImageUrl);
    if (!tempResponse.ok) {
      throw new Error(`Failed to fetch temp file: ${tempResponse.statusText}`);
    }

    const tempBuffer = await tempResponse.arrayBuffer();

    const permanentBlob = await put(permanentPath, Buffer.from(tempBuffer), {
      contentType: `image/${extension === 'jpg' ? 'jpeg' : extension}`,
    });

    // Create media record with permanent URL
    await db.media.create({
      data: {
        ticketId,
        url: permanentBlob.url,
        type: MediaType.IMAGE,
        source: MediaSource.TICKET,
        description: 'Ticket front image',
      },
    });

    // Delete temporary file
    await del(tempImageUrl);

    log.info('Successfully added image to ticket', {
      ticketId,
      permanentPath,
    });

    return Response.json(
      { success: true },
      { status: 200, headers: corsHeaders },
    );
  } catch (error) {
    log.error(
      'Error adding image to ticket',
      { ticketId, userId },
      error instanceof Error ? error : new Error(String(error)),
    );
    return Response.json(
      { success: false, error: 'Failed to add image to ticket' },
      { status: 500, headers: corsHeaders },
    );
  }
};
