'use server';

import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { del, put } from '@vercel/blob';
import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import {
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
  STRIPE_API_VERSION,
} from '@/constants/index';
import generatePDF from '@/utils/generatePDF';
import streamToBuffer from '@/utils/streamToBuffer';
import formatPenniesToPounds from '@/utils/formatPenniesToPounds';
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
  apiVersion: STRIPE_API_VERSION,
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

export const uploadImage = async (
  input: FormData | { scannedImage: string; ocrText?: string },
) => {
  const userId = await getUserId('upload an image');

  if (!userId) {
    return { success: false, message: 'User not authenticated' };
  }

  let base64Image: string | undefined;
  let blobStorageUrl: string;
  let ocrText: string | undefined;

  // extract OCR text from input
  if ('ocrText' in input) {
    ocrText = input.ocrText;
  }

  if (input instanceof FormData) {
    const image = input.get('image') as File | null;

    if (!image) {
      return { success: false, message: 'No image file provided' };
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
    return {
      success: false,
      message: 'Invalid input type. Must be FormData or base64 string.',
    };
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

  // DEBUG
  // eslint-disable-next-line no-console
  console.log('imageInfo', imageInfo);

  const {
    pcnNumber,
    issuedAt,
    vehicleRegistration,
    contraventionCode,
    location,
    initialAmount,
    issuer,
  } = JSON.parse(imageInfo as string);

  // get full address from Mapbox if we have a line1
  let fullAddress: Address;
  if (typeof location === 'string') {
    try {
      const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

      if (!mapboxToken) {
        console.error('Mapbox access token not found');
        fullAddress = {
          line1: location,
          city: '',
          postcode: '',
          country: 'United Kingdom',
          coordinates: {
            latitude: 0,
            longitude: 0,
          },
        };
      } else {
        const mapboxResponse = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
            location,
          )}.json?access_token=${mapboxToken}&country=GB&limit=1`,
        );

        if (!mapboxResponse.ok) {
          console.error('Mapbox API error:', await mapboxResponse.text());
          fullAddress = {
            line1: location,
            city: '',
            postcode: '',
            country: 'United Kingdom',
            coordinates: {
              latitude: 0,
              longitude: 0,
            },
          };
        } else {
          const mapboxData = await mapboxResponse.json();

          if (mapboxData.features?.[0]) {
            const feature = mapboxData.features[0];
            const context = feature.context || [];
            const city = context.find((c: any) =>
              c.id.startsWith('place'),
            )?.text;
            const postcode = context.find((c: any) =>
              c.id.startsWith('postcode'),
            )?.text;
            const county = context.find((c: any) =>
              c.id.startsWith('region'),
            )?.text;

            fullAddress = {
              line1: feature.text,
              city,
              postcode,
              county,
              country: 'United Kingdom',
              coordinates: {
                latitude: feature.center[1],
                longitude: feature.center[0],
              },
            };
          } else {
            fullAddress = {
              line1: location,
              city: '',
              postcode: '',
              country: 'United Kingdom',
              coordinates: {
                latitude: 0,
                longitude: 0,
              },
            };
          }
        }
      }
    } catch (error) {
      console.error('Error getting address from Mapbox:', error);
      fullAddress = {
        line1: location,
        city: '',
        postcode: '',
        country: 'United Kingdom',
        coordinates: {
          latitude: 0,
          longitude: 0,
        },
      };
    }
  } else {
    fullAddress = location;
  }

  // return the parsed data
  return {
    success: true,
    data: {
      ticketNumber: pcnNumber,
      vehicleReg: vehicleRegistration,
      issuedAt: new Date(issuedAt),
      contraventionCode,
      initialAmount: Math.round(Number(initialAmount) * 100),
      issuer,
      location: fullAddress,
    },
    image: base64Image,
    imageUrl: blobStorageUrl,
  };
};

export const createTicket = async (
  values: z.infer<typeof ticketFormSchema> & { imageUrl?: string },
) => {
  const userId = await getUserId('create a ticket');

  if (!userId) {
    return null;
  }

  try {
    const ticket = await db.ticket.create({
      data: {
        pcnNumber: values.ticketNumber,
        contraventionCode: values.contraventionCode,
        location: values.location,
        issuedAt: values.issuedAt,
        contraventionAt: values.issuedAt,
        status: TicketStatus.REDUCED_PAYMENT_DUE,
        type: TicketType.PENALTY_CHARGE_NOTICE, // TODO: hardcoded for now
        initialAmount: values.initialAmount,
        issuer: values.issuer,
        issuerType: IssuerType.COUNCIL, // TODO: hardcoded for now
        vehicle: {
          connectOrCreate: {
            where: {
              registrationNumber: values.vehicleReg,
            },
            create: {
              registrationNumber: values.vehicleReg,
              // TODO: getVehicleInfo()
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
        media: values.imageUrl
          ? {
              create: {
                url: values.imageUrl,
                type: MediaType.IMAGE,
                source: MediaSource.TICKET,
                description: 'Ticket image',
              },
            }
          : undefined,
      },
    });

    return ticket;
  } catch (error) {
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
      color: true,
      tickets: {
        select: {
          id: true,
        },
      },
    },
  });

  return vehicles;
};

export const getVehicle = async (id: string) => {
  const userId = await getUserId('get a vehicle');

  if (!userId) {
    return null;
  }

  const vehicle = await db.vehicle.findUnique({
    where: {
      id,
      userId,
    },
    select: {
      id: true,
      registrationNumber: true,
      make: true,
      model: true,
      year: true,
      color: true,
      bodyType: true,
      fuelType: true,
      notes: true,
      tickets: {
        select: {
          id: true,
          pcnNumber: true,
          issuedAt: true,
          initialAmount: true,
          status: true,
          issuer: true,
        },
      },
    },
  });

  return vehicle;
};

export const createVehicle = async (data: {
  registrationNumber: string;
  make: string;
  model: string;
  year: string;
  color: string;
  bodyType?: string;
  fuelType?: string;
  notes?: string;
}) => {
  const userId = await getUserId('create a vehicle');

  if (!userId) {
    return null;
  }

  try {
    const vehicle = await db.vehicle.create({
      data: {
        registrationNumber: data.registrationNumber,
        make: data.make,
        model: data.model,
        year: parseInt(data.year, 10),
        color: data.color,
        bodyType: data.bodyType || '',
        fuelType: data.fuelType || '',
        notes: data.notes || '',
        user: {
          connect: {
            id: userId,
          },
        },
      },
    });

    revalidatePath('/vehicles');
    return vehicle;
  } catch (error) {
    console.error('Error creating vehicle:', error);
    return null;
  }
};

export async function updateVehicle(
  id: string,
  data: {
    registrationNumber: string;
    make: string;
    model: string;
    year: string;
    color: string;
    bodyType?: string;
    fuelType?: string;
    notes?: string;
  },
) {
  const userId = await getUserId();
  if (!userId) {
    throw new Error('Unauthorized');
  }

  try {
    await db.vehicle.update({
      where: {
        id,
        userId,
      },
      data: {
        registrationNumber: data.registrationNumber,
        make: data.make,
        model: data.model,
        year: parseInt(data.year),
        color: data.color,
        bodyType: data.bodyType || '',
        fuelType: data.fuelType || '',
        notes: data.notes,
      },
    });
    revalidatePath('/vehicles');
  } catch (error) {
    console.error('Error updating vehicle:', error);
    throw new Error('Failed to update vehicle');
  }
}

export const deleteVehicle = async (id: string) => {
  const userId = await getUserId('delete a vehicle');

  if (!userId) {
    return null;
  }

  try {
    const vehicle = await db.vehicle.delete({
      where: {
        id,
        userId,
      },
    });

    revalidatePath('/vehicles');
    return vehicle;
  } catch (error) {
    console.error('Error deleting vehicle:', error);
    return null;
  }
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

export const generatePE2Form = async (formFields: PdfFormFields) =>
  handleFormGeneration(FormType.PE2, formFields, fillPE2Form);

export const generatePE3Form = async (formFields: PdfFormFields) =>
  handleFormGeneration(FormType.PE3, formFields, fillPE3Form);

export const generateTE7Form = async (formFields: PdfFormFields) =>
  handleFormGeneration(FormType.TE7, formFields, fillTE7Form);

export const generateTE9Form = async (formFields: PdfFormFields) =>
  handleFormGeneration(FormType.TE9, formFields, fillTE9Form);

export const getFormFillDataFromTicket = async (
  pcnNumber: string,
): Promise<PdfFormFields | null> => {
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
};

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

export const updateTicket = async (
  id: string,
  values: z.infer<typeof ticketFormSchema>,
) => {
  const userId = await getUserId('update a ticket');

  if (!userId) {
    return null;
  }

  try {
    const ticket = await db.ticket.update({
      where: {
        id,
      },
      data: {
        pcnNumber: values.ticketNumber,
        contraventionCode: values.contraventionCode,
        location: values.location,
        issuedAt: values.issuedAt,
        contraventionAt: values.issuedAt,
        initialAmount: values.initialAmount,
        issuer: values.issuer,
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
    console.error('Stack trace:', (error as Error).stack);
    return null;
  }
};

export const refresh = async (path = '/') => revalidatePath(path);

export const refreshTicket = async (id: string) => refresh(`/tickets/${id}`);

export const refreshTickets = async () => refresh('/dashboard');
