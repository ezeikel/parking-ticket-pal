'use server';

import { after } from 'next/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { del, put } from '@/lib/storage';
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
  ChallengeType,
  ChallengeStatus,
} from '@parking-ticket-pal/db';
import { Readable } from 'stream';
import { db } from '@parking-ticket-pal/db';
import getVehicleInfo from '@/utils/getVehicleInfo';
import {
  letterFormSchema,
  ChallengeEmailSchema,
  TicketForChallengeLetter,
  UserForChallengeLetter,
} from '@/types';
import { Address } from '@parking-ticket-pal/types';
import { getUserId } from '@/utils/user';
import openai from '@/lib/openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import {
  OPENAI_MODEL_GPT_4O,
  CONTRAVENTION_CODES,
  STORAGE_PATHS,
  CHALLENGE_EMAIL_PROMPT,
} from '@/constants';
import { generateChallengeEmailPrompt } from '@/utils/promptGenerators';
import resend from '@/lib/resend';
import generatePDF from '@/utils/generatePDF';
import streamToBuffer from '@/utils/streamToBuffer';
import generateChallengeContent from '@/utils/ai/generateChallengeContent';
import { createServerLogger } from '@/lib/logger';

const logger = createServerLogger({ action: 'letter' });

export const createLetter = async (
  values: z.infer<typeof letterFormSchema> & {
    tempImageUrl?: string;
    tempImagePath?: string;
    extractedText?: string;
  },
): Promise<Letter | null> => {
  const validatedData = letterFormSchema.parse(values) as z.infer<
    typeof letterFormSchema
  > & {
    tempImageUrl?: string;
    tempImagePath?: string;
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
      status: TicketStatus.ISSUED_DISCOUNT_PERIOD,
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

  let letter: Letter;

  // Schedule file move and media record creation after response
  after(async () => {
    if (letter && validatedData.tempImagePath && validatedData.tempImageUrl) {
      try {
        // Extract file extension from temp path
        const extension =
          validatedData.tempImagePath!.split('.').pop() || 'jpg';

        // Move file to permanent location with letter ID
        // New path: letters/{letterId}/image.{ext}
        const permanentPath = STORAGE_PATHS.LETTER_IMAGE
          .replace('%s', letter.id)
          .replace('%s', extension);

        // Download temp file and upload to permanent location
        const tempResponse = await fetch(validatedData.tempImageUrl!);
        if (!tempResponse.ok) {
          throw new Error(
            `Failed to fetch temp file: ${tempResponse.statusText}`,
          );
        }

        const tempBuffer = await tempResponse.arrayBuffer();

        const permanentBlob = await put(permanentPath, Buffer.from(tempBuffer), {
          contentType: `image/${extension === 'jpg' ? 'jpeg' : extension}`,
        });

        // Create media record with permanent URL
        await db.media.create({
          data: {
            ticketId: ticket.id,
            url: permanentBlob.url,
            type: MediaType.IMAGE,
            source: MediaSource.LETTER,
            description: 'Letter image',
          },
        });

        // Delete temporary file
        await del(validatedData.tempImageUrl!);

        logger.info('Successfully moved letter image', {
          letterId: letter.id,
          tempImagePath: validatedData.tempImagePath,
          permanentPath,
          ticketId: ticket.id
        });
      } catch (error) {
        logger.error('Failed to move letter image', {
          letterId: letter.id,
          tempImagePath: validatedData.tempImagePath,
          ticketId: ticket.id
        }, error instanceof Error ? error : new Error(String(error)));
        // Optionally, you could create a cleanup job to handle failed moves
        // or retry the operation
      }
    }
  });

  try {
    // Create letter first (without image)
    letter = await db.letter.create({
      data: {
        type: validatedData.type,
        ticketId: ticket.id,
        extractedText: validatedData.extractedText || '',
        summary: validatedData.summary,
        sentAt: validatedData.sentAt,
      },
    });

    return letter;
  } catch (error) {
    logger.error('Error creating letter', {
      pcnNumber: validatedData.pcnNumber,
      vehicleReg: validatedData.vehicleReg,
      userId
    }, error instanceof Error ? error : new Error(String(error)));
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
    logger.error('Error getting letter', {
      letterId
    }, error instanceof Error ? error : new Error(String(error)));
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
    logger.error('Error getting letters by PCN', {
      pcnNumber
    }, error instanceof Error ? error : new Error(String(error)));
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
    let { ticketId } = existingLetter;
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
    logger.error('Error updating letter', {
      letterId,
      pcnNumber: data.pcnNumber
    }, error instanceof Error ? error : new Error(String(error)));
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
    logger.error('Error deleting letter', {
      letterId
    }, error instanceof Error ? error : new Error(String(error)));
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Internal function to generate challenge letter by ticket ID
 * Used by both generateChallengeLetterByPcn and the server action
 */
const generateChallengeLetterByTicketId = async (
  ticketId: string,
  challengeReason: string,
  additionalDetails: string | undefined,
  userId: string,
) => {

  // get user information
  const user = await db.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      name: true,
      address: true,
      email: true,
      phoneNumber: true,
      signatureUrl: true,
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
      id: true,
      pcnNumber: true,
      type: true,
      initialAmount: true,
      issuer: true,
      issuerType: true,
      contraventionCode: true,
      contraventionAt: true,
      issuedAt: true,
      status: true,
      location: true,
      vehicle: {
        select: {
          registrationNumber: true,
          userId: true,
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
    logger.error('Ticket not found for challenge letter generation', {
      ticketId,
      userId
    });
    return null;
  }

  // Verify ticket belongs to the authenticated user
  if (ticket.vehicle.userId !== userId) {
    logger.error('Ticket does not belong to authenticated user', {
      ticketId,
      userId,
      ticketOwnerId: ticket.vehicle.userId,
    });
    return null;
  }

  // create challenge record
  const challenge = await db.challenge.create({
    data: {
      ticketId,
      type: ChallengeType.LETTER,
      reason: challengeReason,
      customReason: additionalDetails,
      status: 'SUCCESS',
      submittedAt: new Date(),
    },
  });

  try {
    // transform ticket data to match TicketForChallengeLetter type
    const ticketForChallenge: TicketForChallengeLetter = {
      ...ticket,
      location: ticket.location as Address,
    };

    // transform user data to match UserForChallengeLetter type
    const userForChallenge: UserForChallengeLetter = {
      ...user,
      address: user.address as Address,
    };

    // generate challenge letter using shared utility
    const letterData = await generateChallengeContent({
      pcnNumber: ticket.pcnNumber,
      challengeReason,
      additionalDetails,
      contentType: 'letter',
      ticket: ticketForChallenge,
      user: userForChallenge,
      contraventionCodes: CONTRAVENTION_CODES,
    });

    if (!letterData) {
      throw new Error('Failed to generate challenge letter content.');
    }

    // generate email using structured output
    const emailResponse = await openai.chat.completions.create({
      model: OPENAI_MODEL_GPT_4O,
      messages: [
        {
          role: 'system',
          content: CHALLENGE_EMAIL_PROMPT,
        },
        {
          role: 'user',
          content: generateChallengeEmailPrompt(
            user.name ?? '', // we might not have a name if the user is signed in with Facebook/Apple/Resend
            ticket.pcnNumber,
            ticket.issuer,
          ),
        },
      ],
      response_format: zodResponseFormat(ChallengeEmailSchema, 'email'),
    });

    // parse the email response
    const emailData = ChallengeEmailSchema.parse(
      JSON.parse(emailResponse.choices[0].message.content as string),
    );

    // process signature data if available
    let signaturePaths: string[] = [];
    let signatureViewBox = { x: 0, y: 0, width: 300, height: 150 };

    if (user.signatureUrl) {
      try {
        const { downloadSvgFile, extractSvgPathsAndViewBox } = await import(
          '@/utils/extractSignaturePaths'
        );
        const svgContent = await downloadSvgFile(user.signatureUrl);

        if (svgContent) {
          const extracted = extractSvgPathsAndViewBox(svgContent);
          signaturePaths = extracted.paths;
          signatureViewBox = extracted.viewBox;
        }
      } catch (error) {
        logger.error('Error processing signature for challenge letter', {
          ticketId,
          userId,
          signatureUrl: user.signatureUrl
        }, error instanceof Error ? error : new Error(String(error)));
      }
    }

    // add signature data to letter data if available
    const letterDataWithSignature = {
      ...letterData,
      signatureUrl: user.signatureUrl,
      signaturePaths,
      signatureViewBox,
    };

    // generate PDF from the structured letter data
    const pdfStream = await generatePDF(letterDataWithSignature);

    // convert PDF stream to buffer
    const pdfBuffer = await streamToBuffer(pdfStream as Readable);

    // save PDF to R2 storage
    // New path: letters/{letterId}/challenge.pdf
    const pdfPath = STORAGE_PATHS.CHALLENGE_LETTER_PDF.replace('%s', challenge.id);

    const pdfBlob = await put(pdfPath, pdfBuffer, {
      contentType: 'application/pdf',
    });

    // TODO: make this step optional in UI
    // send email with challenge letter as a PDF attachment
    await resend.emails.send({
      from: `Parking Ticket Pal <${process.env.DEFAULT_FROM_EMAIL}>`,
      to: user.email,
      subject: emailData.subject,
      html: emailData.htmlContent,
      attachments: [
        {
          filename: `challenge-letter-${ticket.pcnNumber}.pdf`,
          content: pdfBuffer,
        },
      ],
    });

    // update challenge record with success
    await db.challenge.update({
      where: { id: challenge.id },
      data: {
        status: ChallengeStatus.SUCCESS,
        metadata: {
          emailSent: true,
          pdfGenerated: true,
          pdfUrl: pdfBlob.url,
        },
      },
    });

    return {
      success: true,
      message: 'Challenge letter generated and sent to users email.',
      challengeId: challenge.id,
    };
  } catch (error) {
    // update challenge record with error
    await db.challenge.update({
      where: { id: challenge.id },
      data: {
        status: 'ERROR',
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      },
    });

    logger.error('Error generating challenge letter', {
      ticketId,
      challengeId: challenge.id,
      userId,
      challengeReason
    }, error instanceof Error ? error : new Error(String(error)));
    return {
      success: false,
      message: 'Failed to generate challenge letter.',
    };
  }
};

/**
 * Internal function to generate challenge letter by PCN number
 * Shared between server actions and API routes
 */
export const generateChallengeLetterByPcn = async (
  pcnNumber: string,
  challengeReason: string,
  userId: string,
  additionalDetails?: string,
) => {
  // First, get the ticket by PCN number
  const ticketLookup = await db.ticket.findUnique({
    where: { pcnNumber },
    select: {
      id: true,
      vehicle: {
        select: {
          userId: true,
        },
      },
    },
  });

  if (!ticketLookup) {
    logger.error('Ticket not found for challenge letter generation', {
      pcnNumber,
      userId
    });
    return null;
  }

  // Verify ownership
  if (ticketLookup.vehicle.userId !== userId) {
    logger.error('Ticket does not belong to authenticated user', {
      pcnNumber,
      userId,
      ticketOwnerId: ticketLookup.vehicle.userId,
    });
    return null;
  }

  // Use the existing generateChallengeLetter with ticketId
  return generateChallengeLetterByTicketId(ticketLookup.id, challengeReason, additionalDetails, userId);
};

/**
 * Server action to generate a challenge letter (for use in forms)
 */
export const generateChallengeLetter = async (
  ticketId: string,
  challengeReason: string,
  additionalDetails?: string,
) => {
  const userId = await getUserId('generate a challenge letter');

  if (!userId) {
    return null;
  }

  return generateChallengeLetterByTicketId(ticketId, challengeReason, additionalDetails, userId);
};
