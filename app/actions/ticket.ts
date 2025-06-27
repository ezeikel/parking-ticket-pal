'use server';

import { del, put } from '@vercel/blob';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
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
} from '@prisma/client';
import getVehicleInfo from '@/utils/getVehicleInfo';
import { ticketFormSchema } from '@/types';
import { db } from '@/lib/prisma';
import { verify, challenge } from '@/utils/automation';
import {
  CHALLENGE_WRITER_PROMPT,
  CHATGPT_MODEL,
  COUNCIL_CHALLENGE_REASONS,
  STORAGE_PATHS,
} from '@/constants';
import { openai } from '@/lib/openai';
import { getUserId } from './user';
import { refresh } from '../actions';

export const createTicket = async (
  values: z.infer<typeof ticketFormSchema> & {
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

  // TODO: after() fires but doesnt move the file or create the media record
  // TODO: tempImageUrl is undefined
  // schedule file move and media record creation after response
  after(async () => {
    console.log('after');
    console.log(ticket, values.tempImagePath, values.tempImageUrl);

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

        console.log(
          `Successfully moved image for ticket ${ticket.id} from ${values.tempImagePath} to ${permanentPath}`,
        );
      } catch (error) {
        console.error(`Failed to move image for ticket ${ticket.id}:`, error);
        // TODO: optionally create a cleanup job to handle failed moves
        // or retry the operation
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
        status: TicketStatus.REDUCED_PAYMENT_DUE,
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

    return ticket;
  } catch (error) {
    console.error('Stack trace:', (error as Error).stack);
    return null;
  }
};

export const updateTicket = async (
  id: string,
  values: z.infer<typeof ticketFormSchema>,
) => {
  const userId = await getUserId('update a ticket');

  if (!userId) {
    return null;
  }

  let vehicleInfo;

  if (values.vehicleReg) {
    vehicleInfo = await getVehicleInfo(values.vehicleReg);
  }

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

    return ticket;
  } catch (error) {
    console.error('Stack trace:', (error as Error).stack);
    return null;
  }
};

export const deleteTicket = async (id: string) => {
  const userId = await getUserId('delete a ticket');

  if (!userId) {
    return null;
  }

  const ticket = await db.ticket.findUnique({
    where: {
      id,
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
    console.error('Ticket not found.');
    return null;
  }

  if (ticket.vehicle.userId !== userId) {
    console.error('You are not authorized to delete this ticket.');
    return null;
  }

  const ticketMedia = await db.media.findMany({
    where: {
      ticketId: id,
    },
  });

  // delete ticket and media files from blob storage
  const [deletedTicket] = await Promise.all([
    db.ticket.delete({
      where: {
        id,
      },
    }),
    ticketMedia.map(async (media) => {
      await del(media.url);
    }),
  ]);

  revalidatePath('/dashboard');

  return deletedTicket;
};

export const getTickets = async () => {
  const userId = await getUserId('get tickets');

  if (!userId) {
    return null;
  }

  const tickets = await db.ticket.findMany({
    where: {
      vehicle: {
        userId,
      },
    },
    include: {
      vehicle: true,
      media: {
        select: {
          url: true,
        },
      },
      prediction: true,
    },
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
    include: {
      vehicle: {
        select: {
          registrationNumber: true,
        },
      },
      media: {
        select: {
          url: true,
        },
      },
      prediction: true,
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
    console.error('Error checking ticket:', error);
    return false;
  }
};

export const challengeTicket = async (pcnNumber: string) => {
  try {
    const result = await challenge(
      pcnNumber,
      COUNCIL_CHALLENGE_REASONS.CONTRAVENTION_DID_NOT_OCCUR.id,
    );

    return result;
  } catch (error) {
    console.error('Error challenging ticket:', error);
    return false;
  }
};

// TODO: i think this was for original letter generation, not sure if it's needed
export const generateChallengeDetails = async ({
  pcnNumber,
  formFieldPlaceholderText,
  reason,
  userEvidenceImageUrls,
  issuerEvidenceImageUrls,
}: {
  pcnNumber: string;
  formFieldPlaceholderText: string;
  reason: string;
  userEvidenceImageUrls: string[];
  issuerEvidenceImageUrls: string[];
}) => {
  const messages = [
    {
      role: 'system' as const,
      content: CHALLENGE_WRITER_PROMPT,
    },
    {
      role: 'user' as const,
      content: [
        {
          type: 'text' as const,
          text: `Analyze these images and write a challenge for PCN ${pcnNumber}.
          
          Reason for challenge: ${reason}
          
          The response should fit this form field hint: "${formFieldPlaceholderText}"`,
        },
        ...issuerEvidenceImageUrls.map((url) => ({
          type: 'image_url' as const,
          image_url: { url },
        })),
        ...userEvidenceImageUrls.map((url) => ({
          type: 'image_url' as const,
          image_url: { url },
        })),
      ],
    },
  ];

  try {
    const completion = await openai.chat.completions.create({
      model: CHATGPT_MODEL,
      messages,
      temperature: 0.7,
      max_tokens: 1000,
    });

    return completion.choices[0].message.content;
  } catch (error) {
    console.error('Error generating challenge details:', error);
    return null;
  }
};

export const refreshTicket = async (id: string) => refresh(`/tickets/${id}`);

export const refreshTickets = async () => refresh('/dashboard');
