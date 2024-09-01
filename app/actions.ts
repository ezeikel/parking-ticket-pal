'use server';

import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { del, put } from '@vercel/blob';
import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import {
  MediaType,
  // SubscriptionType,
  Ticket,
} from '@prisma/client';
import { Readable } from 'stream';
import { Resend } from 'resend';
import Stripe from 'stripe';
import prisma from '@/lib/prisma';
import { auth } from '@/auth';
import { ProductType, TicketSchema } from '@/types';
import { BACKGROUND_INFORMATION_PROMPT } from '@/constants';
import generatePDF from '@/utils/generatePDF';
import streamToBuffer from '@/utils/streamToBuffer';
import formatPenniesToPounds from '@/utils/formatPenniesToPounds';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const resend = new Resend(process.env.RESEND_API_KEY);

const stripe = new Stripe(process.env.STRIPE_SECRET!, {
  apiVersion: '2024-04-10',
});

const getUserId = async (action?: string) => {
  const session = await auth();
  const headersList = headers();
  const userId = session?.userId || headersList.get('x-user-id');

  if (!userId) {
    console.error(
      `You need to be logged in to ${action || 'perform this action'}. `,
    );

    return null;
  }

  return userId;
};

const toISODateString = (inputDate: string | Date): string => {
  if (inputDate instanceof Date) {
    return inputDate.toISOString();
  }

  // create a new variable to hold the date string
  let datestring = inputDate;

  // check if the string already has a time component using a regex
  const hasTime = /\d{2}:\d{2}:\d{2}/.test(datestring);

  // if no time is included, append midnight UTC ('T00:00:00Z')
  if (!hasTime) {
    console.warn('No time provided. Defaulting to midnight UTC.');
    datestring += 'T00:00:00Z';
  }

  const parsedDate = new Date(datestring);

  // check for an invalid date
  if (Number.isNaN(parsedDate.getTime())) {
    console.error(`Invalid date: ${datestring}`);
    throw new Error(`Invalid date: ${datestring}`);
  }

  return parsedDate.toISOString();
};

