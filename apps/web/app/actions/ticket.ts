'use server';

import { del, put } from '@vercel/blob';
import { revalidatePath } from 'next/cache';
import { after } from 'next/server';
import {
  IssuerType,
  MediaSource,
  MediaType,
  TicketStatus,
  TicketType,
  VerificationType,
  VerificationStatus,
  Prisma,
  Ticket,
  ChallengeStatus,
} from '@parking-ticket-pal/db';
import getVehicleInfo from '@/utils/getVehicleInfo';
import type { TicketFormData } from '@parking-ticket-pal/types';
import { db } from '@parking-ticket-pal/db';
import { verify, challenge } from '@/utils/automation';
import { generateReminders } from '@/app/actions/reminder';
import { STORAGE_PATHS } from '@/constants';
import { track } from '@/utils/analytics-server';
import { TRACKING_EVENTS } from '@/constants/events';
import { getUserId } from '@/utils/user';
import { createServerLogger } from '@/lib/logger';
import { refresh } from '@/app/actions';
import {
  afterTicketCreation,
  afterTicketUpdate,
} from '@/services/ticket-service';

const logger = createServerLogger({ action: 'ticket' });

export const createTicket = async (
  values: TicketFormData & {
    tempImageUrl?: string;
    tempImagePath?: string;
    extractedText?: string;
  },
) => {
  const userId = await getUserId('create a ticket');

  if (!userId) {
    return null;
  }

  const vehicleInfo = await getVehicleInfo(values.vehicleReg);

  const vehicleVerified = vehicleInfo.verification.status === 'VERIFIED';

  let ticket: Ticket;

  // schedule file move, media record creation, and reminder generation after response
  after(async () => {
    if (ticket && values.tempImagePath && values.tempImageUrl) {
      try {
        // extract file extension from temp path
        const extension = values.tempImagePath!.split('.').pop() || 'jpg';

        // move file to permanent location
        const permanentPath = STORAGE_PATHS.TICKET_IMAGE.replace('%s', userId)
          .replace('%s', ticket.id)
          .replace('%s', extension);

        // download temp file and upload to permanent location
        const tempResponse = await fetch(values.tempImageUrl!);
        if (!tempResponse.ok) {
          throw new Error(
            `Failed to fetch temp file: ${tempResponse.statusText}`,
          );
        }

        const tempBuffer = await tempResponse.arrayBuffer();

        const permanentBlob = await put(permanentPath, tempBuffer, {
          access: 'public',
          contentType: `image/${extension === 'jpg' ? 'jpeg' : extension}`,
        });

        // create media record with permanent URL
        await db.media.create({
          data: {
            ticketId: ticket.id,
            url: permanentBlob.url,
            type: MediaType.IMAGE,
            source: MediaSource.TICKET,
            description: 'Ticket image',
          },
        });

        // delete temporary file
        await del(values.tempImageUrl!);
      } catch (error) {
        logger.error('Failed to move image for ticket', {
          ticketId: ticket.id,
          tempImagePath: values.tempImageUrl
        }, error instanceof Error ? error : new Error(String(error)));
        // TODO: optionally create a cleanup job to handle failed moves
        // or retry the operation
      }
    }

    // generate reminders for the new ticket
    if (ticket) {
      try {
        await generateReminders({
          id: ticket.id,
          issuedAt: ticket.issuedAt,
          userId,
        });
      } catch (error) {
        logger.error('Error regenerating reminders after ticket update', {
          ticketId: ticket.id
        }, error instanceof Error ? error : new Error(String(error)));
      }
    }
  });

  try {
    // create ticket without image URL initially
    ticket = await db.ticket.create({
      data: {
        pcnNumber: values.pcnNumber,
        contraventionCode: values.contraventionCode,
        location: values.location,
        issuedAt: values.issuedAt,
        contraventionAt: values.issuedAt,
        status: TicketStatus.ISSUED_DISCOUNT_PERIOD,
        type: TicketType.PENALTY_CHARGE_NOTICE, // TODO: hardcoded for now
        initialAmount: values.initialAmount,
        issuer: values.issuer,
        issuerType: IssuerType.COUNCIL, // TODO: hardcoded for now
        extractedText: values.extractedText || '',
        vehicle: {
          connectOrCreate: {
            where: {
              registrationNumber: values.vehicleReg,
            },
            create: {
              registrationNumber: values.vehicleReg,
              make: vehicleInfo.make,
              model: vehicleInfo.model,
              year: vehicleInfo.year,
              bodyType: vehicleInfo.bodyType,
              fuelType: vehicleInfo.fuelType,
              color: vehicleInfo.color,
              user: {
                connect: {
                  id: userId,
                },
              },
              verification: vehicleVerified
                ? {
                    create: {
                      type: VerificationType.VEHICLE,
                      status: VerificationStatus.VERIFIED,
                      verifiedAt: new Date(),
                      metadata:
                        (vehicleInfo.verification
                          .metadata as Prisma.JsonValue) || undefined,
                    },
                  }
                : undefined,
            },
          },
        },
      },
    });

    await track(TRACKING_EVENTS.TICKET_CREATED, {
      ticketId: ticket.id,
      pcnNumber: ticket.pcnNumber,
      issuer: ticket.issuer,
      issuerType: ticket.issuerType,
      prefilled: !!ticket.extractedText,
    });

    // handle post-creation tasks e.g create prediction
    await afterTicketCreation(ticket);

    return ticket;
  } catch (error) {
    logger.error('Error creating ticket', {
      pcnNumber: values.pcnNumber,
      vehicleReg: values.vehicleReg,
      userId
    }, error instanceof Error ? error : new Error(String(error)));
    return null;
  }
};

