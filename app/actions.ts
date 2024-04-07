/* eslint-disable import/prefer-default-export */

'use server';

import { put } from '@vercel/blob';
import OpenAI from 'openai';
import prisma from '@/lib/prisma';
import { auth } from '@/auth';
import { FileWithPreview } from '@/types';
import { MediaType, Ticket } from '@prisma/client';
import { CREATE_TICKET_PROMPT } from '@/constants';
import { parseTicketInfo } from '@/utils/parseOpenAIResponse';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

export const getTickets = async (): Promise<Partial<Ticket>[] | undefined> => {
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
