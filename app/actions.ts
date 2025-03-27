'use server';

import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { del, put } from '@vercel/blob';
import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import {
  LetterType,
  MediaType,
  MediaSource,
  TicketType,
  IssuerType,
  TicketStatus,
  FormType,
  User,
  ProductType,
} from '@prisma/client';
import { Readable } from 'stream';
import { Resend } from 'resend';
import Stripe from 'stripe';
import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
import RecaptchaPlugin from 'puppeteer-extra-plugin-recaptcha';
import { db } from '@/lib/prisma';
import { auth } from '@/auth';
import {
  ticketFormSchema,
  TicketSchema,
  PdfFormFields,
  Address,
} from '@/types';
import {
  BACKGROUND_INFORMATION_PROMPT,
  COUNCIL_CHALLENGE_REASONS,
  CHALLENGE_WRITER_PROMPT,
  IMAGE_ANALYSIS_PROMPT,
  CONTRAVENTION_CODES,
  CHATGPT_MODEL,
} from '@/constants/index';
import generatePDF from '@/utils/generatePDF';
import streamToBuffer from '@/utils/streamToBuffer';
import formatPenniesToPounds from '@/utils/formatPenniesToPounds';
import getVehicleInfo from '@/utils/getVehicleInfo';
import { verify, challenge } from '@/utils/automation';
import { z } from 'zod';
import path from 'path';
import fs from 'fs';
import fillPE2Form from '@/utils/automation/forms/PE2';
import fillPE3Form from '@/utils/automation/forms/PE3';
import fillTE7Form from '@/utils/automation/forms/TE7';
import fillTE9Form from '@/utils/automation/forms/TE9';
import FormEmail from '@/components/emails/FormEmail';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const resend = new Resend(process.env.RESEND_API_KEY);