export const updateTicket = async (
  id: string,
  values: TicketFormData,
) => {
  const userId = await getUserId('update a ticket');

  if (!userId) {
    return null;
  }

  let vehicleInfo;

  if (values.vehicleReg) {
    vehicleInfo = await getVehicleInfo(values.vehicleReg);
  }

  // get the current ticket to check if issuedAt is being updated
  const currentTicket = await db.ticket.findUnique({
    where: { id },
    select: { issuedAt: true },
  });

  const issuedAtChanged =
    currentTicket &&
    currentTicket.issuedAt.getTime() !== values.issuedAt.getTime();

  // DEBUG:
  logger.debug('Checking if issuedAt changed', {
    issuedAtChanged,
    ticketId: id
  });

  // schedule reminder regeneration after response if issuedAt changed
  after(async () => {
    if (issuedAtChanged) {
      try {
        // delete existing reminders
        await db.reminder.deleteMany({
          where: { ticketId: id },
        });

        // generate new reminders with updated issuedAt
        await generateReminders({
          id,
          issuedAt: values.issuedAt,
          userId,
        });
      } catch (error) {
        logger.error('Error regenerating reminders after ticket update', {
          ticketId: id
        }, error instanceof Error ? error : new Error(String(error)));
      }
    }
  });

  try {
    const ticket = await db.ticket.update({
      where: {
        id,
      },
      data: {
        pcnNumber: values.pcnNumber,
        contraventionCode: values.contraventionCode,
        location: values.location,
        issuedAt: values.issuedAt,
        contraventionAt: values.issuedAt,
        initialAmount: values.initialAmount,
        issuer: values.issuer,
        vehicle: {
          connectOrCreate: {
            where: {
              registrationNumber: values.vehicleReg,
            },
            create: {
              registrationNumber: values.vehicleReg,
              make: vehicleInfo?.make || '',
              model: vehicleInfo?.model || '',
              year: vehicleInfo?.year || 0,
              bodyType: vehicleInfo?.bodyType || '',
              fuelType: vehicleInfo?.fuelType || '',
              color: vehicleInfo?.color || '',
              userId,
              verification: vehicleInfo?.verification
                ? {
                    create: {
                      type: VerificationType.VEHICLE,
                      status: VerificationStatus.VERIFIED,
                      verifiedAt: new Date(),
                      metadata:
                        (vehicleInfo.verification
                          .metadata as Prisma.JsonValue) || undefined,
                    },
                  }
                : undefined,
            },
          },
        },
      },
    });

    // update prediction if relevant fields changed
    const relevantFieldsUpdated = !!(values.contraventionCode || values.issuer);

    if (relevantFieldsUpdated) {
      await afterTicketUpdate(id);
    }

    return ticket;
  } catch (error) {
    logger.error('Error creating ticket', {
      pcnNumber: values.pcnNumber,
      vehicleReg: values.vehicleReg,
      userId
    }, error instanceof Error ? error : new Error(String(error)));
    return null;
  }
};

