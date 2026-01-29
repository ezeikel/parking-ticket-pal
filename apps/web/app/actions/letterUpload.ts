'use server';

import { revalidatePath } from 'next/cache';
import { del, put } from '@/lib/storage';
import {
  db,
  LetterType,
  MediaSource,
  MediaType,
  AmountIncreaseSourceType,
} from '@parking-ticket-pal/db';
import { getUserId } from '@/utils/user';
import { createServerLogger } from '@/lib/logger';
import { STORAGE_PATHS } from '@/constants';
import { extractOCRTextWithVision } from './ocr';
import {
  getMappedStatus,
  shouldUpdateStatus,
} from '@/utils/letterStatusMapping';
import { validateLetterType } from '@/utils/letterTypeValidation';

const logger = createServerLogger({ action: 'letterUpload' });

/**
 * Upload a letter directly to an existing ticket
 * Used from the ticket detail page to add council letters
 */
export async function uploadLetterToTicket(
  ticketId: string,
  formData: FormData,
): Promise<{ success: boolean; error?: string; letterId?: string; warning?: string }> {
  const userId = await getUserId('upload a letter');

  if (!userId) {
    return { success: false, error: 'Not authenticated' };
  }

  const file = formData.get('file') as File | null;
  const letterType = formData.get('letterType') as LetterType | null;
  const sentAtStr = formData.get('sentAt') as string | null;

  if (!file) {
    return { success: false, error: 'No file provided' };
  }

  if (!letterType) {
    return { success: false, error: 'Letter type is required' };
  }

  const sentAt = sentAtStr ? new Date(sentAtStr) : new Date();

  try {
    // Verify ticket exists and belongs to user
    const ticket = await db.ticket.findUnique({
      where: { id: ticketId },
      select: {
        id: true,
        pcnNumber: true,
        issuedAt: true,
        status: true,
        statusUpdatedAt: true,
        initialAmount: true,
        vehicle: {
          select: {
            userId: true,
            registrationNumber: true,
          },
        },
      },
    });

    if (!ticket) {
      return { success: false, error: 'Ticket not found' };
    }

    if (ticket.vehicle.userId !== userId) {
      return { success: false, error: 'Not authorized to modify this ticket' };
    }

    // Validate letter type against current ticket status
    const validation = validateLetterType(letterType, ticket.status);
    if (!validation.isValid) {
      return { success: false, error: validation.warning };
    }

    // Store warning if there is one
    const validationWarning = validation.warning;

    // Extract text from image using OCR
    const ocrFormData = new FormData();
    ocrFormData.append('image', file);
    const ocrResult = await extractOCRTextWithVision(ocrFormData);

    const extractedText = ocrResult.data?.extractedText || '';
    const summary = ocrResult.data?.summary || '';
    const currentAmount = ocrResult.data?.currentAmount || null;

    // Create the letter
    const letter = await db.letter.create({
      data: {
        type: letterType,
        ticketId: ticket.id,
        extractedText,
        summary,
        sentAt,
      },
    });

    // Upload image and create media record
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const extension = file.name.split('.').pop() || 'jpg';

    const imagePath = STORAGE_PATHS.LETTER_IMAGE.replace('%s', letter.id).replace(
      '%s',
      extension,
    );

    const blob = await put(imagePath, buffer, {
      contentType: file.type || `image/${extension === 'jpg' ? 'jpeg' : extension}`,
    });

    await db.media.create({
      data: {
        ticketId: ticket.id,
        letterId: letter.id,
        url: blob.url,
        type: MediaType.IMAGE,
        source: MediaSource.LETTER,
        description: `${letterType.replace(/_/g, ' ')} letter image`,
      },
    });

    // Delete temp file if OCR created one
    if (ocrResult.tempImagePath) {
      try {
        await del(ocrResult.imageUrl || '');
      } catch {
        // Ignore cleanup errors
      }
    }

    // Check if letter should trigger a status update
    const mappedStatus = getMappedStatus(letterType);
    if (
      mappedStatus &&
      shouldUpdateStatus(
        letterType,
        sentAt,
        ticket.statusUpdatedAt,
        ticket.issuedAt,
      )
    ) {
      await db.ticket.update({
        where: { id: ticket.id },
        data: {
          status: mappedStatus,
          statusUpdatedAt: sentAt,
          statusUpdatedBy: 'LETTER_UPLOAD',
        },
      });

      logger.info('Ticket status updated from letter upload', {
        ticketId: ticket.id,
        letterId: letter.id,
        letterType,
        newStatus: mappedStatus,
        sentAt,
      });
    }

    // Create AmountIncrease if OCR detected a higher amount
    if (currentAmount && currentAmount > ticket.initialAmount) {
      await db.amountIncrease.create({
        data: {
          ticketId: ticket.id,
          letterId: letter.id,
          amount: currentAmount,
          reason: `${letterType.replace(/_/g, ' ')} letter`,
          sourceType: AmountIncreaseSourceType.LETTER,
          sourceId: letter.id,
          effectiveAt: sentAt,
        },
      });

      logger.info('Amount increase created from letter upload', {
        ticketId: ticket.id,
        letterId: letter.id,
        letterType,
        previousAmount: ticket.initialAmount,
        newAmount: currentAmount,
      });
    }

    revalidatePath(`/tickets/${ticketId}`);

    logger.info('Letter uploaded to ticket', {
      ticketId,
      letterId: letter.id,
      letterType,
      userId,
    });

    return { success: true, letterId: letter.id, warning: validationWarning };
  } catch (error) {
    logger.error(
      'Error uploading letter to ticket',
      { ticketId, userId },
      error instanceof Error ? error : new Error(String(error)),
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upload letter',
    };
  }
}

/**
 * Delete a letter from a ticket
 */
export async function deleteLetter(
  letterId: string,
): Promise<{ success: boolean; error?: string }> {
  const userId = await getUserId('delete a letter');

  if (!userId) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    // Get letter with ticket info
    const letter = await db.letter.findUnique({
      where: { id: letterId },
      include: {
        ticket: {
          select: {
            id: true,
            vehicle: {
              select: { userId: true },
            },
          },
        },
        media: true,
      },
    });

    if (!letter) {
      return { success: false, error: 'Letter not found' };
    }

    if (letter.ticket.vehicle.userId !== userId) {
      return { success: false, error: 'Not authorized to delete this letter' };
    }

    // Delete media files from storage
    for (const media of letter.media) {
      try {
        await del(media.url);
      } catch {
        // Log but continue if file deletion fails
        logger.warn('Failed to delete media file', { mediaId: media.id, url: media.url });
      }
    }

    // Delete letter (will cascade delete media records)
    await db.letter.delete({
      where: { id: letterId },
    });

    revalidatePath(`/tickets/${letter.ticket.id}`);

    logger.info('Letter deleted', { letterId, ticketId: letter.ticket.id, userId });

    return { success: true };
  } catch (error) {
    logger.error(
      'Error deleting letter',
      { letterId, userId },
      error instanceof Error ? error : new Error(String(error)),
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete letter',
    };
  }
}
