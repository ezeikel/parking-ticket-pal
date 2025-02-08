'use server';

import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { del, put } from '@vercel/blob';
import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { LetterType, MediaType } from '@prisma/client';
import { Readable } from 'stream';
import { Resend } from 'resend';
import Stripe from 'stripe';
import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
import RecaptchaPlugin from 'puppeteer-extra-plugin-recaptcha';
import { db } from '@/lib/prisma';
import { auth } from '@/auth';
import { ProductType, TicketSchema } from '@/types';
import { BACKGROUND_INFORMATION_PROMPT } from '@/constants';
import generatePDF from '@/utils/generatePDF';
import streamToBuffer from '@/utils/streamToBuffer';
import formatPenniesToPounds from '@/utils/formatPenniesToPounds';
import getVehicleInfo from '@/utils/getVehicleInfo';
import getLatLng from '@/utils/getLatLng';
import { getIssuerKey, ISSUERS } from '@/utils/scrape';
import { convertLocationArray } from '@/utils/prisma-helpers';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const resend = new Resend(process.env.RESEND_API_KEY);

const stripe = new Stripe(process.env.STRIPE_SECRET!, {
  apiVersion: '2025-01-27.acacia',
});

chromium.use(
  RecaptchaPlugin({
    provider: {
      id: '2captcha',
      token: process.env.TWO_CAPTCHA_API_KEY,
    },
    // TODO: only set to true if running on localhost
    visualFeedback: true, // colorize reCAPTCHAs (violet = detected, green = solved)
  }),
);

chromium.use(stealth());