export const updateTicketNotes = async (
  _prevState: any,
  formData: FormData,
) => {
  const ticketId = formData.get('ticketId') as string;
  const notes = formData.get('notes') as string;

  if (!ticketId) {
    return { success: false, error: 'Ticket ID is missing.' };
  }

  try {
    await db.ticket.update({
      where: { id: ticketId },
      data: { notes },
    });

    revalidatePath(`/tickets/${ticketId}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: 'Failed to save notes.' };
  }
};

/**
 * Internal function to delete a ticket by ID
 * Shared between server actions and API routes
 */
export const deleteTicketById = async (
  ticketId: string,
  userId: string,
): Promise<{ success: boolean; error?: string; data?: any }> => {
  if (!ticketId) {
    return { success: false, error: 'Ticket ID is required' };
  }

  const ticket = await db.ticket.findUnique({
    where: {
      id: ticketId,
    },
    select: {
      vehicle: {
        select: {
          userId: true,
        },
      },
    },
  });

  if (!ticket) {
    return { success: false, error: 'Ticket not found' };
  }

  if (ticket.vehicle.userId !== userId) {
    return {
      success: false,
      error: 'You are not authorized to delete this ticket',
    };
  }

  const ticketMedia = await db.media.findMany({
    where: {
      ticketId,
    },
  });

  try {
    // delete ticket and media files from blob storage
    const [deletedTicket] = await Promise.all([
      db.ticket.delete({
        where: {
          id: ticketId,
        },
      }),
      ...ticketMedia.map(async (media) => {
        await del(media.url);
      }),
    ]);

    return { success: true, data: deletedTicket };
  } catch (error) {
    logger.error('Error deleting ticket', {
      ticketId,
      userId
    }, error instanceof Error ? error : new Error(String(error)));
    return { success: false, error: 'Failed to delete ticket' };
  }
};

/**
 * Server action to delete a ticket (for use in forms)
 */
export const deleteTicket = async (
  _prevState: { success: boolean; error?: string; data?: any } | null,
  formData: FormData,
) => {
  const userId = await getUserId('delete a ticket');

  if (!userId) {
    return { success: false, error: 'Unauthorized' };
  }

  const id = formData.get('ticketId') as string;

  const result = await deleteTicketById(id, userId);

  if (result.success) {
    revalidatePath('/dashboard');
  }

  return result;
};

export const getTickets = async (params?: {
  search?: string;
  status?: TicketStatus[];
  issuer?: string[];
  issuerType?: IssuerType[];
  ticketType?: TicketType[];
  dateFrom?: string;
  dateTo?: string;
  amountMin?: number;
  amountMax?: number;
  verified?: boolean;
  sortBy?: 'issuedAt' | 'initialAmount' | 'createdAt' | 'status' | 'issuer';
  sortOrder?: 'asc' | 'desc';
}) => {
  const userId = await getUserId('get tickets');

  if (!userId) {
    return null;
  }

  // Build the where clause dynamically
  const where: Prisma.TicketWhereInput = {
    vehicle: {
      userId,
    },
  };

  // Add search filter
  if (params?.search) {
    // Convert search to lowercase for case-insensitive JSON field matching
    const searchLower = params.search.toLowerCase();
    const searchUpper = params.search.toUpperCase();

    where.OR = [
      { pcnNumber: { contains: params.search, mode: 'insensitive' } },
      { issuer: { contains: params.search, mode: 'insensitive' } },
      { vehicle: { registrationNumber: { contains: params.search, mode: 'insensitive' } } },
      // Search in location JSON - try both lowercase and original case
      { location: { path: ['line1'], string_contains: params.search } },
      { location: { path: ['line1'], string_contains: searchLower } },
      { location: { path: ['line1'], string_contains: searchUpper } },
      { location: { path: ['line2'], string_contains: params.search } },
      { location: { path: ['line2'], string_contains: searchLower } },
      { location: { path: ['line2'], string_contains: searchUpper } },
      { location: { path: ['city'], string_contains: params.search } },
      { location: { path: ['city'], string_contains: searchLower } },
      { location: { path: ['city'], string_contains: searchUpper } },
      { location: { path: ['county'], string_contains: params.search } },
      { location: { path: ['county'], string_contains: searchLower } },
      { location: { path: ['county'], string_contains: searchUpper } },
      { location: { path: ['postcode'], string_contains: params.search } },
      { location: { path: ['postcode'], string_contains: searchLower } },
      { location: { path: ['postcode'], string_contains: searchUpper } },
    ];
  }

  // Add status filter
  if (params?.status && params.status.length > 0) {
    where.status = { in: params.status };
  }

  // Add issuer filter (by name)
  if (params?.issuer && params.issuer.length > 0) {
    where.issuer = { in: params.issuer };
  }

  // Add issuerType filter
  if (params?.issuerType && params.issuerType.length > 0) {
    where.issuerType = { in: params.issuerType };
  }

  // Add ticketType filter
  if (params?.ticketType && params.ticketType.length > 0) {
    where.type = { in: params.ticketType };
  }

  // Add date range filter
  if (params?.dateFrom || params?.dateTo) {
    where.issuedAt = {};
    if (params.dateFrom) {
      where.issuedAt.gte = new Date(params.dateFrom);
    }
    if (params.dateTo) {
      where.issuedAt.lte = new Date(params.dateTo);
    }
  }

  // Add amount range filter
  if (params?.amountMin !== undefined || params?.amountMax !== undefined) {
    where.initialAmount = {};
    if (params.amountMin !== undefined) {
      where.initialAmount.gte = params.amountMin;
    }
    if (params.amountMax !== undefined) {
      where.initialAmount.lte = params.amountMax;
    }
  }

  // Add verified filter
  if (params?.verified !== undefined) {
    where.verified = params.verified;
  }

  // Build orderBy clause
  let orderBy: Prisma.TicketOrderByWithRelationInput = { issuedAt: 'desc' };

  if (params?.sortBy) {
    const sortOrder = params.sortOrder || 'asc';
    switch (params.sortBy) {
      case 'issuedAt':
        orderBy = { issuedAt: sortOrder };
        break;
      case 'initialAmount':
        orderBy = { initialAmount: sortOrder };
        break;
      case 'createdAt':
        orderBy = { createdAt: sortOrder };
        break;
      case 'status':
        orderBy = { status: sortOrder };
        break;
      case 'issuer':
        orderBy = { issuer: sortOrder };
        break;
    }
  }

  const tickets = await db.ticket.findMany({
    where,
    include: {
      vehicle: true,
      media: {
        select: {
          url: true,
        },
      },
      prediction: true,
    },
    orderBy,
  });

  return tickets;
};

export const getTicket = async (id: string) => {
  const userId = await getUserId('get a ticket');

  if (!userId) {
    return null;
  }

  const ticket = await db.ticket.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
      pcnNumber: true,
      contraventionCode: true,
      location: true,
      issuedAt: true,
      contraventionAt: true,
      initialAmount: true,
      issuer: true,
      issuerType: true,
      status: true,
      type: true,
      extractedText: true,
      tier: true,
      notes: true,
      vehicle: {
        select: {
          id: true,
          registrationNumber: true,
          user: {
            select: {
              id: true,
              signatureUrl: true,
            },
          },
        },
      },
      media: {
        select: {
          id: true,
          url: true,
          source: true,
          description: true,
          evidenceType: true,
        },
      },
      prediction: true,
      letters: {
        select: {
          id: true,
          media: true,
          sentAt: true,
          type: true,
          summary: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      },
      forms: {
        select: {
          id: true,
          createdAt: true,
          formType: true,
        },
      },
      challenges: {
        select: {
          id: true,
          type: true,
          reason: true,
          status: true,
          createdAt: true,
          submittedAt: true,
        },
      },
      reminders: true,
    },
  });

  if (!ticket) return null;

  return ticket;
};

export const verifyTicket = async (pcnNumber: string) => {
  try {
    const result = await verify(pcnNumber);
    return result;
  } catch (error) {
    logger.error('Error checking ticket', {
      pcnNumber
    }, error instanceof Error ? error : new Error(String(error)));
    return false;
  }
};

export const challengeTicket = async (
  pcnNumber: string,
  challengeReason: string,
  additionalDetails?: string,
) => {
  let ticket: any = null;
  try {
    // Get the ticket first
    ticket = await db.ticket.findUnique({
      where: { pcnNumber },
    });

    if (!ticket) {
      throw new Error('Ticket not found');
    }

    // Create challenge record first
    const challengeRecord = await db.challenge.create({
      data: {
        ticketId: ticket.id,
        type: 'AUTO_CHALLENGE',
        reason: challengeReason,
        customReason: additionalDetails || null,
        status: 'PENDING',
        submittedAt: new Date(),
      },
    });

    try {
      // Attempt the actual challenge
      const result = await challenge(
        pcnNumber,
        challengeReason,
        additionalDetails,
      );

      if (result && typeof result === 'object' && result.success) {
        // update challenge record with success and store the generated text
        const metadata: any = {
          challengeSubmitted: true,
          submittedAt: new Date().toISOString(),
        };

        if (result.challengeText) {
          metadata.challengeText = result.challengeText;
        }

        await db.challenge.update({
          where: { id: challengeRecord.id },
          data: {
            status: ChallengeStatus.SUCCESS,
            metadata,
          },
        });

        return {
          success: true,
          message: 'Challenge submitted successfully.',
          challengeId: challengeRecord.id,
        };
      }

      throw new Error('Challenge submission failed');
    } catch (error) {
      // Update challenge record with error
      await db.challenge.update({
        where: { id: challengeRecord.id },
        data: {
          status: 'ERROR',
          metadata: {
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        },
      });

      throw error;
    }
  } catch (error) {
    logger.error('Error challenging ticket', {
      ticketId: ticket?.id,
      pcnNumber,
      challengeReason
    }, error instanceof Error ? error : new Error(String(error)));
    return {
      success: false,
      message:
        error instanceof Error ? error.message : 'Failed to submit challenge',
    };
  }
};

export const getTicketChallenges = async (ticketId: string) => {
  const userId = await getUserId('get ticket challenges');

  if (!userId) {
    return null;
  }

  // Verify the ticket belongs to the user
  const ticket = await db.ticket.findUnique({
    where: { id: ticketId },
    select: {
      id: true,
      vehicle: {
        select: {
          userId: true,
        },
      },
    },
  });

  if (!ticket || ticket.vehicle.userId !== userId) {
    return null;
  }

  // Get challenges for the ticket
  const challenges = await db.challenge.findMany({
    where: { ticketId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      type: true,
      reason: true,
      customReason: true,
      status: true,
      metadata: true,
      submittedAt: true,
      createdAt: true,
      updatedAt: true,
      // letter: {
      //   select: {
      //     id: true,
      //     type: true,
      //     summary: true,
      //     sentAt: true,
      //   },
      // },
    },
  });

  return challenges;
};

export const refreshTicket = async (id: string) => refresh(`/tickets/${id}`);

export const refreshTickets = async () => refresh('/dashboard');
