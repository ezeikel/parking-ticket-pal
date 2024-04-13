/* eslint-disable import/prefer-default-export */

'use server';

import { headers } from 'next/headers';
import { del, put } from '@vercel/blob';
import OpenAI from 'openai';
import { MediaType, Ticket } from '@prisma/client';
import { Readable } from 'stream';
import prisma from '@/lib/prisma';
import { Resend } from 'resend';
import Stripe from 'stripe';
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
import { revalidatePath } from 'next/cache';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const resend = new Resend(process.env.RESEND_API_KEY);

const stripe = new Stripe(process.env.STRIPE_SECRET!, {
  apiVersion: '2024-04-10',
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

  const extension = rawFormData.imageFront.name.split('.').pop();
  const image = rawFormData.imageFront;

  // store ticket front and back image in blob storage
  const ticketFrontBlob = await put(
    `uploads/users/${userId}/ticket-front.${extension}`,
    image,
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
        connectOrCreate: {
          where: {
            code: contraventionCode.toString(), // TODO: parsing function converted it to a number
          },
          create: {
            code: contraventionCode.toString(), // TODO: parsing function converted it to a number
            description: contraventionDescription,
          },
        },
      },
      vehicle: {
        connectOrCreate: {
          where: {
            registration: vehicleRegistration,
          },
          create: {
            registration: vehicleRegistration,
            make: 'Toyota', // TODO: get ticket/dvla api based on registration
            model: 'Corolla', // TODO: get ticket/dvla api based on registration
            year: 2020, // TODO: get ticket/dvla api based on registration
            userId,
          },
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

  revalidatePath('/dashboard');

  return ticket;
};

export const deleteTicket = async (id: string) => {
  const session = await auth();
  const userId = session?.userId;

  if (!userId) {
    console.error('You need to be logged in to delete a ticket.');

    return null;
  }

  const ticket = await prisma.ticket.findUnique({
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

  const ticketMedia = await prisma.media.findMany({
    where: {
      ticketId: id,
    },
  });

  // delete ticket and media files from blob storage
  const [deletedTicket] = await Promise.all([
    prisma.ticket.delete({
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
    from: 'PCNs <letters@pcns.ai>',
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

export const getSubscription = async () => {
  const session = await auth();
  const userId = session?.userId;

  if (!userId) {
    console.error('You need to be logged in to get the subscription.');

    return null;
  }

  const subscription = await prisma.subscription.findFirst({
    where: {
      user: {
        id: userId,
      },
    },
  });

  return subscription;
};

export const createCheckoutSession = async (): Promise<{
  id: string;
} | null> => {
  const headersList = headers();
  const origin = headersList.get('origin');
  const session = await auth();
  const userId = session?.userId;

  if (!userId) {
    console.error('You need to be logged in to create a checkout session.');

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

  // TODO: findUnique instead of findFirst
  const subscription = await prisma.subscription.findFirst({
    where: {
      user: {
        id: userId,
      },
    },
  });

  const stripeSession = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        // TODO: handle PRO_MONTHLY and PRO_ANNUAL
        price:
          process.env.NODE_ENV === 'production'
            ? 'price_1P5D6e02fXLfPj3Bfj2207PZ'
            : 'price_1P528Y02fXLfPj3BAu29W2YC',
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: `${origin}/billing/success`,
    cancel_url: `${origin}/billing`,
    client_reference_id: userId,

    // send stripe customer id if user already exists in stripe
    customer: subscription?.stripeCustomerId ?? undefined,
    customer_email: subscription ? undefined : user.email,
  });

  return {
    id: stripeSession.id,
  };
};

export const createCustomerPortalSession = async () => {
  const headersList = headers();
  const origin = headersList.get('origin');

  const session = await auth();
  const userId = session?.userId;

  if (!userId) {
    console.error(
      'You need to be logged in to create a customer portal session.',
    );

    return null;
  }

  const subscription = await prisma.subscription.findFirst({
    where: {
      user: {
        id: userId,
      },
    },
  });

  if (!subscription?.stripeCustomerId) {
    console.error('No subscription found for this user.');
    return null;
  }

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: subscription.stripeCustomerId,
    return_url: `${origin}/billing`,
  });

  return {
    url: portalSession.url,
  };
};

export const revalidateDashboard = async () => revalidatePath('/dashboard');
