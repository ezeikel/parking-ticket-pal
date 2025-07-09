'use server';

import { revalidatePath } from 'next/cache';
import { ChallengeStatus, ChallengeType } from '@prisma/client';
import { z } from 'zod';
import { db } from '@/lib/prisma';
import { getUserId } from '@/app/actions/user';

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

    // Verify the ticket belongs to the user
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

    revalidatePath(`/tickets/${validatedData.ticketId}`);

    return { success: true, data: challenge };
  } catch (error) {
    console.error('Error creating challenge:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

export const updateChallengeStatus = async (
  challengeId: string,
  status: 'PENDING' | 'SUCCESS' | 'ERROR',
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
    console.error('Error updating challenge status:', error);
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
    console.error('Error getting challenges:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};