const getUserId = async (action?: string) => {
  const session = await auth();
  const headersList = await headers();
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

export const uploadImage = async (input: FormData | string) => {
  const userId = await getUserId('upload an image');

  if (!userId) {
    return null;
  }

  let base64Image: string;
  let blobStorageUrl: string;
  let dbResponse;

  if (input instanceof FormData) {
    const image = input.get('image') as File | null;

    if (!image) {
      throw new Error('No image file provided.');
    }

    // store the image in Vercel Blob storage
    const extension = image.name.split('.').pop();
    const ticketFrontBlob = await put(
      `uploads/users/${userId}/image.${extension}`,
      image,
      {
        access: 'public',
      },
    );

    // update the Blob storage URL for further processing
    blobStorageUrl = ticketFrontBlob.url;
  } else if (typeof input === 'string') {
    base64Image = input; // directly use the provided base64 string

    // if base64Image starts with "data:", strip the prefix
    base64Image = base64Image.replace(/^data:image\/[a-z]+;base64,/, '');

    // upload the base64 string as a Blob
    const buffer = Buffer.from(base64Image, 'base64');
    const ticketFrontBlob = await put(
      `uploads/users/${userId}/image.png`,
      buffer,
      {
        access: 'public',
        contentType: 'image/png', // assuming png format (react-native-document-scanner-plugin uses png)
      },
    );

    // update the Blob storage URL for further processing
    blobStorageUrl = ticketFrontBlob.url;
  } else {
    throw new Error('Invalid input type. Must be FormData or base64 string.');
  }

  // send the image URL to OpenAI for analysis
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-2024-08-06',
    messages: [
      {
        role: 'system',
        content: `
      You are an AI specialized in extracting structured data from images of parking tickets and related letters.
      Your task is to analyze the images provided and return a JSON object matching this schema:
      {
        "documentType": "TICKET" or "LETTER", // TICKET: a physical PCN attached to a car (usually smaller and compact); LETTER: a formal document mailed to the registered owner about a PCN (usually A4 size).
        "pcnNumber": "string",
        "type": "PARKING_CHARGE_NOTICE" or "PENALTY_CHARGE_NOTICE",
        "dateIssued": "ISO 8601 string with the following format: YYYY-MM-DDTHH:MM:SSZ",
        "dateTimeOfContravention": "ISO 8601 string with the following format: YYYY-MM-DDTHH:MM:SSZ",
        "location": "string, optional",
        "firstSeen": "ISO 8601 string with the following format: YYYY-MM-DDTHH:MM:SSZ, optional",
        "contraventionCode": "string",
        "contraventionDescription": "string, optional",
        "amountDue": "integer (in pennies)",
        "issuer": "string",
        "issuerType": "COUNCIL", "TFL", or "PRIVATE_COMPANY",
        "discountedPaymentDeadline": "ISO 8601 string with the following format: YYYY-MM-DDTHH:MM:SSZ",
        "fullPaymentDeadline": "ISO 8601 string with the following format: YYYY-MM-DDTHH:MM:SSZ",

        // If the documentType is "LETTER", extract the following additional fields
        "extractedText": "string",  // full text extracted from the letter
        "summary": "string"         // summary of the key points from the letter
      }.

      When determining whether the document is a "TICKET" or a "LETTER", please consider the following:
      - A "TICKET" is typically a smaller document, often about the size of a receipt, with concise details regarding the violation, and would be found inside an adhesive pack attached to a windshield. The paper quality is often thinner than an A4-sized letter and might be printed with immediate details of the contravention and amount due.
      - A "LETTER" is usually an A4-sized document, more formally structured, sent through the post. It might include salutation text (e.g., 'Dear Sir/Madam') and more detailed legal information related to the penalty charge, and may also include images of the contravention.

      Both types of documents will contain similar fields such as PCN number, contravention date, and amount due, but the documentType must be distinguished by the layout, size, and presentation style.
      
      Ensure ISO 8601 format for all dates, and calculate the discountedPaymentDeadline as 14 days and fullPaymentDeadline as 28 days after the dateIssued.
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
  console.log('uploadImage gpt-4o response:', response);

  const imageInfo = response.choices[0].message.content;

  // DEBUG:
  // eslint-disable-next-line no-console
  console.log('uploadImage imageInfo:', imageInfo);

  const {
    documentType,
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
    extractedText,
    summary,
  } = JSON.parse(imageInfo as string);

  // if the image is a letter, create a new Letter, otherwise create a new Ticket
  if (documentType === 'TICKET') {
    // check if the ticket already exists
    const existingTicket = await db.ticket.findFirst({
      where: {
        pcnNumber,
      },
    });

    if (existingTicket) {
      console.error('Ticket already exists.');
      return null;
    }

    // TODO: this can throw an error, handle this gracefully
    const { make, model, bodyType, fuelType, color, year } =
      await getVehicleInfo(vehicleRegistration);

    // TODO: save full address to db in the future
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { lat, lng, fullAddress } = await getLatLng(location);

    // eslint-disable-next-line no-console
    console.log('fullAddress:', fullAddress);

    // save ticket to db
    dbResponse = await db.ticket.create({
      data: {
        pcnNumber,
        type,
        dateIssued: toISODateString(dateIssued),
        dateTimeOfContravention: toISODateString(dateTimeOfContravention),
        location: [lat, lng],
        firstSeen: firstSeen ? toISODateString(firstSeen) : undefined,
        amountDue: Number(amountDue),
        issuer,
        issuerType,
        discountedPaymentDeadline: toISODateString(discountedPaymentDeadline),
        fullPaymentDeadline: toISODateString(fullPaymentDeadline),
        // TODO: set status based on current date and discountedPaymentDeadline and fullPaymentDeadline
        // status:
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
              vrm: vehicleRegistration,
            },
            create: {
              vrm: vehicleRegistration,
              make,
              model,
              bodyType,
              fuelType,
              color,
              year,
              userId,
            },
          },
        },
        media: {
          create: [
            {
              url: blobStorageUrl,
              name: '   ',
              type: MediaType.IMAGE,
            },
          ],
        },
      },
    });
  } else {
    const { make, model, bodyType, fuelType, color, year } =
      await getVehicleInfo(vehicleRegistration);

    // TODO: save full address to db in the future
    const { lat, lng } = await getLatLng(location);

    // save letter to db
    dbResponse = await db.letter.create({
      data: {
        type: LetterType.INITIAL_NOTICE,
        extractedText,
        summary,
        ticket: {
          connectOrCreate: {
            where: {
              pcnNumber,
            },
            create: {
              pcnNumber,
              type,
              dateIssued: toISODateString(dateIssued),
              dateTimeOfContravention: toISODateString(dateTimeOfContravention),
              location: [lat, lng],
              firstSeen: firstSeen ? toISODateString(firstSeen) : undefined,
              amountDue: Number(amountDue),
              issuer,
              issuerType,
              discountedPaymentDeadline: toISODateString(
                discountedPaymentDeadline,
              ),
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
                    vrm: vehicleRegistration,
                  },
                  create: {
                    vrm: vehicleRegistration,
                    make,
                    model,
                    bodyType,
                    fuelType,
                    color,
                    year,
                    userId,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  revalidatePath('/dashboard');

  return dbResponse;
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
          vrm: true,
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

  return tickets.map((ticket) => ({
    ...ticket,
    // convert decimal location to numbers before returning
    location: convertLocationArray(ticket.location),
  }));
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
    select: {
      id: true,
      pcnNumber: true,
      type: true,
      description: true,
      amountDue: true,
      issuer: true,
      issuerType: true,
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
          vrm: true,
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

  if (!ticket) return null;

  return {
    ...ticket,
    // convert decimal location to numbers before returning
    location: convertLocationArray(ticket.location),
  };
};

export const getVehicles = async () => {
  const userId = await getUserId('get vehicles');

  if (!userId) {
    return null;
  }

  const vehicles = await db.vehicle.findMany({
    where: {
      userId,
    },
    select: {
      id: true,
      vrm: true,
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
    console.error('User not found.');
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
          vrm: true,
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
          content: `${BACKGROUND_INFORMATION_PROMPT} Please generate a professional letter on behalf of ${user.name} living at address ${user.address} for the ticket ${ticket.pcnNumber} issued by ${ticket.issuer} for the contravention ${ticket.contravention.code} (${ticket.contravention?.description}) for vehicle ${ticket.vehicle?.vrm}. The outstanding amount due is £${formatPenniesToPounds(ticket.amountDue)}. Think of a legal basis based on the contravention code that could work as a challenge and use this information to generate a challenge letter. Please note that the letter should be written in a professional manner and should be addressed to the issuer of the ticket. The letter should be written in a way that it can be sent as is - no placeholders or brackets should be included in the response, use the actual values of the name of the person you are writing the letter for and the ticket details`,
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

  const user = await db.user.findUnique({
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

  const subscription = await db.subscription.findFirst({
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

  const headersList = await headers();
  const origin = headersList.get('origin');

  const userId = await getUserId('create a checkout session');

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
    console.error('User not found.');
    return null;
  }

  // TODO: findUnique instead of findFirst
  const subscription = await db.subscription.findFirst({
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
  const headersList = await headers();
  const origin = headersList.get('origin');

  const userId = await getUserId('create a customer portal session');

  if (!userId) {
    return null;
  }

  const subscription = await db.subscription.findFirst({
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

export const verifyTicket = async (pcnNumber: string) => {
  const ticket = await db.ticket.findFirst({
    where: {
      pcnNumber,
    },
    include: {
      vehicle: true,
    },
  });

  if (!ticket) {
    console.error('Ticket not found.');
    return false;
  }

  const issuerKey = getIssuerKey(ticket.issuer);
  const issuer = ISSUERS[issuerKey as keyof typeof ISSUERS];

  if (!issuer) {
    console.error('Issuer not found.');
    return false;
  }

  // use playwright to check the ticket number on the issuer's website
  const browser = await chromium.launch({
    headless: true,
  });
  const page = await browser.newPage();

  try {
    const result = await issuer.verifyPcnNumber({
      page,
      pcnNumber,
      ticket,
    });
    return result;
  } catch (error) {
    console.error('Error checking ticket:', error);
    return false;
  } finally {
    await browser.close();
  }
};
