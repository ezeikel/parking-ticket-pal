/* eslint-disable import/prefer-default-export */

'use server';

import { put } from '@vercel/blob';
import OpenAI from 'openai';
import { MediaType, Ticket } from '@prisma/client';
import { Readable } from 'stream';
import prisma from '@/lib/prisma';
import { Resend } from 'resend';
import { auth } from '@/auth';
import { FileWithPreview } from '@/types';
import {
  BACKGROUND_INFORMATION_PROMPT,
  CREATE_TICKET_PROMPT,
} from '@/constants';
import { parseTicketInfo } from '@/utils/parseOpenAIResponse';
import generatePDF from '@/utils/generatePDF';
import streamToBuffer from '@/utils/streamToBuffer';
import formatPenniesToPounds from '@/utils/formatPenniesToPounds';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const resend = new Resend(process.env.RESEND_API_KEY);

export const createTicket = async (formData: FormData) => {
  const session = await auth();
  const userId = session?.userId;

  if (!userId) {
    console.error('You need to be logged in to create a ticket.');

    return null;
  }

  // create an easy to use object from the form data
  const rawFormData = {
    imageFront: (formData.get('imageFront') as FileWithPreview) || undefined,
  };

  if (!rawFormData.imageFront) {
    throw new Error('No image file provided.');
  }

  // get file extension
  const extension = rawFormData.imageFront.name.split('.').pop();

  // store ticket front and back image in blob storage
  const ticketFrontBlob = await put(
    `uploads/users/${userId}/ticket-front.${extension}`,
    // TODO: openai doesnt support .heic files, convert to .jpg
    rawFormData.imageFront,
    {
      access: 'public',
    },
  );

  // TODO: send ticket front and back image to openai to get ticket information in a JSON format
  const response = await openai.chat.completions.create({
    model: 'gpt-4-vision-preview',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: CREATE_TICKET_PROMPT,
          },
          {
            type: 'image_url',
            image_url: {
              url: ticketFrontBlob.url,
            },
          },
        ],
      },
    ],
  });

  // DEBUG:
  // eslint-disable-next-line no-console
  console.log('createTicket gpt-4-vision-preview response:', response);

  // DEBUG:
  // eslint-disable-next-line no-console
  console.log(
    'createTicket gpt-4-vision-preview message: ',
    JSON.stringify(response.choices[0].message, null, 2),
  );

  const ticketInfo = parseTicketInfo(
    response.choices[0].message.content as string,
  );

  // DEBUG:
  // eslint-disable-next-line no-console
  console.log('createTicket ticketInfo:', ticketInfo);

  const {
    pcnNumber,
    type,
    dateIssued,
    vehicleRegistration,
    dateOfContravention,
    contraventionCode,
    contraventionDescription,
    amountDue,
    issuer,
    issuerType,
  } = ticketInfo;

  // save ticket to database
  const ticket = await prisma.ticket.create({
    data: {
      pcnNumber,
      type,
      dateIssued: new Date(dateIssued),
      dateOfContravention: new Date(dateOfContravention),
      amountDue: Number(amountDue),
      issuer,
      issuerType,
      contravention: {
        // TODO: create or connect to existing contravention
        create: {
          code: contraventionCode.toString(), // TODO: parsing function converted it to a number
          description: contraventionDescription,
        },
      },
      vehicle: {
        // TODO: create or connect to existing vehicle
        create: {
          registration: vehicleRegistration,
          make: 'Toyota', // TODO: get ticket/dvla api based on registration
          model: 'Corolla', // TODO: get ticket/dvla api based on registration
          year: 2020, // TODO: get ticket/dvla api based on registration
          userId,
        },
      },
      media: {
        create: [
          {
            url: ticketFrontBlob.url,
            name: 'ticket-front',
            type: MediaType.IMAGE,
          },
        ],
      },
    },
  });

  return ticket;
};

export const getTickets = async (): Promise<
  | (Partial<Ticket> &
      {
        contravention: {
          code: string;
          description: string;
        };
      }[])
  | undefined