export const createTicket = async (input: FormData | string) => {
  const userId = await getUserId('create a ticket');

  if (!userId) {
    return null;
  }

  let base64Image: string;
  let blobStorageUrl: string;

  if (input instanceof FormData) {
    const imageFront = input.get('imageFront') as File | null;
    if (!imageFront) {
      throw new Error('No image file provided.');
    }

    // Convert the image file to a base64 string
    base64Image = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      // eslint-disable-next-line prefer-promise-reject-errors
      reader.onerror = () => reject('Failed to convert image to base64.');
      reader.readAsDataURL(imageFront);
    });

    // If base64Image starts with "data:", strip the prefix
    base64Image = base64Image.replace(/^data:image\/[a-z]+;base64,/, '');

    // Store the image in Vercel Blob storage
    const extension = imageFront.name.split('.').pop();
    const ticketFrontBlob = await put(
      `uploads/users/${userId}/ticket-front.${extension}`,
      imageFront,
      {
        access: 'public',
      },
    );

    // Use the Blob storage URL for further processing
    blobStorageUrl = ticketFrontBlob.url;
  } else if (typeof input === 'string') {
    base64Image = input; // Directly use the provided base64 string

    // Optionally, you could also upload the base64 string as a Blob here
    const buffer = Buffer.from(base64Image, 'base64');
    const ticketFrontBlob = await put(
      `uploads/users/${userId}/ticket-front-from-base64.png`,
      buffer,
      {
        access: 'public',
        contentType: 'image/png', // adjust content type as needed
      },
    );

    blobStorageUrl = ticketFrontBlob.url;
  } else {
    throw new Error('Invalid input type. Must be FormData or base64 string.');
  }

  // Send the image URL to OpenAI for analysis
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-2024-08-06',
    messages: [
      {
        role: 'system',
        content: `
        You are an AI specialized in extracting structured data from images of parking tickets. 
        Your task is to analyze the images provided and return a JSON object matching this schema:
        {
          "pcnNumber": "string",
          "type": "PARKING_CHARGE_NOTICE or PENALTY_CHARGE_NOTICE",
          "dateIssued": "ISO 8601 string with the following format: YYYY-MM-DDTHH:MM:SSZ",
          "dateTimeOfContravention": "ISO 8601 string with the following format: YYYY-MM-DDTHH:MM:SSZ",
          "location": "string, optional",
          "firstSeen": "ISO 8601 string with the following format: YYYY-MM-DDTHH:MM:SSZ, optional",
          "contraventionCode": "string",
          "contraventionDescription": "string, optional",
          "amountDue": "integer (in pennies)",
          "issuer": "string",
          "issuerType": "COUNCIL, TFL, or PRIVATE_COMPANY",
          "discountedPaymentDeadline": "ISO 8601 string with the following format: YYYY-MM-DDTHH:MM:SSZ",
          "fullPaymentDeadline": "ISO 8601 string with the following format: YYYY-MM-DDTHH:MM:SSZ",
        }.
        Extract the information accurately from the provided images.
        When calculating the dates for the discountedPaymentDeadline and fullPaymentDeadline fields, please return them as actual ISO 8601 formatted dates with the following format: YYYY-MM-DDTHH:MM:SSZ.
        - The discountedPaymentDeadline should be 14 days after the dateIssued.
        - The fullPaymentDeadline should be 28 days after the dateIssued.
      `,
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Please extract the required details from the following parking ticket images.',
          },
          {
            type: 'image_url',
            image_url: {
              url: blobStorageUrl,
            },
          },
        ],
      },
    ],
    response_format: zodResponseFormat(TicketSchema, 'ticket'),
  });

  // DEBUG:
  // eslint-disable-next-line no-console
  console.log('createTicket gpt-4o response:', response);

  const ticketInfo = response.choices[0].message.content;

  // DEBUG:
  // eslint-disable-next-line no-console
  console.log('createTicket ticketInfo:', ticketInfo);

  const {
    pcnNumber,
    type,
    dateIssued,
    vehicleRegistration,
    dateTimeOfContravention,
    contraventionCode,
    contraventionDescription,
    location,
    firstSeen,
    amountDue,
    issuer,
    issuerType,
    discountedPaymentDeadline,
    fullPaymentDeadline,
  } = JSON.parse(ticketInfo as string);

  // save ticket to database
  const ticket = await prisma.ticket.create({
    data: {
      pcnNumber,
      type,
      dateIssued: toISODateString(dateIssued),
      dateTimeOfContravention: toISODateString(dateTimeOfContravention),
      location,
      firstSeen: firstSeen ? toISODateString(firstSeen) : undefined,
      amountDue: Number(amountDue),
      issuer,
      issuerType,
      discountedPaymentDeadline: toISODateString(discountedPaymentDeadline),
      fullPaymentDeadline: toISODateString(fullPaymentDeadline),
      contravention: {
        connectOrCreate: {
          where: {
            code: contraventionCode.toString(),
          },
          create: {
            code: contraventionCode.toString(),
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
            make: 'Toyota',
            model: 'Corolla',
            year: 2020,
            userId,
          },
        },
      },
      media: {
        create: [
          {
            url: base64Image,
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
  const userId = await getUserId('delete a ticket');

  if (!userId) {
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
  | null
> => {
  const userId = await getUserId('get tickets');

  if (!userId) {
    return null;
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
      discountedPaymentDeadline: true,
      fullPaymentDeadline: true,
      verified: true,
      location: true,
      contravention: {
        select: {
          code: true,
          description: true,
        },
      },
      dateTimeOfContravention: true,
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
  const userId = await getUserId('get a ticket');

  if (!userId) {
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
      dateTimeOfContravention: true,
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

export const getVehicles = async () => {
  const userId = await getUserId('get vehicles');

  if (!userId) {
    return null;
  }

  const vehicles = await prisma.vehicle.findMany({
    where: {
      userId,
    },
    select: {
      id: true,
      registration: true,
      make: true,
      model: true,
      year: true,
    },
  });

  return vehicles;
};

export const generateChallengeLetter = async (ticketId: string) => {
  const userId = await getUserId('generate a challenge letter');

  if (!userId) {
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
      dateTimeOfContravention: true,
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
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: `${BACKGROUND_INFORMATION_PROMPT} Please generate a professional letter on behalf of ${user.name} living at address ${user.address} for the ticket ${ticket.pcnNumber} issued by ${ticket.issuer} for the contravention ${ticket.contravention.code} (${ticket.contravention?.description}) for vehicle ${ticket.vehicle?.registration}. The outstanding amount due is £${formatPenniesToPounds(ticket.amountDue)}. Think of a legal basis based on the contravention code that could work as a challenge and use this information to generate a challenge letter. Please note that the letter should be written in a professional manner and should be addressed to the issuer of the ticket. The letter should be written in a way that it can be sent as is - no placeholders or brackets should be included in the response, use the actual values of the name of the person you are writing the letter for and the ticket details`,
        },
      ],
    }),
    openai.chat.completions.create({
      model: 'gpt-4o',
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
  const userId = await getUserId('get the current user');

  if (!userId) {
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
      credits: true,
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

export const createCheckoutSession = async (
  productType: ProductType,
): Promise<{
  id: string;
} | null> => {
  let priceId;
  let mode: 'payment' | 'subscription';

  switch (productType) {
    case ProductType.PAY_PER_TICKET:
      priceId = process.env.PAY_PER_TICKET_STRIPE_PRICE_ID;
      mode = 'payment';
      break;
    case ProductType.PRO_MONTHLY:
      priceId = process.env.PRO_MONTHLY_STRIPE_PRICE_ID;
      mode = 'subscription';
      break;
    case ProductType.PRO_ANNUAL:
      priceId = process.env.PRO_ANNUAL_STRIPE_PRICE_ID;
      mode = 'subscription';
      break;
    default:
      throw new Error('Invalid product type');
  }

  const headersList = headers();
  const origin = headersList.get('origin');

  const userId = await getUserId('create a checkout session');

  if (!userId) {
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
        price: priceId,
        quantity: 1,
      },
    ],
    mode,
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

  const userId = await getUserId('create a customer portal session');

  if (!userId) {
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
