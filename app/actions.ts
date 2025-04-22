'use server';

import { revalidatePath } from 'next/cache';
import { put } from '@vercel/blob';
import { zodResponseFormat } from 'openai/helpers/zod';
import { MediaType, MediaSource } from '@prisma/client';
import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
import RecaptchaPlugin from 'puppeteer-extra-plugin-recaptcha';
import { db } from '@/lib/prisma';
import { DocumentSchema, Address } from '@/types';
import {
  IMAGE_ANALYSIS_PROMPT,
  CHATGPT_MODEL,
  STORAGE_PATHS,
} from '@/constants/index';
import { openai } from '@/lib/openai';
import { getUserId } from './actions/user';

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

export const uploadImage = async (
  input:
    | FormData
    | {
        scannedImage: string;
        ocrText?: string;
        imageType?: 'TICKET' | 'LETTER';
      },
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
    response_format: zodResponseFormat(DocumentSchema, 'document'),
  });

  const imageInfo = response.choices[0].message.content;

  const {
    pcnNumber,
    issuedAt,
    vehicleRegistration,
    contraventionCode,
    location,
    initialAmount,
    issuer,
    sentAt,
    summary,
    extractedText,
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
      pcnNumber,
      vehicleReg: vehicleRegistration,
      issuedAt: new Date(issuedAt),
      contraventionCode,
      initialAmount: Math.round(Number(initialAmount) * 100),
      issuer,
      location: fullAddress,
      summary,
      sentAt: new Date(sentAt),
      extractedText,
    },
    image: base64Image,
    imageUrl: blobStorageUrl,
  };
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

export const revalidateDashboard = async () => revalidatePath('/dashboard');

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

export const refresh = async (path = '/') => revalidatePath(path);
