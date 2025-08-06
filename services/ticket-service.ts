'use server';

import { PredictionType, Ticket } from '@prisma/client';
import { db } from '@/lib/prisma';

/**
 * Updates or creates a prediction for a ticket
 */
const updateTicketPrediction = async (ticketId: string) => {
  try {
    // TODO: Implement ML-based prediction using historical appeals data
    // For now, just update the lastUpdated timestamp
    await db.prediction.upsert({
      where: { ticketId },
      update: {
        lastUpdated: new Date(),
        // In the future, we'll update percentage, numberOfCases, confidence, and metadata here
        // We can fetch ticket data here when needed: const ticket = await db.ticket.findUnique({...})
      },
      create: {
        ticketId,
        type: PredictionType.CHALLENGE_SUCCESS,
        lastUpdated: new Date(),
        // Default values - in future these would be calculated
        percentage: 50,
        numberOfCases: 0,
        confidence: 0.8,
      },
    });
  } catch (error) {
    console.error(`Failed to update prediction for ticket ${ticketId}:`, error);
    // Don't throw - prediction updates shouldn't break ticket operations
  }
};

/**
 * Creates an initial prediction for a new ticket
 */
const createTicketPrediction = async (ticketId: string, ticket: Ticket) => {
  try {
    // TODO: Implement ML-based prediction using historical appeals data
    await db.prediction.create({
      data: {
        ticketId,
        type: PredictionType.CHALLENGE_SUCCESS,
        // Default values - in future these would be calculated based on:
        // ticket.contraventionCode, ticket.issuer, historical data, etc.
        percentage: 50,
        numberOfCases: 0,
        confidence: 0.8,
      },
    });
  } catch (error) {
    console.error(`Failed to create prediction for ticket ${ticketId}:`, error);
    // Don't throw - prediction creation shouldn't break ticket creation
  }
};

/**
 * Handles post-creation tasks for a new ticket (creates prediction)
 */
export const afterTicketCreation = async (ticket: Ticket) => {
  await createTicketPrediction(ticket.id, ticket);
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
