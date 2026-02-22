import { NextRequest } from 'next/server';
import {
  EvidenceType,
  db,
  MediaSource,
  MediaType,
} from '@parking-ticket-pal/db';
import { getUserId } from '@/utils/user';
import { STORAGE_PATHS } from '@/constants';
import { createServerLogger } from '@/lib/logger';
import { put } from '@/lib/storage';

const log = createServerLogger({ action: 'evidence-upload-api' });

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

  const userId = await getUserId('upload evidence');

  if (!userId) {
    return Response.json(
      { success: false, error: 'Unauthorized' },
      { status: 401, headers: corsHeaders },
    );
  }

  try {
    const body = await request.json();
    const { image, description, evidenceType } = body as {
      image: string;
      description: string;
      evidenceType: EvidenceType;
    };

    if (!image) {
      return Response.json(
        { success: false, error: 'Image is required' },
        { status: 400, headers: corsHeaders },
      );
    }

    if (!description || !evidenceType) {
      return Response.json(
        { success: false, error: 'Evidence type and description are required' },
        { status: 400, headers: corsHeaders },
      );
    }

    // Verify ticket exists
    const ticket = await db.ticket.findFirst({
      where: { id: ticketId },
    });

    if (!ticket) {
      return Response.json(
        { success: false, error: 'Ticket not found' },
        { status: 404, headers: corsHeaders },
      );
    }

    // Convert base64 to buffer
    // Strip data URL prefix if present (e.g., "data:image/jpeg;base64,")
    const base64Data = image.includes(',') ? image.split(',')[1] : image;
    const fileBuffer = Buffer.from(base64Data, 'base64');

    // Determine file extension from data URL or default to jpg
    let fileExtension = 'jpg';
    let contentType = 'image/jpeg';
    const mimeMatch = image.match(/^data:(image\/\w+);base64,/);
    if (mimeMatch) {
      [, contentType] = mimeMatch;
      const [, subtype] = contentType.split('/');
      fileExtension = subtype === 'jpeg' ? 'jpg' : subtype;
    }

    const evidenceId = crypto.randomUUID();
    const storagePath = STORAGE_PATHS.TICKET_EVIDENCE.replace('%s', ticketId)
      .replace('%s', evidenceId)
      .replace('%s', fileExtension);

    const blob = await put(storagePath, fileBuffer, { contentType });

    const media = await db.media.create({
      data: {
        ticketId,
        url: blob.url,
        description,
        type: MediaType.IMAGE,
        source: MediaSource.EVIDENCE,
        evidenceType,
      },
    });

    return Response.json(
      { success: true, media },
      { status: 201, headers: corsHeaders },
    );
  } catch (error) {
    log.error(
      'Error uploading evidence via API',
      { ticketId, userId },
      error instanceof Error ? error : new Error(String(error)),
    );
    return Response.json(
      { success: false, error: 'Failed to upload evidence' },
      { status: 500, headers: corsHeaders },
    );
  }
};
