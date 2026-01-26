'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@parking-ticket-pal/db';
import { createServerLogger } from '@/lib/logger';
import {
  AmountIncrease,
  AmountIncreaseSourceType,
  Letter,
} from '@parking-ticket-pal/db';

const logger = createServerLogger({ action: 'amount-increase' });

const amountIncreaseSchema = z.object({
  ticketId: z.string(),
  amount: z.number().int(),
  reason: z.string().min(3).max(255),
  effectiveAt: z.date(),
  sourceType: z.enum(['LETTER', 'MANUAL_UPDATE', 'SYSTEM'] as const),
  sourceId: z.string().optional(),
  letterId: z.string().optional(),
});

/**
 * Add a new manual amount increase to a ticket
 */
export async function addAmountIncrease(
  data: z.infer<typeof amountIncreaseSchema>,
) {
  try {
    const validatedData = amountIncreaseSchema.parse(data);

    // First check if the ticket exists
    const ticket = await db.ticket.findUnique({
      where: { id: validatedData.ticketId },
    });

    if (!ticket) {
      throw new Error(`Ticket with ID ${validatedData.ticketId} not found`);
    }

    // Create the amount increase
    const amountIncrease = await db.amountIncrease.create({
      data: {
        ticketId: validatedData.ticketId,
        amount: validatedData.amount,
        reason: validatedData.reason,
        effectiveAt: validatedData.effectiveAt,
        sourceType: validatedData.sourceType,
        sourceId: validatedData.sourceId,
        letterId: validatedData.letterId,
      },
    });

    // Update the ticket's status info
    await db.ticket.update({
      where: { id: validatedData.ticketId },
      data: {
        statusUpdatedAt: new Date(),
        statusUpdatedBy: 'USER',
      },
    });

    // Revalidate the ticket page to show updated data
    revalidatePath(`/tickets/${validatedData.ticketId}`);

    return { success: true, data: amountIncrease };
  } catch (error) {
    logger.error(
      'Error adding amount increase',
      {
        ticketId: data.ticketId,
        amount: data.amount,
        sourceType: data.sourceType,
      },
      error instanceof Error ? error : new Error(String(error)),
    );
    return {
      success: false,
      data: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get all amount increases for a ticket
 */
export async function getAmountIncreases(
  ticketId: string,
): Promise<
  | { success: true; data: (AmountIncrease & { letter: Letter | null })[] }
  | { success: false; error: string }
> {
  try {
    const amountIncreases = await db.amountIncrease.findMany({
      where: { ticketId },
      orderBy: { effectiveAt: 'desc' },
      include: {
        letter: true,
      },
    });

    return { success: true, data: amountIncreases };
  } catch (error) {
    logger.error(
      'Error getting amount increases',
      {
        ticketId,
      },
      error instanceof Error ? error : new Error(String(error)),
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Create an amount increase from a letter
 */
export async function createAmountIncreaseFromLetter(
  ticketId: string,
  letterId: string,
  amount: number,
  reason: string,
  effectiveAt: Date = new Date(),
) {
  try {
    const amountIncrease = await db.amountIncrease.create({
      data: {
        ticketId,
        amount,
        reason,
        effectiveAt,
        sourceType: AmountIncreaseSourceType.LETTER,
        sourceId: letterId,
        letterId,
      },
    });

    // Update the ticket's status info
    await db.ticket.update({
      where: { id: ticketId },
      data: {
        statusUpdatedAt: new Date(),
        statusUpdatedBy: 'LETTER_PARSER',
      },
    });

    // Revalidate the ticket page
    revalidatePath(`/tickets/${ticketId}`);

    return { success: true, data: amountIncrease };
  } catch (error) {
    logger.error(
      'Error creating amount increase from letter',
      {
        ticketId,
        letterId,
        amount,
      },
      error instanceof Error ? error : new Error(String(error)),
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get the most recent amount increase for a ticket that is already effective
 */
export async function getCurrentAmountIncrease(ticketId: string) {
  try {
    const now = new Date();

    const amountIncrease = await db.amountIncrease.findFirst({
      where: {
        ticketId,
        effectiveAt: { lte: now },
      },
      orderBy: { effectiveAt: 'desc' },
      include: {
        letter: true,
      },
    });

    return { success: true, data: amountIncrease };
  } catch (error) {
    logger.error(
      'Error getting current amount increase',
      {
        ticketId,
      },
      error instanceof Error ? error : new Error(String(error)),
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Delete an amount increase by ID
 */
export async function deleteAmountIncrease(
  amountIncreaseId: string,
  ticketId: string,
) {
  try {
    // Get the current amount increase before deletion
    const amountIncreaseToDelete = await db.amountIncrease.findUnique({
      where: { id: amountIncreaseId },
    });

    if (!amountIncreaseToDelete) {
      throw new Error(`Amount increase with ID ${amountIncreaseId} not found`);
    }

    // Delete the amount increase
    await db.amountIncrease.delete({
      where: { id: amountIncreaseId },
    });

    // Update the ticket's status info
    await db.ticket.update({
      where: { id: ticketId },
      data: {
        statusUpdatedAt: new Date(),
        statusUpdatedBy: 'USER',
      },
    });

    // Revalidate the ticket page
    revalidatePath(`/tickets/${ticketId}`);

    return { success: true };
  } catch (error) {
    logger.error(
      'Error deleting amount increase',
      {
        amountIncreaseId,
        ticketId,
      },
      error instanceof Error ? error : new Error(String(error)),
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
