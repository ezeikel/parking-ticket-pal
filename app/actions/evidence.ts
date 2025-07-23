'use server';

import { put, del } from '@vercel/blob';
import { revalidatePath } from 'next/cache';
import { EvidenceType, MediaSource, MediaType } from '@prisma/client';
import { db } from '@/lib/prisma';
import { getUserId } from '@/utils/user';
import { STORAGE_PATHS } from '@/constants';

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
    // Use proper storage path pattern
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const timestamp = Date.now();
    const blobPath = STORAGE_PATHS.TICKET_EVIDENCE.replace('%s', userId)
      .replace('%s', ticketId)
      .replace('evidence-%s.jpg', `evidence-${timestamp}.${fileExtension}`);

    const blob = await put(blobPath, file, {
      access: 'public',
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
    console.error('Upload error:', error);
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
    console.error('Delete error:', error);
    const message =
      error instanceof Error ? error.message : 'Unknown error occurred.';
    return { success: false, error: message };
  }
};
