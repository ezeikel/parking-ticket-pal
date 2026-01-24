'use server';

import { db, TicketTier, TicketType, IssuerType, TicketStatus } from '@parking-ticket-pal/db';
import { getUserId, getCurrentUser } from '@/utils/user';
import { createServerLogger } from '@/lib/logger';
import createUTCDate from '@/utils/createUTCDate';
import getVehicleInfo from '@/utils/getVehicleInfo';

const logger = createServerLogger({ action: 'guest' });

// Types for pending tickets
export type PendingTicketData = {
  id: string;
  pcnNumber: string;
  vehicleReg: string;
  tier: TicketTier;
  createdAt: Date;
};

/**
 * Get unclaimed pending tickets for the current user (by email)
 */
export const getPendingTickets = async (): Promise<PendingTicketData[]> => {
  const user = await getCurrentUser();

  if (!user?.email) {
    return [];
  }

  try {
    const pendingTickets = await db.pendingTicket.findMany({
      where: {
        email: user.email,
        claimed: false,
      },
      select: {
        id: true,
        pcnNumber: true,
        vehicleReg: true,
        tier: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return pendingTickets;
  } catch (error) {
    logger.error(
      'Failed to fetch pending tickets',
      { email: user.email },
      error instanceof Error ? error : new Error(String(error)),
    );
    return [];
  }
};

/**
 * Get a specific pending ticket by ID (for claim flow)
 */
export const getPendingTicketById = async (
  pendingTicketId: string,
): Promise<{
  id: string;
  pcnNumber: string;
  vehicleReg: string;
  issuerType: string;
  ticketStage: string;
  tier: TicketTier;
  challengeReason: string | null;
  tempImagePath: string | null;
  initialAmount: number | null;
  issuer: string | null;
} | null> => {
  const user = await getCurrentUser();

  if (!user?.email) {
    return null;
  }

  try {
    const pendingTicket = await db.pendingTicket.findFirst({
      where: {
        id: pendingTicketId,
        email: user.email,
        claimed: false,
      },
    });

    if (!pendingTicket) {
      return null;
    }

    return {
      id: pendingTicket.id,
      pcnNumber: pendingTicket.pcnNumber,
      vehicleReg: pendingTicket.vehicleReg,
      issuerType: pendingTicket.issuerType,
      ticketStage: pendingTicket.ticketStage,
      tier: pendingTicket.tier,
      challengeReason: pendingTicket.challengeReason,
      tempImagePath: pendingTicket.tempImagePath,
      initialAmount: pendingTicket.initialAmount,
      issuer: pendingTicket.issuer,
    };
  } catch (error) {
    logger.error(
      'Failed to fetch pending ticket',
      { pendingTicketId, email: user.email },
      error instanceof Error ? error : new Error(String(error)),
    );
    return null;
  }
};

/**
 * Claim a pending ticket - creates the actual ticket and marks pending as claimed
 * Uses DVLA/Motorway lookup to auto-fill vehicle details from registration
 */
export const claimPendingTicket = async (
  pendingTicketId: string,
): Promise<{ success: boolean; ticketId?: string; error?: string }> => {
  const userId = await getUserId('claim pending ticket');
  const user = await getCurrentUser();

  if (!userId || !user?.email) {
    return { success: false, error: 'You must be logged in to claim a ticket' };
  }

  try {
    // Get the pending ticket
    const pendingTicket = await db.pendingTicket.findFirst({
      where: {
        id: pendingTicketId,
        email: user.email,
        claimed: false,
      },
    });

    if (!pendingTicket) {
      return { success: false, error: 'Pending ticket not found or already claimed' };
    }

    // Lookup vehicle info from registration number
    const vehicleInfo = await getVehicleInfo(pendingTicket.vehicleReg);

    // Create the ticket using existing logic
    const result = await createTicketFromGuestData({
      pcnNumber: pendingTicket.pcnNumber,
      vehicleReg: pendingTicket.vehicleReg,
      issuerType: pendingTicket.issuerType as 'council' | 'private' | null,
      ticketStage: pendingTicket.ticketStage as 'initial' | 'nto' | 'rejection' | 'charge_cert' | null,
      tier: pendingTicket.tier === 'PREMIUM' ? 'premium' : pendingTicket.tier === 'STANDARD' ? 'standard' : null,
      tempImagePath: pendingTicket.tempImagePath || undefined,
      initialAmount: pendingTicket.initialAmount || undefined,
      issuer: pendingTicket.issuer || undefined,
      vehicleMake: vehicleInfo.make,
      vehicleModel: vehicleInfo.model,
      vehicleYear: vehicleInfo.year,
      vehicleColor: vehicleInfo.color,
      vehicleBodyType: vehicleInfo.bodyType,
      vehicleFuelType: vehicleInfo.fuelType,
    });

    if (!result.success) {
      return result;
    }

    // Mark pending ticket as claimed
    await db.pendingTicket.update({
      where: { id: pendingTicketId },
      data: {
        claimed: true,
        claimedAt: new Date(),
        claimedByUserId: userId,
      },
    });

    logger.info('Claimed pending ticket', {
      pendingTicketId,
      ticketId: result.ticketId,
      userId,
    });

    return result;
  } catch (error) {
    logger.error(
      'Failed to claim pending ticket',
      { pendingTicketId, userId },
      error instanceof Error ? error : new Error(String(error)),
    );
    return { success: false, error: 'Failed to claim ticket' };
  }
};

type CreateTicketFromGuestDataInput = {
  // Ticket data from wizard
  pcnNumber: string;
  vehicleReg: string;
  issuerType: 'council' | 'private' | null;
  ticketStage: 'initial' | 'nto' | 'rejection' | 'charge_cert' | null;
  // Tier is null for track flow (free ticket)
  tier: 'standard' | 'premium' | null;
  tempImagePath?: string;
  initialAmount?: number;
  issuer?: string;
  // Vehicle data - can be provided or auto-looked up
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: number;
  vehicleColor?: string;
  vehicleBodyType?: string;
  vehicleFuelType?: string;
  // If true, will auto-lookup vehicle info from registration
  autoLookupVehicle?: boolean;
};

export const createTicketFromGuestData = async (
  input: CreateTicketFromGuestDataInput,
): Promise<{ success: boolean; ticketId?: string; error?: string }> => {
  const userId = await getUserId('create ticket from guest data');

  if (!userId) {
    return { success: false, error: 'You must be logged in to create a ticket' };
  }

  try {
    // Get vehicle info - either from input or auto-lookup
    let vehicleData = {
      make: input.vehicleMake || 'Unknown',
      model: input.vehicleModel || 'Unknown',
      year: input.vehicleYear || 0,
      color: input.vehicleColor || 'Unknown',
      bodyType: input.vehicleBodyType || 'Unknown',
      fuelType: input.vehicleFuelType || 'Unknown',
    };

    // If auto-lookup is requested or no vehicle data provided, lookup from registration
    if (input.autoLookupVehicle || (!input.vehicleMake && !input.vehicleModel)) {
      const vehicleInfo = await getVehicleInfo(input.vehicleReg);
      vehicleData = {
        make: vehicleInfo.make,
        model: vehicleInfo.model,
        year: vehicleInfo.year,
        color: vehicleInfo.color,
        bodyType: vehicleInfo.bodyType,
        fuelType: vehicleInfo.fuelType,
      };
    }

    // First, create or find the vehicle
    let vehicle = await db.vehicle.findFirst({
      where: {
        userId,
        registrationNumber: input.vehicleReg.toUpperCase().replace(/\s/g, ''),
      },
    });

    if (!vehicle) {
      // Create new vehicle
      vehicle = await db.vehicle.create({
        data: {
          userId,
          registrationNumber: input.vehicleReg.toUpperCase().replace(/\s/g, ''),
          make: vehicleData.make,
          model: vehicleData.model,
          year: vehicleData.year,
          color: vehicleData.color,
          bodyType: vehicleData.bodyType,
          fuelType: vehicleData.fuelType,
        },
      });
    }

    // Map wizard issuerType to database IssuerType
    const issuerType: IssuerType =
      input.issuerType === 'council' ? 'COUNCIL' : 'PRIVATE_COMPANY';

    // Map wizard ticketStage to database TicketStatus
    const getInitialStatus = (): TicketStatus => {
      switch (input.ticketStage) {
        case 'initial':
          return 'ISSUED_DISCOUNT_PERIOD';
        case 'nto':
          return 'NOTICE_TO_OWNER';
        case 'rejection':
          return 'NOTICE_OF_REJECTION';
        case 'charge_cert':
          return 'CHARGE_CERTIFICATE';
        default:
          return 'ISSUED_DISCOUNT_PERIOD';
      }
    };

    // Determine ticket type based on issuer type
    const ticketType: TicketType =
      issuerType === 'PRIVATE_COMPANY'
        ? 'PARKING_CHARGE_NOTICE'
        : 'PENALTY_CHARGE_NOTICE';

    // Map tier to TicketTier
    // null tier (track flow) creates a FREE ticket
    const ticketTier: TicketTier =
      input.tier === 'premium'
        ? 'PREMIUM'
        : input.tier === 'standard'
          ? 'STANDARD'
          : 'FREE';

    // Create the ticket
    const ticket = await db.ticket.create({
      data: {
        pcnNumber: input.pcnNumber,
        vehicleId: vehicle.id,
        contraventionCode: 'UNKNOWN', // Will be updated when user provides more details
        location: {
          line1: 'Location to be confirmed',
          city: '',
          postcode: '',
          country: 'United Kingdom',
          coordinates: { latitude: 0, longitude: 0 },
        },
        extractedText: '',
        issuedAt: createUTCDate(new Date()),
        contraventionAt: createUTCDate(new Date()),
        status: getInitialStatus(),
        type: ticketType,
        initialAmount: input.initialAmount || 0,
        issuer: input.issuer || 'Unknown Issuer',
        issuerType,
        tier: ticketTier,
      },
    });

    logger.info('Created ticket from guest data', {
      ticketId: ticket.id,
      userId,
      pcnNumber: input.pcnNumber,
    });

    return { success: true, ticketId: ticket.id };
  } catch (error) {
    logger.error(
      'Failed to create ticket from guest data',
      { userId, pcnNumber: input.pcnNumber },
      error instanceof Error ? error : new Error(String(error)),
    );

    // Check for unique constraint violation (duplicate PCN)
    if (
      error instanceof Error &&
      error.message.includes('Unique constraint failed')
    ) {
      return {
        success: false,
        error: 'A ticket with this PCN number already exists',
      };
    }

    return { success: false, error: 'Failed to create ticket' };
  }
};