const stripe = new Stripe(process.env.STRIPE_SECRET!, {
  apiVersion: '2025-02-24.acacia',
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

const STORAGE_PATHS = {
  USER_IMAGE: 'users/%s/image.%s',
  USER_TICKET_FORM: 'users/%s/tickets/%s/forms/%s-%s-%s-%s.pdf',
};

const getUserId = async (action?: string) => {
  const session = await auth();
  const headersList = await headers();

  const userId = session?.user.dbId || headersList.get('x-user-id');

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

export const uploadImage = async (
  input: FormData | { scannedImage: string; ocrText?: string },
) => {
  const userId = await getUserId('upload an image');

  if (!userId) {
    return null;
  }

  let base64Image: string;
  let blobStorageUrl: string;
  let ocrText: string | undefined;
  let dbResponse;

  // extract OCR text from input
  if ('ocrText' in input) {
    ocrText = input.ocrText;
  }

  if (input instanceof FormData) {
    const image = input.get('image') as File | null;

    if (!image) {
      throw new Error('No image file provided.');
    }

    // store the image in Vercel Blob storage
    const extension = image.name.split('.').pop();
    const ticketFrontBlob = await put(
      STORAGE_PATHS.USER_IMAGE.replace('%s', userId).replace(
        '%s',
        extension || 'jpg',
      ),
      image,
      {
        access: 'public',
      },
    );

    // update the Blob storage URL for further processing
    blobStorageUrl = ticketFrontBlob.url;
  } else if ('scannedImage' in input) {
    base64Image = input.scannedImage; // use the scannedImage property from the input object

    // if base64Image starts with "data:", strip the prefix
    base64Image = base64Image.replace(/^data:image\/[a-z]+;base64,/, '');

    // upload the base64 string as a Blob
    const buffer = Buffer.from(base64Image, 'base64');
    const ticketFrontBlob = await put(
      STORAGE_PATHS.USER_IMAGE.replace('%s', userId).replace('%s', 'png'),
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

  // send the image URL and OCR text to OpenAI for analysis
  const response = await openai.chat.completions.create({
    model: CHATGPT_MODEL,
    messages: [
      {
        role: 'system',
        content: IMAGE_ANALYSIS_PROMPT,
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Please extract the required details from the following parking ticket image${
              ocrText ? ' and OCR text' : ''
            }.${
              ocrText
                ? `\n\nOCR extracted text for cross-reference:\n${ocrText}`
                : ''
            }`,
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

  const imageInfo = response.choices[0].message.content;

  const {
    documentType,
    pcnNumber,
    type,
    issuedAt,
    vehicleRegistration,
    contraventionAt,
    contraventionCode,
    location,
    firstSeen,
    amountDue,
    issuer,
    issuerType,
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

    // save ticket to db
    dbResponse = await db.ticket.create({
      data: {
        pcnNumber,
        type,
        issuedAt: toISODateString(issuedAt),
        contraventionAt: toISODateString(contraventionAt),
        location,
        observedAt: firstSeen ? toISODateString(firstSeen) : undefined,
        initialAmount: Number(amountDue),
        issuer,
        issuerType,
        // TODO: set status based on current date and discountedPaymentDeadline and fullPaymentDeadline
        // status:
        contraventionCode,
        vehicle: {
          connectOrCreate: {
            where: {
              registrationNumber: vehicleRegistration,
            },
            create: {
              registrationNumber: vehicleRegistration,
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
              type: MediaType.IMAGE,
              source: MediaSource.TICKET,
            },
          ],
        },
      },
    });
  } else {
    const { make, model, bodyType, fuelType, color, year } =
      await getVehicleInfo(vehicleRegistration);

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
              issuedAt: toISODateString(issuedAt),
              contraventionAt: toISODateString(contraventionAt),
              location,
              observedAt: firstSeen ? toISODateString(firstSeen) : undefined,
              initialAmount: Number(amountDue),
              issuer,
              issuerType,
              contraventionCode,
              vehicle: {
                connectOrCreate: {
                  where: {
                    registrationNumber: vehicleRegistration,
                  },
                  create: {
                    registrationNumber: vehicleRegistration,
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
        media: {
          create: [
            {
              url: blobStorageUrl,
              type: MediaType.IMAGE,
              source: MediaSource.LETTER,
            },
          ],
        },
      },
    });
  }

  revalidatePath('/dashboard');

  return dbResponse;
};

export const createTicket = async (
  values: z.infer<typeof ticketFormSchema>,
) => {
  const userId = await getUserId('create a ticket');

  if (!userId) {
    return null;
  }

  try {
    const ticket = await db.ticket.create({
      data: {
        pcnNumber: values.ticketNumber,
        contraventionCode: CONTRAVENTION_CODES['01'].code,
        location: values.location,
        issuedAt: values.issuedAt,
        contraventionAt: values.issuedAt,
        status: TicketStatus.REDUCED_PAYMENT_DUE,
        type: TicketType.PENALTY_CHARGE_NOTICE, // hardcoded for now
        initialAmount: values.amountDue,
        issuer: values.issuer,
        issuerType: IssuerType.COUNCIL, // hardcoded for now
        vehicle: {
          connectOrCreate: {
            where: {
              registrationNumber: values.vehicleReg,
            },
            create: {
              registrationNumber: values.vehicleReg,
              make: 'Toyota',
              model: 'Prius',
              year: 2020,
              bodyType: 'Saloon',
              fuelType: 'Petrol',
              color: 'Red',
              userId,
            },
          },
        },
      },
    });

    return ticket;
  } catch (error) {
    // console.error('Error creating ticket:', error);
    console.error('Stack trace:', (error as Error).stack);
    return null;
  }
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
    include: {
      vehicle: true,
      media: {
        select: {
          url: true,
        },
      },
    },
  });

  return tickets;
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
      initialAmount: true,
      issuer: true,
      issuerType: true,
      location: true,
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

  if (!ticket) return null;

  return ticket;
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
      registrationNumber: true,
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

export const getCurrentUser = async (): Promise<Partial<User> | null> => {
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
      phoneNumber: true,
      signatureUrl: true,
    },
  });

  return user;
};

export const getSubscription = async () => {
  const userId = await getUserId('get the subscription');

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
    success_url: `${origin}/account/billing/success`,
    cancel_url: `${origin}/account/billing`,
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
    return_url: `${origin}/account/billing`,
  });

  return {
    url: portalSession.url,
  };
};

export const revalidateDashboard = async () => revalidatePath('/dashboard');

export const verifyTicket = async (pcnNumber: string) => {
  try {
    const result = await verify(pcnNumber);
    return result;
  } catch (error) {
    console.error('Error checking ticket:', error);
    return false;
  }
};

export const challengeTicket = async (pcnNumber: string) => {
  try {
    const result = await challenge(
      pcnNumber,
      COUNCIL_CHALLENGE_REASONS.CONTRAVENTION_DID_NOT_OCCUR.id,
    );

    return result;
  } catch (error) {
    console.error('Error challenging ticket:', error);
    return false;
  }
};

export const generateChallengeDetails = async ({
  pcnNumber,
  formFieldPlaceholderText,
  reason,
  userEvidenceImageUrls,
  issuerEvidenceImageUrls,
}: {
  pcnNumber: string;
  formFieldPlaceholderText: string;
  reason: string;
  userEvidenceImageUrls: string[];
  issuerEvidenceImageUrls: string[];
}) => {
  const messages = [
    {
      role: 'system' as const,
      content: CHALLENGE_WRITER_PROMPT,
    },
    {
      role: 'user' as const,
      content: [
        {
          type: 'text' as const,
          text: `Analyze these images and write a challenge for PCN ${pcnNumber}.
          
          Reason for challenge: ${reason}
          
          The response should fit this form field hint: "${formFieldPlaceholderText}"`,
        },
        ...issuerEvidenceImageUrls.map((url) => ({
          type: 'image_url' as const,
          image_url: { url },
        })),
        ...userEvidenceImageUrls.map((url) => ({
          type: 'image_url' as const,
          image_url: { url },
        })),
      ],
    },
  ];

  try {
    const completion = await openai.chat.completions.create({
      model: CHATGPT_MODEL,
      messages,
      temperature: 0.7,
      max_tokens: 1000,
    });

    return completion.choices[0].message.content;
  } catch (error) {
    console.error('Error generating challenge details:', error);
    return null;
  }
};

export const getEvidenceImages = async ({
  pcnNumber,
}: {
  pcnNumber: string;
}) => {
  const ticketWithMedia = await db.ticket.findUnique({
    where: {
      pcnNumber,
    },
    select: {
      media: {
        where: {
          type: MediaType.IMAGE,
          source: MediaSource.ISSUER,
        },
      },
    },
  });

  if (!ticketWithMedia) {
    console.error('Ticket not found.');
    return null;
  }

  return ticketWithMedia.media.map((m) => m.url);
};

// generic function to fill a form and follow subsequent steps e.g. upload to blob, save to db, send email
const handleFormGeneration = async (
  formType: FormType,
  formFields: PdfFormFields,
  fillFormFn: (data: Record<string, any>) => Promise<string | null>,
) => {
  // TODO: make try/catches more granular
  try {
    // fill pdf form
    const filledFormPath = await fillFormFn(formFields);

    if (!filledFormPath) {
      return { success: false, error: `Failed to generate ${formType} form` };
    }

    // get file name and buffer
    const fileName = path.basename(filledFormPath);
    const fileBuffer = fs.readFileSync(filledFormPath);

    // upload to vercel blob with organised path structure
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    // Format the user's name for the filename (lowercase and hyphenated)
    const userName = formFields.userName || 'unknown';
    const formattedUserName = userName.toLowerCase().replace(/\s+/g, '-');

    const blobPath = STORAGE_PATHS.USER_TICKET_FORM.replace(
      '%s',
      formFields.userId,
    )
      .replace('%s', formFields.ticketId)
      .replace('%s', formType)
      .replace('%s', formattedUserName)
      .replace('%s', formFields.penaltyChargeNo)
      .replace('%s', timestamp);

    let blob;

    try {
      blob = await put(blobPath, fileBuffer, {
        access: 'public',
        contentType: 'application/pdf',
      });
    } catch (error) {
      console.error('Error uploading form to blob:', error);
      return {
        success: false,
        error: `Error uploading ${formType} form pdf to blob storage`,
      };
    }

    // save to database
    const form = await db.form.create({
      data: {
        ticketId: formFields.ticketId,
        formType,
        fileName,
        fileUrl: blob.url,
      },
    });

    // send email if email is provided
    if (formFields.userEmail) {
      await resend.emails.send({
        from: 'Parking Ticket Pal <forms@parkingticketpal.com>',
        to: formFields.userEmail,
        subject: `Your ${formType} Form`,
        react: FormEmail({
          formType,
          userName: formFields.userName,
          downloadUrl: blob.url,
        }),
        attachments: [
          {
            filename: fileName,
            content: fileBuffer,
          },
        ],
      });
    }

    // clean up local file
    fs.unlinkSync(filledFormPath);

    return {
      success: true,
      fileUrl: blob.url,
      fileName,
      formId: form.id,
    };
  } catch (error) {
    console.error(`Error generating ${formType} form:`, error);
    return { success: false, error: `Error generating ${formType} form` };
  }
};

export async function generatePE2Form(formFields: PdfFormFields) {
  return handleFormGeneration(FormType.PE2, formFields, fillPE2Form);
}

export async function generatePE3Form(formFields: PdfFormFields) {
  return handleFormGeneration(FormType.PE3, formFields, fillPE3Form);
}

export async function generateTE7Form(formFields: PdfFormFields) {
  return handleFormGeneration(FormType.TE7, formFields, fillTE7Form);
}

export async function generateTE9Form(formFields: PdfFormFields) {
  return handleFormGeneration(FormType.TE9, formFields, fillTE9Form);
}

export async function getFormFillDataFromTicket(
  pcnNumber: string,
): Promise<PdfFormFields | null> {
  try {
    const ticket = await db.ticket.findUnique({
      where: { pcnNumber },
      include: {
        vehicle: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!ticket) {
      console.error('Ticket not found');
      return null;
    }

    // Format the user's address
    const { user } = ticket.vehicle;
    const addressParts = [];

    if ((user.address as Address)?.line1)
      addressParts.push((user.address as Address).line1);
    if ((user.address as Address)?.line2)
      addressParts.push((user.address as Address).line2);
    if ((user.address as Address)?.city)
      addressParts.push((user.address as Address).city);
    if ((user.address as Address)?.postcode)
      addressParts.push((user.address as Address).postcode);
    if ((user.address as Address)?.county)
      addressParts.push((user.address as Address).county);
    if ((user.address as Address)?.country)
      addressParts.push((user.address as Address).country);

    const formattedAddress = addressParts.join('\n');

    // Format the full name and address
    const fullNameAndAddress = `${user.name}\n${formattedAddress}`;

    // Format the date of contravention
    const contraventionDate = new Date(ticket.contraventionAt);
    const formattedDate = `${contraventionDate.getDate().toString().padStart(2, '0')}/${(
      contraventionDate.getMonth() + 1
    )
      .toString()
      .padStart(2, '0')}/${contraventionDate.getFullYear()}`;

    return {
      userId: user.id,
      ticketId: ticket.id,
      userName: user.name,
      userEmail: user.email,
      userAddress: formattedAddress,
      userPostcode: (user.address as Address)?.postcode,
      userTitle: 'Mr', // TODO: get title from user
      penaltyChargeNo: ticket.pcnNumber,
      vehicleRegistrationNo: ticket.vehicle.registrationNumber,
      applicant: ticket.issuer,
      locationOfContravention:
        typeof ticket.location === 'object' && ticket.location !== null
          ? ((ticket.location as Address).line1 || '') +
            ((ticket.location as Address).city
              ? `, ${(ticket.location as Address).city}`
              : '') +
            ((ticket.location as Address).postcode
              ? `, ${(ticket.location as Address).postcode}`
              : '')
          : String(ticket.location),
      dateOfContravention: formattedDate,
      fullNameAndAddress,
      reasonText: '', // This would need to be provided separately
      signatureUrl: user.signatureUrl || null,
    };
  } catch (error) {
    console.error('Error getting form data from ticket:', error);
    return null;
  }
}

export const getSubscriptionDetails = async () => {
  const userId = await getUserId('get subscription details');

  if (!userId) {
    console.error('You need to be logged in to get subscription details.');
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
    console.error('no stripe customer id');
    return null;
  }

  try {
    // Get subscription details from Stripe
    const stripeSubscription = await stripe.subscriptions.list({
      customer: subscription.stripeCustomerId,
      status: 'active',
      expand: ['data.items.data.price.product'],
    });

    if (stripeSubscription.data.length === 0) {
      return {
        type: subscription.type,
        productType: null,
      };
    }

    // Get the product ID from the subscription
    const { product } = stripeSubscription.data[0].items.data[0].price;

    // Handle different possible types of the product field
    const productId = typeof product === 'string' ? product : product.id;

    // Determine product type based on product ID
    let productType = null;
    if (productId === process.env.PRO_MONTHLY_STRIPE_PRODUCT_ID) {
      productType = ProductType.PRO_MONTHLY;
    } else if (productId === process.env.PRO_ANNUAL_STRIPE_PRODUCT_ID) {
      productType = ProductType.PRO_ANNUAL;
    }

    return {
      type: subscription.type,
      productType,
    };
  } catch (error) {
    console.error('Error fetching subscription details from Stripe:', error);
    return {
      type: subscription.type,
      productType: null,
    };
  }
};
