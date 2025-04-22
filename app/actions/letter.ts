'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import {
  MediaSource,
  MediaType,
  Prisma,
  VerificationStatus,
  VerificationType,
  TicketStatus,
  TicketType,
  IssuerType,
  Letter,
} from '@prisma/client';
import { Readable } from 'stream';
import { db } from '@/lib/prisma';
import getVehicleInfo from '@/utils/getVehicleInfo';
import { letterFormSchema } from '@/types';
import { getUserId } from '@/app/actions/user';
import { openai } from '@/lib/openai';
import {
  BACKGROUND_INFORMATION_PROMPT,
  CHATGPT_MODEL,
  CONTRAVENTION_CODES,
} from '@/constants';
import { resend } from '@/lib/resend';
import generatePDF from '@/utils/generatePDF';
import streamToBuffer from '@/utils/streamToBuffer';
import formatPenniesToPounds from '@/utils/formatPenniesToPounds';

export const createLetter = async (
  values: z.infer<typeof letterFormSchema> & {
    imageUrl?: string;
    extractedText?: string;
  },
): Promise<Letter | null> => {
  const validatedData = letterFormSchema.parse(values) as z.infer<
    typeof letterFormSchema
  > & {
    imageUrl?: string;
    extractedText?: string;
  };

  const userId = await getUserId('create a letter');

  if (!userId) {
    return null;
  }

  // Get vehicle information
  const vehicleInfo = await getVehicleInfo(validatedData.vehicleReg);

  // Find or create the ticket associated with this PCN number
  const ticket = await db.ticket.upsert({
    where: {
      pcnNumber: validatedData.pcnNumber,
    },
    create: {
      pcnNumber: validatedData.pcnNumber,
      contraventionCode: 'UNKNOWN', // Default value since we don't have this info
      location: {
        line1: 'Unknown',
        city: 'Unknown',
        postcode: 'Unknown',
        country: 'United Kingdom',
        coordinates: {
          latitude: 0,
          longitude: 0,
        },
      },
      issuedAt: new Date(),
      contraventionAt: new Date(),
      status: TicketStatus.REDUCED_PAYMENT_DUE,
      type: TicketType.PENALTY_CHARGE_NOTICE,
      initialAmount: 0, // Default value since we don't have this info
      issuer: 'Unknown', // Default value since we don't have this info
      issuerType: IssuerType.COUNCIL,
      extractedText: '',
      vehicle: {
        connectOrCreate: {
          where: {
            registrationNumber: validatedData.vehicleReg,
          },
          create: {
            registrationNumber: validatedData.vehicleReg,
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
            verification:
              vehicleInfo.verification.status === 'VERIFIED'
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
    update: {},
  });

  try {
    const letter = await db.letter.create({
      data: {
        type: validatedData.type,
        ticketId: ticket.id,
        extractedText: validatedData.extractedText || '',
        summary: validatedData.summary,
        sentAt: validatedData.sentAt,
        media: validatedData.imageUrl
          ? {
              create: {
                url: validatedData.imageUrl,
                type: MediaType.IMAGE,
                source: MediaSource.LETTER,
                description: 'Letter image',
              },
            }
          : undefined,
      },
    });

    return letter;
  } catch (error) {
    console.error('Stack trace:', (error as Error).stack);
    return null;
  }
};

/**
 * Get a letter by ID
 */
export const getLetter = async (letterId: string) => {
  try {
    const letter = await db.letter.findUnique({
      where: { id: letterId },
      include: {
        media: true,
        amountIncrease: true,
        ticket: true,
      },
    });

    if (!letter) {
      throw new Error(`Letter with ID ${letterId} not found`);
    }

    return { success: true, data: letter };
  } catch (error) {
    console.error('Error getting letter:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Get all letters for a ticket by PCN number
 */
export const getLettersByPcnNumber = async (pcnNumber: string) => {
  try {
    // First get the ticket
    const ticket = await db.ticket.findUnique({
      where: { pcnNumber },
    });

    if (!ticket) {
      throw new Error(`Ticket with PCN number ${pcnNumber} not found`);
    }

    const letters = await db.letter.findMany({
      where: { ticketId: ticket.id },
      orderBy: { createdAt: 'desc' },
      include: {
        media: true,
        amountIncrease: true,
      },
    });

    return { success: true, data: letters };
  } catch (error) {
    console.error('Error getting letters:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

export const updateLetter = async (
  letterId: string,
  data: Partial<z.infer<typeof letterFormSchema>>,
) => {
  try {
    const validatedData = letterFormSchema.partial().parse(data);

    // First check if the letter exists
    const existingLetter = await db.letter.findUnique({
      where: { id: letterId },
      include: { ticket: true },
    });

    if (!existingLetter) {
      throw new Error(`Letter with ID ${letterId} not found`);
    }

    // If pcnNumber is being updated, verify the new ticket exists
    let ticketId = existingLetter.ticketId;
    if (validatedData.pcnNumber) {
      const newTicket = await db.ticket.findUnique({
        where: { pcnNumber: validatedData.pcnNumber },
      });

      if (!newTicket) {
        throw new Error(
          `Ticket with PCN number ${validatedData.pcnNumber} not found`,
        );
      }
      ticketId = newTicket.id;
    }

    // Update the letter
    const letter = await db.letter.update({
      where: { id: letterId },
      data: {
        ...validatedData,
        ticketId,
      },
    });

    // Revalidate the ticket page
    revalidatePath(`/tickets/${letter.ticketId}`);

    return { success: true, data: letter };
  } catch (error) {
    console.error('Error updating letter:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Delete a letter
 */
export const deleteLetter = async (letterId: string) => {
  try {
    // First check if the letter exists and get its ticket ID
    const letter = await db.letter.findUnique({
      where: { id: letterId },
      include: { ticket: true },
    });

    if (!letter) {
      throw new Error(`Letter with ID ${letterId} not found`);
    }

    // Delete the letter
    await db.letter.delete({
      where: { id: letterId },
    });

    // Revalidate the ticket page
    revalidatePath(`/tickets/${letter.ticket.id}`);

    return { success: true };
  } catch (error) {
    console.error('Error deleting letter:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

export const generateChallengeLetter = async (ticketId: string) => {
  const userId = await getUserId('generate a challenge letter');

  if (!userId) {
    return null;
  }

  // get user information
  const user = await db.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      name: true,
      address: true,
      email: true,
    },
  });

  if (!user) {
    return null;
  }

  // get ticket
  const ticket = await db.ticket.findUnique({
    where: {
      id: ticketId,
    },
    select: {
      pcnNumber: true,
      type: true,
      initialAmount: true,
      issuer: true,
      issuerType: true,
      contraventionCode: true,
      contraventionAt: true,
      issuedAt: true,
      status: true,
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
      createdAt: true,
    },
  });

  if (!ticket) {
    console.error('Ticket not found.');
    return null;
  }

  // use OpenAI to generate a challenge letter and email based on the detailed ticket information
  const [createLetterResponse, createEmailResponse] = await Promise.all([
    openai.chat.completions.create({
      model: CHATGPT_MODEL,
      messages: [
        {
          role: 'user',
          content: `${BACKGROUND_INFORMATION_PROMPT} Please generate a professional letter on behalf of ${user.name} living at address ${user.address} for the ticket ${ticket.pcnNumber} issued by ${ticket.issuer} for the contravention ${ticket.contraventionCode} ${
            CONTRAVENTION_CODES[
              ticket.contraventionCode as keyof typeof CONTRAVENTION_CODES
            ]?.description
              ? `(${CONTRAVENTION_CODES[ticket.contraventionCode as keyof typeof CONTRAVENTION_CODES].description})`
              : ''
          } for vehicle ${ticket.vehicle?.registrationNumber}. The outstanding amount due is £${formatPenniesToPounds(ticket.initialAmount)}. Think of a legal basis based on the contravention code that could work as a challenge and use this information to generate a challenge letter. Please note that the letter should be written in a professional manner and should be addressed to the issuer of the ticket. The letter should be written in a way that it can be sent as is - no placeholders or brackets should be included in the response, use the actual values of the name of the person you are writing the letter for and the ticket details`,
        },
      ],
    }),
    openai.chat.completions.create({
      model: CHATGPT_MODEL,
      messages: [
        {
          role: 'user',
          content: `${BACKGROUND_INFORMATION_PROMPT} Please generate a professional email addressed to ${user.name} in reference to a letter that was generated to challenge ticket number ${ticket.pcnNumber} on their behalf which has been attached to this email as .pdf file. Explain to user to forward the letter on to the ${ticket.issuer} and that they can also edit the .pdf file if they wish to change or add any additional information. Sign off the email with "Kind regards, Parking Ticket Pal Support Team". Please give me the your response as the email content only in html format so that I can send it to the user.`,
        },
      ],
    }),
  ]);

  const generatedLetterFromOpenAI = createLetterResponse.choices[0].message
    .content as string;

  const generatedEmailFromOpenAI = createEmailResponse.choices[0].message
    .content as string;

  // DEBUG:
  // eslint-disable-next-line no-console
  console.log('generateChallengeLetter response:', generatedLetterFromOpenAI);

  // DEBUG:
  // eslint-disable-next-line no-console
  console.log('generateEmail response:', generatedEmailFromOpenAI);

  // take the response and generate a PDF letter
  const pdfStream = await generatePDF(generatedLetterFromOpenAI);

  // convert PDF stream to buffer
  const pdfBuffer = await streamToBuffer(pdfStream as Readable);

  // take the pdf and email it to the user
  await resend.emails.send({
    from: 'Parking Ticket Pal <letters@parkingticketpal.com>',
    to: user.email,
    subject: `Re: Ticket Challenge Letter for Your Reference - Ticket No:${ticket.pcnNumber}`,
    html: generatedEmailFromOpenAI,
    attachments: [
      {
        filename: `challenge-letter-${ticket.pcnNumber}.pdf`,
        content: pdfBuffer,
      },
    ],
  });

  return {
    message: 'Challenge letter generated and sent to users email.',
  };
};