> => {
  const session = await auth();
  const userId = session?.userId;

  if (!userId) {
    console.error('You need to be logged in to get tickets.');

    return undefined;
  }

  const tickets = await prisma.ticket.findMany({
    where: {
      vehicle: {
        userId,
      },
    },
    select: {
      id: true,
      pcnNumber: true,
      type: true,
      description: true,
      amountDue: true,
      issuer: true,
      issuerType: true,
      contravention: {
        select: {
          code: true,
          description: true,
        },
      },
      dateOfContravention: true,
      dateIssued: true,
      status: true,
      vehicle: {
        select: {
          registration: true,
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

  return tickets;
};

export const getTicket = async (
  id: string,
): Promise<Partial<Ticket> | null> => {
  const session = await auth();
  const userId = session?.userId;

  if (!userId) {
    console.error('You need to be logged in to get a ticket.');

    return null;
  }

  const ticket = await prisma.ticket.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
      pcnNumber: true,
      type: true,
      description: true,
      amountDue: true,
      issuer: true,
      issuerType: true,
      contravention: {
        select: {
          code: true,
          description: true,
        },
      },
      dateOfContravention: true,
      dateIssued: true,
      status: true,
      vehicle: {
        select: {
          registration: true,
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

  return ticket;
};

export const generateChallengeLetter = async (ticketId: string) => {
  const session = await auth();
  const userId = session?.userId;

  if (!userId) {
    console.error('You need to be logged in to generate a challenge letter.');

    return null;
  }

  // get user information
  const user = await prisma.user.findUnique({
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
    console.error('User not found.');
    return null;
  }

  // get ticket
  const ticket = await prisma.ticket.findUnique({
    where: {
      id: ticketId,
    },
    select: {
      pcnNumber: true,
      type: true,
      description: true,
      amountDue: true,
      issuer: true,
      issuerType: true,
      contravention: {
        select: {
          code: true,
          description: true,
        },
      },
      dateOfContravention: true,
      dateIssued: true,
      status: true,
      vehicle: {
        select: {
          registration: true,
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
      model: 'gpt-4',
      messages: [
        {
          role: 'user',
          content: `${BACKGROUND_INFORMATION_PROMPT} Please generate a professional letter on behalf of ${user.name} living at address ${user.address} for the ticket ${ticket.pcnNumber} issued by ${ticket.issuer} for the contravention ${ticket.contravention.code} (${ticket.contravention?.description}) for vehicle ${ticket.vehicle?.registration}. The outstanding amount due is £${formatPenniesToPounds(ticket.amountDue)}. Think of a legal basis based on the contravention code that could work as a challenge and use this information to generate a challenge letter. Please note that the letter should be written in a professional manner and should be addressed to the issuer of the ticket. The letter should be written in a way that it can be sent as is - no placeholders or brackets should be included in the response, use the actual values of the name of the person you are writing the letter for and the ticket details`,
        },
      ],
    }),
    openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'user',
          content: `${BACKGROUND_INFORMATION_PROMPT} Please generate a professional email addressed to ${user.name} in reference to a letter that was generated to challenge ticket number ${ticket.pcnNumber} on their behalf which has been attached to this email as .pdf file. Explain to user to forward the letter on to the ${ticket.issuer} and that they can also edit the .pdf file if they wish to change or add any additional information. Sign off the email with "Kind regards, PCNs Support Team". Please give me the your response as the email content only in html format so that I can send it to the user.`,
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
  console.log(
    'generateChallengeLetter response:',
    JSON.stringify(generatedLetterFromOpenAI, null, 2),
  );

  // DEBUG:
  // eslint-disable-next-line no-console
  console.log(
    'generateEmail response:',
    JSON.stringify(generatedEmailFromOpenAI, null, 2),
  );

  // take the response and generate a PDF letter
  const pdfStream = await generatePDF(generatedLetterFromOpenAI);

  // convert PDF stream to buffer
  const pdfBuffer = await streamToBuffer(pdfStream as Readable);

  // take the pdf and email it to the user
  await resend.emails.send({
    from: 'PCNs AI <letters@pcns.ai>',
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

export const getCurrentUser = async () => {
  const session = await auth();
  const userId = session?.userId;

  if (!userId) {
    console.error('You need to be logged in to get the current user.');

    return null;
  }

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      name: true,
      email: true,
      address: true,
    },
  });

  return user;
};
