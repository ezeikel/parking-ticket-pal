/* eslint-disable import/prefer-default-export */

'use server';

import { put } from '@vercel/blob';
import OpenAI from 'openai';
import prisma from '@/lib/prisma';
import { auth } from '@/auth';
import { FileWithPreview } from '@/types';
import { MediaType, Ticket } from '@prisma/client';
import { CREATE_TICKET_PROMPT, TICKET_STATUS, TICKET_TYPE } from '@/constants';
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

  // convert ticket information into a detailed prompt for generating a challenge letter
  const ticketDetails = `I wish to challenge the PCN ticket numbered ${ticket.pcnNumber} issued on ${ticket.dateIssued} for vehicle registration ${ticket.vehicle?.registration}. The ticket describes a ${ticket.type} violation for contravention code ${ticket.contravention.code} (${ticket.contravention?.description}) with an amount due of ${ticket.amountDue}. It was issued by ${ticket.issuer} (${TICKET_TYPE[ticket.issuerType as keyof typeof TICKET_TYPE]}), and the status of the ticket is ${TICKET_STATUS[ticket.status[0] as keyof typeof TICKET_STATUS]}. Think of a legal basis based on the contravention code that could work as a challenge and use this information to generate a challenge letter.`;

  // use OpenAI to generate a challenge letter based on the detailed ticket information
  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'user',
        content: `Imagine you are a paralegal working for ${user.name} of address ${user.address}. Please generate a formal challenge letter based on the following ticket details as if you were ${user.name} so that they can attach it to an email and send to ${ticket.issuer}: ${ticketDetails}`,
      },
    ],
  });

  // DEBUG:
  // eslint-disable-next-line no-console
  console.log(
    'generateChallengeLetter response:',
    JSON.stringify(response.choices[0].message, null, 2),
  );

  // TODO: take the response and use a library like `react-pdf` to generate a PDF

  // TODO: take the pdf and email it to the user using react-email and resend

  return response; // Adjust according to how you wish to use the response
};
