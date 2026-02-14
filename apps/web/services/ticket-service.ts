'use server';

import { PredictionType, Ticket, db } from '@parking-ticket-pal/db';
import { createServerLogger } from '@/lib/logger';
import { calculatePrediction } from './prediction-service';

const log = createServerLogger({ action: 'ticket-service' });

/**
 * Updates or creates a prediction for a ticket using historical tribunal data
 */
const updateTicketPrediction = async (ticketId: string) => {
  try {
    // Fetch ticket data for prediction calculation
    const ticket = await db.ticket.findUnique({
      where: { id: ticketId },
      select: {
        contraventionCode: true,
        issuer: true,
      },
    });

    if (!ticket) {
      log.error(`Ticket ${ticketId} not found for prediction update`);
      return;
    }

    // Calculate prediction based on historical data
    const prediction = await calculatePrediction({
      contraventionCode: ticket.contraventionCode,
      issuer: ticket.issuer,
    });

    await db.prediction.upsert({
      where: { ticketId },
      update: {
        percentage: prediction.percentage,
        numberOfCases: prediction.numberOfCases,
        confidence: prediction.confidence,
        metadata: prediction.metadata,
        lastUpdated: new Date(),
      },
      create: {
        ticketId,
        type: PredictionType.CHALLENGE_SUCCESS,
        percentage: prediction.percentage,
        numberOfCases: prediction.numberOfCases,
        confidence: prediction.confidence,
        metadata: prediction.metadata,
        lastUpdated: new Date(),
      },
    });
  } catch (error) {
    log.error(
      `Failed to update prediction for ticket ${ticketId}`,
      undefined,
      error instanceof Error ? error : undefined,
    );
    // Don't throw - prediction updates shouldn't break ticket operations
  }
};

/**
 * Creates an initial prediction for a new ticket using historical tribunal data
 */
const createTicketPrediction = async (ticket: Ticket) => {
  try {
    // Calculate prediction based on historical data
    const prediction = await calculatePrediction({
      contraventionCode: ticket.contraventionCode,
      issuer: ticket.issuer,
    });

    await db.prediction.create({
      data: {
        ticketId: ticket.id,
        type: PredictionType.CHALLENGE_SUCCESS,
        percentage: prediction.percentage,
        numberOfCases: prediction.numberOfCases,
        confidence: prediction.confidence,
        metadata: prediction.metadata,
        lastUpdated: new Date(),
      },
    });
  } catch (error) {
    log.error(
      `Failed to create prediction for ticket ${ticket.id}`,
      undefined,
      error instanceof Error ? error : undefined,
    );
    // Don't throw - prediction creation shouldn't break ticket creation
  }
};

/**
 * Handles post-creation tasks for a new ticket (creates prediction)
 */
export const afterTicketCreation = async (ticket: Ticket) => {
  await createTicketPrediction(ticket);
  return ticket;
};

/**
 * Handles post-update tasks for a ticket (updates prediction if needed)
 */
export const afterTicketUpdate = async (ticketId: string) => {
  const ticket = await db.ticket.findUnique({
    where: { id: ticketId },
    select: {
      id: true,
      contraventionCode: true,
      issuer: true,
      issuerType: true,
    },
  });

  if (!ticket) {
    throw new Error('Ticket not found');
  }

  await updateTicketPrediction(ticketId);
};
