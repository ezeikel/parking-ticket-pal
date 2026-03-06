'use server';

import { PredictionType, Ticket, db } from '@parking-ticket-pal/db';
import { createServerLogger } from '@/lib/logger';
import { runVerify, isIssuerSupported } from '@/utils/automation/workerClient';
import { findIssuer } from '@/constants/index';
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
 * Auto-verify a ticket by checking the issuer portal.
 * Only runs if the issuer supports automation.
 */
const autoVerifyTicket = async (ticket: Ticket) => {
  try {
    if (!ticket.issuer) return;

    const issuer = findIssuer(ticket.issuer);
    const issuerId =
      issuer?.id || ticket.issuer.toLowerCase().replace(/\s+/g, '-');

    const supported = await isIssuerSupported(issuerId);
    if (!supported) return;

    const fullTicket = await db.ticket.findUnique({
      where: { id: ticket.id },
      include: { vehicle: true },
    });
    if (!fullTicket?.vehicle) return;

    const result = await runVerify({
      issuerId,
      pcnNumber: fullTicket.pcnNumber,
      vehicleReg: fullTicket.vehicle.registrationNumber,
      ticketId: fullTicket.id,
    });

    if (result.success) {
      await db.ticket.update({
        where: { id: ticket.id },
        data: { verified: true },
      });
    }
  } catch (error) {
    log.error(
      `Auto-verify failed for ticket ${ticket.id}`,
      undefined,
      error instanceof Error ? error : undefined,
    );
  }
};

/**
 * Handles post-creation tasks for a new ticket (creates prediction, auto-verifies)
 */
export const afterTicketCreation = async (ticket: Ticket) => {
  await createTicketPrediction(ticket);

  if (!ticket.verified && ticket.issuer) {
    await autoVerifyTicket(ticket);
  }

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
