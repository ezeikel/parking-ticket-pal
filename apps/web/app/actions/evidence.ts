'use server';

import { revalidatePath } from 'next/cache';
import { EvidenceType, MediaSource, MediaType } from '@parking-ticket-pal/db';
import { db } from '@parking-ticket-pal/db';
import { getUserId } from '@/utils/user';
import { STORAGE_PATHS } from '@/constants';
import { createServerLogger } from '@/lib/logger';
import { put, del } from '@/lib/storage';

const logger = createServerLogger({ action: 'evidence' });

export const uploadEvidence = async (ticketId: string, formData: FormData) => {
  const userId = await getUserId('upload evidence');

  if (!userId) {
    return { success: false, error: 'Unauthorized' };
  }

  const ticket = await db.ticket.findFirst({
    where: {
      id: ticketId,
    },
  });

  if (!ticket) {
    return { success: false, error: 'Ticket not found' };
  }

  const file = formData.get('file') as File;
  const description = formData.get('description') as string;
  const evidenceType = formData.get('evidenceType') as EvidenceType;

  if (!file || file.size === 0) {
    return { success: false, error: 'No file selected.' };
  }
  if (!description || !evidenceType) {
    return {
      success: false,
      error: 'Evidence type and description are required.',
    };
  }

  try {
    // Use proper storage path pattern: tickets/{ticketId}/evidence/{evidenceId}.{ext}
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const evidenceId = crypto.randomUUID();
    const storagePath = STORAGE_PATHS.TICKET_EVIDENCE
      .replace('%s', ticketId)
      .replace('%s', evidenceId)
      .replace('%s', fileExtension);

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const blob = await put(storagePath, fileBuffer, {
      contentType: file.type,
    });

    // Create media record with proper field names
    await db.media.create({
      data: {
        ticketId,
        url: blob.url,
        description,
        type: MediaType.IMAGE,
        source: MediaSource.EVIDENCE,
        evidenceType,
      },
    });

    revalidatePath(`/tickets/${ticketId}`);
    return { success: true, blob };
  } catch (error) {
    logger.error('Error uploading evidence', {
      ticketId,
      evidenceType,
      fileName: file.name,
      fileSize: file.size,
      userId
    }, error instanceof Error ? error : new Error(String(error)));
    const message =
      error instanceof Error ? error.message : 'Unknown error occurred.';
    return { success: false, error: message };
  }
};

export const deleteEvidence = async (
  ticketId: string,
  mediaId: string,
  blobUrl: string,
) => {
  const userId = await getUserId('delete evidence');

  if (!userId) {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    await del(blobUrl);

    await db.media.delete({
      where: {
        id: mediaId,
        ticketId,
      },
    });

    revalidatePath(`/tickets/${ticketId}`);
    return { success: true };
  } catch (error) {
    logger.error('Error deleting evidence', {
      ticketId,
      mediaId,
      blobUrl,
      userId
    }, error instanceof Error ? error : new Error(String(error)));
    const message =
      error instanceof Error ? error.message : 'Unknown error occurred.';
    return { success: false, error: message };
  }
};
