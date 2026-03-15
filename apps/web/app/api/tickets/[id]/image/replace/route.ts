import { NextRequest, after } from 'next/server';
import { MediaSource, MediaType, db } from '@parking-ticket-pal/db';
import { del, put } from '@/lib/storage';
import { getUserId } from '@/utils/user';
import { STORAGE_PATHS } from '@/constants';
import { createServerLogger } from '@/lib/logger';
import { reExtractFromImage } from '@/app/actions/ocr';

const log = createServerLogger({ action: 'ticket-image-replace' });

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

  const userId = await getUserId('replace ticket photo');

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
      include: {
        media: {
          where: { source: MediaSource.TICKET },
        },
      },
    });

    if (!ticket) {
      return Response.json(
        { success: false, error: 'Ticket not found' },
        { status: 404, headers: corsHeaders },
      );
    }

    // Delete existing TICKET media records and R2 files
    await Promise.all(
      ticket.media.map(async (media) => {
        try {
          await del(media.url);
        } catch (error) {
          log.error(
            'Failed to delete old media file from R2',
            { mediaId: media.id, url: media.url },
            error instanceof Error ? error : new Error(String(error)),
          );
        }
        await db.media.delete({ where: { id: media.id } });
      }),
    );

    // Move new file to permanent location
    const extension = tempImagePath.split('.').pop() || 'jpg';
    const permanentPath = STORAGE_PATHS.TICKET_IMAGE.replace(
      '%s',
      ticketId,
    ).replace('%s', extension);

    const tempResponse = await fetch(tempImageUrl);
    if (!tempResponse.ok) {
      throw new Error(`Failed to fetch temp file: ${tempResponse.statusText}`);
    }

    const tempBuffer = await tempResponse.arrayBuffer();
    const permanentBlob = await put(permanentPath, Buffer.from(tempBuffer), {
      contentType: `image/${extension === 'jpg' ? 'jpeg' : extension}`,
    });

    // Create new media record
    await db.media.create({
      data: {
        ticketId,
        url: permanentBlob.url,
        type: MediaType.IMAGE,
        source: MediaSource.TICKET,
        description: 'Ticket front image',
      },
    });

    // Delete temp file
    await del(tempImageUrl);

    log.info('Successfully replaced ticket photo', { ticketId });

    // Auto-trigger re-extraction
    after(async () => {
      try {
        await reExtractFromImage(ticketId);
      } catch (error) {
        log.error(
          'Auto re-extraction after replace failed',
          { ticketId },
          error instanceof Error ? error : new Error(String(error)),
        );
      }
    });

    return Response.json(
      { success: true },
      { status: 200, headers: corsHeaders },
    );
  } catch (error) {
    log.error(
      'Error replacing ticket photo',
      { ticketId, userId },
      error instanceof Error ? error : new Error(String(error)),
    );
    return Response.json(
      { success: false, error: 'Failed to replace ticket photo' },
      { status: 500, headers: corsHeaders },
    );
  }
};
