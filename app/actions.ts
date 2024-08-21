'use server';

import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { del, put } from '@vercel/blob';
import OpenAI from 'openai';
import { MediaType, SubscriptionType, Ticket } from '@prisma/client';
import { Readable } from 'stream';
import { Resend } from 'resend';
import Stripe from 'stripe';
import prisma from '@/lib/prisma';
import { auth } from '@/auth';
import { FileWithPreview, ProductType } from '@/types';
import {
  BACKGROUND_INFORMATION_PROMPT,
  CREATE_TICKET_PROMPT,
} from '@/constants';
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

export const createTicket = async (formData: FormData) => {
  const userId = await getUserId('create a ticket');

  if (!userId) {
    return null;
  }

  // check if a user has a pro subscription or enough credits to create a ticket
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      credits: true,
    },
  });

  if (!user) {
    console.error('User not found.');
    return null;
  }

  const subscription = await prisma.subscription.findFirst({
    where: {
      user: {
        id: userId,
      },
    },
  });

  // check if user has enough credits or a pro subscription
  if (
    (!subscription || subscription.type !== SubscriptionType.PRO) &&
    user.credits <= 0
  ) {
    console.error(
      'You need to have a pro subscription or enough credits to create a ticket.',
    );
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
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
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
  console.log('createTicket gpt-4o response:', response);

  // DEBUG:
  // eslint-disable-next-line no-console
  console.log(
    'createTicket gpt-4o message: ',
    JSON.stringify(response.choices[0].message, null, 2),
  );

  const ticketInfo = response.choices[0].message.content;

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
  } = JSON.parse(ticketInfo as string);

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

  // decrement user credits if they dont have a pro subscription

  if (!subscription || subscription?.type !== SubscriptionType.PRO) {
    await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        credits: {
          decrement: 1,
        },
      },
    });
  }

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
