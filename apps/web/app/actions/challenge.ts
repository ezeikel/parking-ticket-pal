'use server';

import { revalidatePath } from 'next/cache';
import { ChallengeStatus, ChallengeType, db } from '@parking-ticket-pal/db';
import { z } from 'zod';
import { track } from '@/utils/analytics-server';
import { TRACKING_EVENTS } from '@/constants/events';
import { getUserId } from '@/utils/user';
import { createServerLogger } from '@/lib/logger';

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
