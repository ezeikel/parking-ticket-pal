'use server';

import { revalidatePath } from 'next/cache';
import {
  ChallengeStatus,
  ChallengeType,
  MediaSource,
  db,
} from '@parking-ticket-pal/db';
import { z } from 'zod';
import { track } from '@/utils/analytics-server';
import { TRACKING_EVENTS } from '@/constants/events';
import { getUserId } from '@/utils/user';
import { createServerLogger } from '@/lib/logger';
import generateChallengeContent from '@/utils/ai/generateChallengeContent';
import gatherEnrichment from '@/utils/ai/enrichment';

const logger = createServerLogger({ action: 'challenge' });

const challengeSchema = z.object({
  ticketId: z.string(),
  type: z.enum(['LETTER', 'AUTO_CHALLENGE']),
  reason: z.string().min(1),
  customReason: z.string().optional(),
});

export const createChallenge = async (
  data: z.infer<typeof challengeSchema>,
) => {
  const userId = await getUserId('create a challenge');

  if (!userId) {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    const validatedData = challengeSchema.parse(data);

    // verify the ticket belongs to the user
    const ticket = await db.ticket.findFirst({
      where: {
        id: validatedData.ticketId,
        vehicle: {
          userId,
        },
      },
    });

    if (!ticket) {
      return { success: false, error: 'Ticket not found' };
    }

    const challenge = await db.challenge.create({
      data: {
        ticketId: validatedData.ticketId,
        type: validatedData.type as ChallengeType,
        reason: validatedData.reason,
        customReason: validatedData.customReason,
        status: ChallengeStatus.PENDING,
      },
    });

    await track(TRACKING_EVENTS.CHALLENGE_CREATED, {
      ticket_id: challenge.ticketId,
      challenge_type: challenge.type,
      reason: challenge.reason,
    });

    revalidatePath(`/tickets/${validatedData.ticketId}`);

    return { success: true, data: challenge };
  } catch (error) {
    logger.error(
      'Error creating challenge',
      {
        ticketId: data.ticketId,
        type: data.type,
        userId,
      },
      error instanceof Error ? error : new Error(String(error)),
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

export const updateChallengeStatus = async (
  challengeId: string,
  status: ChallengeStatus,
  metadata?: Record<string, any>,
) => {
  const userId = await getUserId('update challenge status');

  if (!userId) {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    const challenge = await db.challenge.update({
      where: {
        id: challengeId,
        ticket: {
          vehicle: {
            userId,
          },
        },
      },
      data: {
        status,
        metadata: metadata || undefined,
        updatedAt: new Date(),
      },
      include: {
        ticket: true,
      },
    });

    revalidatePath(`/tickets/${challenge.ticket.id}`);

    return { success: true, data: challenge };
  } catch (error) {
    logger.error(
      'Error updating challenge status',
      {
        challengeId,
        status,
        userId,
      },
      error instanceof Error ? error : new Error(String(error)),
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Generate challenge argument text for a ticket.
 * Finds or creates a Challenge record, generates text via AI, and saves it.
 */
export const generateChallengeText = async (
  ticketId: string,
  challengeReason: string,
  additionalInfo?: string,
) => {
  const userId = await getUserId('generate challenge text');

  if (!userId) {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    // Verify ticket belongs to user and get needed data
    const ticket = await db.ticket.findFirst({
      where: {
        id: ticketId,
        vehicle: { userId },
      },
      select: {
        id: true,
        pcnNumber: true,
        contraventionCode: true,
        issuer: true,
        media: {
          select: { url: true, source: true },
        },
        challenges: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { id: true },
        },
      },
    });

    if (!ticket) {
      return { success: false, error: 'Ticket not found' };
    }

    // Find existing challenge or create one
    let challengeId = ticket.challenges[0]?.id;

    if (challengeId) {
      // Update existing challenge with new reason/info
      await db.challenge.update({
        where: { id: challengeId },
        data: {
          reason: challengeReason,
          additionalInfo: additionalInfo || null,
        },
      });
    } else {
      const challenge = await db.challenge.create({
        data: {
          ticketId,
          type: ChallengeType.LETTER,
          reason: challengeReason,
          additionalInfo: additionalInfo || null,
          status: ChallengeStatus.PENDING,
        },
      });
      challengeId = challenge.id;
    }

    // Collect image URLs
    const ticketImageUrls = ticket.media
      .filter((m) => m.source === MediaSource.TICKET && m.url)
      .map((m) => m.url);
    const evidenceImageUrls = ticket.media
      .filter(
        (m) =>
          (m.source === MediaSource.EVIDENCE ||
            m.source === ('STREET_VIEW' as MediaSource)) &&
          m.url,
      )
      .map((m) => m.url);

    // Gather enrichment data
    const enrichment = await gatherEnrichment({
      contraventionCode: ticket.contraventionCode,
      issuer: ticket.issuer,
      challengeReason,
      ticketId: ticket.id,
    });

    // Build enrichment prompt section for form-field mode
    const { buildEnrichmentPromptSection } =
      await import('@parking-ticket-pal/types');
    const enrichmentText =
      enrichment && enrichment.items.length > 0
        ? buildEnrichmentPromptSection(enrichment)
        : '';

    const combinedReason = enrichmentText
      ? `${challengeReason}\n\n${enrichmentText}`
      : challengeReason;

    // Generate the challenge text
    const text = await generateChallengeContent({
      contentType: 'form-field',
      pcnNumber: ticket.pcnNumber,
      challengeReason: combinedReason,
      additionalDetails: additionalInfo,
      userId,
      formFieldPlaceholderText: 'Please provide the reasons for your challenge',
      userEvidenceImageUrls: evidenceImageUrls,
      issuerEvidenceImageUrls: ticketImageUrls,
    });

    if (!text) {
      return { success: false, error: 'Failed to generate challenge text' };
    }

    // Save the generated text
    await db.challenge.update({
      where: { id: challengeId },
      data: {
        challengeText: text,
        challengeTextGeneratedAt: new Date(),
      },
    });

    await track(TRACKING_EVENTS.CHALLENGE_CREATED, {
      ticket_id: ticketId,
      challenge_type: ChallengeType.LETTER,
      reason: challengeReason,
    });

    revalidatePath(`/tickets/${ticketId}`);

    return {
      success: true,
      data: { challengeId, challengeText: text },
    };
  } catch (error) {
    logger.error(
      'Error generating challenge text',
      { ticketId, userId },
      error instanceof Error ? error : new Error(String(error)),
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Save edited challenge text or additional info.
 * Used for debounced auto-save from the UI.
 */
export const saveChallengeText = async (
  challengeId: string,
  data: { challengeText?: string; additionalInfo?: string },
) => {
  const userId = await getUserId('save challenge text');

  if (!userId) {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    const challenge = await db.challenge.update({
      where: {
        id: challengeId,
        ticket: {
          vehicle: { userId },
        },
      },
      data: {
        ...(data.challengeText !== undefined && {
          challengeText: data.challengeText,
        }),
        ...(data.additionalInfo !== undefined && {
          additionalInfo: data.additionalInfo,
        }),
      },
      select: {
        id: true,
        ticketId: true,
      },
    });

    revalidatePath(`/tickets/${challenge.ticketId}`);

    return { success: true };
  } catch (error) {
    logger.error(
      'Error saving challenge text',
      { challengeId, userId },
      error instanceof Error ? error : new Error(String(error)),
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

export const getChallengesForTicket = async (ticketId: string) => {
  const userId = await getUserId('get challenges for ticket');

  if (!userId) {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    const challenges = await db.challenge.findMany({
      where: {
        ticketId,
        ticket: {
          vehicle: {
            userId,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return { success: true, data: challenges };
  } catch (error) {
    logger.error(
      'Error getting challenges',
      {
        ticketId,
        userId,
      },
      error instanceof Error ? error : new Error(String(error)),
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};
