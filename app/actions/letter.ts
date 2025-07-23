'use server';

import { after } from 'next/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { del, put } from '@vercel/blob';
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
} from '@prisma/client';
import { Readable } from 'stream';
import { db } from '@/lib/prisma';
import getVehicleInfo from '@/utils/getVehicleInfo';
import {
  letterFormSchema,
  ChallengeEmailSchema,
  TicketForChallengeLetter,
  UserForChallengeLetter,
  Address,
} from '@/types';
import { getUserId } from '@/utils/user';
import openai from '@/lib/openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import {
  CHATGPT_MODEL,
  CONTRAVENTION_CODES,
  STORAGE_PATHS,
  CHALLENGE_EMAIL_PROMPT,
} from '@/constants';
import { generateChallengeEmailPrompt } from '@/utils/promptGenerators';
import resend from '@/lib/resend';
import generatePDF from '@/utils/generatePDF';
import streamToBuffer from '@/utils/streamToBuffer';
import generateChallengeContent from '@/utils/ai/generateChallengeContent';

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
        const permanentPath = STORAGE_PATHS.LETTER_IMAGE.replace('%s', userId)
          .replace('%s', ticket.id)
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

        const permanentBlob = await put(permanentPath, tempBuffer, {
          access: 'public',
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

        console.log(
          `Successfully moved image for letter ${letter.id} from ${validatedData.tempImagePath} to ${permanentPath}`,
        );
      } catch (error) {
        console.error(`Failed to move image for letter ${letter.id}:`, error);
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

export const generateChallengeLetter = async (
  ticketId: string,
  challengeReason: string,
  additionalDetails?: string,
) => {
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
      model: CHATGPT_MODEL,
      messages: [
        {
          role: 'system',
          content: CHALLENGE_EMAIL_PROMPT,
        },
        {
          role: 'user',
          content: generateChallengeEmailPrompt(
            user.name,
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
        console.error('Error processing signature:', error);
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

    // save PDF to blob storage
    const pdfPath = STORAGE_PATHS.CHALLENGE_LETTER_PDF.replace('%s', userId)
      .replace('%s', ticket.id)
      .replace('%s', challenge.id);

    const pdfBlob = await put(pdfPath, pdfBuffer, {
      access: 'public',
      contentType: 'application/pdf',
    });

    // TODO: make this step optional in UI
    // send email with challenge letter as a PDF attachment
    await resend.emails.send({
      from: 'Parking Ticket Pal <letters@parkingticketpal.com>',
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

    console.error('Error generating challenge letter:', error);
    return {
      success: false,
      message: 'Failed to generate challenge letter.',
    };
  }
};
