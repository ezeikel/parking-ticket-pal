import { NextRequest } from 'next/server';
import { db } from '@parking-ticket-pal/db';
import { getUserId } from '@/utils/user';
import { createServerLogger } from '@/lib/logger';
import { del } from '@/lib/storage';

const log = createServerLogger({ action: 'evidence-delete-api' });

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

export const OPTIONS = () =>
  new Response(null, { status: 204, headers: corsHeaders });

export const DELETE = async (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; mediaId: string }> },
) => {
  const { id: ticketId, mediaId } = await params;

  if (!ticketId || !mediaId) {
    return Response.json(
      { success: false, error: 'Ticket ID and Media ID are required' },
      { status: 400, headers: corsHeaders },
    );
  }

  const userId = await getUserId('delete evidence');

  if (!userId) {
    return Response.json(
      { success: false, error: 'Unauthorized' },
      { status: 401, headers: corsHeaders },
    );
  }

  try {
    // Look up the media record to get the URL for R2 deletion
    const media = await db.media.findFirst({
      where: {
        id: mediaId,
        ticketId,
      },
    });

    if (!media) {
      return Response.json(
        { success: false, error: 'Evidence not found' },
        { status: 404, headers: corsHeaders },
      );
    }

    // Delete from R2 storage
    await del(media.url);

    // Delete from database
    await db.media.delete({
      where: {
        id: mediaId,
        ticketId,
      },
    });

    return Response.json(
      { success: true },
      { status: 200, headers: corsHeaders },
    );
  } catch (error) {
    log.error(
      'Error deleting evidence via API',
      { ticketId, mediaId, userId },
      error instanceof Error ? error : new Error(String(error)),
    );
    return Response.json(
      { success: false, error: 'Failed to delete evidence' },
      { status: 500, headers: corsHeaders },
    );
  }
};
