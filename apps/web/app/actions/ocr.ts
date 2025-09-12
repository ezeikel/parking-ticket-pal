'use server';

import { put } from '@vercel/blob';
import { zodResponseFormat } from 'openai/helpers/zod';
import openai from '@/lib/openai';
import vision from '@google-cloud/vision';
import { getUserId } from '@/utils/user';
import createUTCDate from '@/utils/createUTCDate';
import {
  OPENAI_MODEL_GPT_4O,
  IMAGE_ANALYSIS_PROMPT,
  STORAGE_PATHS,
} from '@/constants';
import { generateOcrAnalysisPrompt } from '@/utils/promptGenerators';
import { DocumentSchema, Address } from '@/types';

const getVisionClient = () => {
  const credentialsBase64 = process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64;
  if (!credentialsBase64) {
    throw new Error('Google Vision credentials not found');
  }

  const serviceAccountJson = JSON.parse(
    Buffer.from(credentialsBase64, 'base64').toString('utf8'),
  );

  return new vision.ImageAnnotatorClient({
    credentials: serviceAccountJson,
  });
};

export const extractOCRTextWithOpenAI = async (
  input:
    | FormData
    | {
        scannedImage: string;
        ocrText?: string;
        imageType?: 'TICKET' | 'LETTER';
      },
) => {
  const userId = await getUserId('upload an image');

  // use generic path for unauthenticated users (testing/Postman)
  const effectiveUserId = userId || 'nouser';

  // early validation for missing image
  if (
    !input ||
    (input instanceof FormData &&
      !input.get('image') &&
      !('scannedImage' in input))
  ) {
    return { success: false, message: 'No image provided' };
  }

  let base64Image: string | undefined;
  let blobStorageUrl: string;
  let tempImagePath: string;
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

    // generate temporary path with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const extension = image.name.split('.').pop() || 'jpg';
    tempImagePath = STORAGE_PATHS.TEMP_UPLOAD
      .replace(/%s/, effectiveUserId)
      .replace(/%s/, timestamp)
      .replace(/%s/, extension);

    // store the image in temporary Vercel Blob storage
    const ticketFrontBlob = await put(tempImagePath, image, {
      access: 'public',
    });

    // update the Blob storage URL for further processing
    blobStorageUrl = ticketFrontBlob.url;
  } else if ('scannedImage' in input) {
    base64Image = input.scannedImage; // use the scannedImage property from the input object

    // content type guessing from base64 data
    const match = base64Image.match(/^data:image\/(\w+);base64,/);
    const ext = match?.[1] || 'png';
    const mimeType = `image/${ext}`;

    // if base64Image starts with "data:", strip the prefix
    base64Image = base64Image.replace(/^data:image\/[a-z]+;base64,/, '');

    // validate base64Image is not empty after processing
    if (!base64Image || base64Image.trim() === '') {
      return {
        success: false,
        message: 'Invalid base64 image data provided.',
      };
    }

    // generate temporary path for base64 upload
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    tempImagePath = STORAGE_PATHS.TEMP_UPLOAD
      .replace(/%s/, effectiveUserId)
      .replace(/%s/, timestamp)
      .replace(/%s/, ext);

    // upload the base64 string as a Blob to temporary location
    const buffer = Buffer.from(base64Image, 'base64');
    const ticketFrontBlob = await put(tempImagePath, buffer, {
      access: 'public',
      contentType: mimeType,
    });

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
    model: OPENAI_MODEL_GPT_4O,
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

  // strict Zod validation after parsing
  const parsed = DocumentSchema.safeParse(JSON.parse(imageInfo as string));

  if (!parsed.success) {
    console.error('OpenAI returned invalid document data:', parsed.error);
    return { success: false, message: 'Invalid data returned from AI' };
  }

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
  } = parsed.data;

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
    // handle null location by providing a default address
    fullAddress = {
      line1: '',
      city: '',
      postcode: '',
      country: 'United Kingdom',
      coordinates: {
        latitude: 0,
        longitude: 0,
      },
    };
  }

  // return the parsed data
  return {
    success: true,
    data: {
      pcnNumber,
      vehicleReg: vehicleRegistration,
      issuedAt: createUTCDate(new Date(issuedAt)),
      contraventionCode,
      initialAmount: Math.round(Number(initialAmount) * 100),
      issuer,
      location: fullAddress,
      summary,
      sentAt: sentAt ? createUTCDate(new Date(sentAt)) : null,
      extractedText,
    },
    image: base64Image,
    imageUrl: blobStorageUrl,
    tempImagePath,
  };
};

export const extractOCRTextWithVision = async (
  input:
    | FormData
    | {
        scannedImage: string;
        imageType?: 'TICKET' | 'LETTER';
      },
) => {
  const userId = await getUserId('upload an image');

  // use generic path for unauthenticated users (testing/Postman)
  const effectiveUserId = userId || 'nouser';

  // early validation for missing image
  if (
    !input ||
    (input instanceof FormData &&
      !input.get('image') &&
      !('scannedImage' in input))
  ) {
    return { success: false, message: 'No image provided' };
  }

  let base64Image: string | undefined;
  let blobStorageUrl: string;
  let tempImagePath: string;

  if (input instanceof FormData) {
    const image = input.get('image') as File | null;

    if (!image) {
      return { success: false, message: 'No image file provided' };
    }

    // generate temporary path with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const extension = image.name.split('.').pop() || 'jpg';
    tempImagePath = STORAGE_PATHS.TEMP_UPLOAD
      .replace(/%s/, effectiveUserId)
      .replace(/%s/, timestamp)
      .replace(/%s/, extension);

    // store the image in temporary Vercel Blob storage
    const ticketFrontBlob = await put(tempImagePath, image, {
      access: 'public',
    });

    // update the Blob storage URL for further processing
    blobStorageUrl = ticketFrontBlob.url;
  } else if ('scannedImage' in input) {
    base64Image = input.scannedImage; // use the scannedImage property from the input object

    // content type guessing from base64 data
    const match = base64Image.match(/^data:image\/(\w+);base64,/);
    const ext = match?.[1] || 'png';
    const mimeType = `image/${ext}`;

    // if base64Image starts with "data:", strip the prefix
    base64Image = base64Image.replace(/^data:image\/[a-z]+;base64,/, '');

    // validate base64Image is not empty after processing
    if (!base64Image || base64Image.trim() === '') {
      return {
        success: false,
        message: 'Invalid base64 image data provided.',
      };
    }

    // generate temporary path for base64 upload
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    tempImagePath = STORAGE_PATHS.TEMP_UPLOAD
      .replace(/%s/, effectiveUserId)
      .replace(/%s/, timestamp)
      .replace(/%s/, ext);

    // upload the base64 string as a Blob to temporary location
    const buffer = Buffer.from(base64Image, 'base64');
    const ticketFrontBlob = await put(tempImagePath, buffer, {
      access: 'public',
      contentType: mimeType,
    });

    // update the Blob storage URL for further processing
    blobStorageUrl = ticketFrontBlob.url;
  } else {
    return {
      success: false,
      message: 'Invalid input type. Must be FormData or base64 string.',
    };
  }

  // Use Google Vision for OCR text extraction
  let googleOcrText: string;
  try {
    const visionClient = getVisionClient();
    const [result] = await visionClient.textDetection(blobStorageUrl);
    googleOcrText = result.fullTextAnnotation?.text || '';

    if (!googleOcrText) {
      return { success: false, message: 'No text detected in image' };
    }
  } catch (error) {
    console.error('Google Vision OCR failed:', error);
    return { success: false, message: 'OCR failed with Google Vision API' };
  }

  // send the Google Vision OCR text to OpenAI for structured analysis
  const response = await openai.chat.completions.create({
    model: OPENAI_MODEL_GPT_4O,
    messages: [
      {
        role: 'system',
        content: IMAGE_ANALYSIS_PROMPT,
      },
      {
        role: 'user',
        content: generateOcrAnalysisPrompt(googleOcrText),
      },
    ],
    response_format: zodResponseFormat(DocumentSchema, 'document'),
  });

  const imageInfo = response.choices[0].message.content;

  // strict Zod validation after parsing
  const parsed = DocumentSchema.safeParse(JSON.parse(imageInfo as string));

  if (!parsed.success) {
    console.error('OpenAI returned invalid document data:', parsed.error);
    return { success: false, message: 'Invalid data returned from AI' };
  }

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
  } = parsed.data;

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
    // handle null location by providing a default address
    fullAddress = {
      line1: '',
      city: '',
      postcode: '',
      country: 'United Kingdom',
      coordinates: {
        latitude: 0,
        longitude: 0,
      },
    };
  }

  // return the parsed data
  return {
    success: true,
    data: {
      pcnNumber,
      vehicleReg: vehicleRegistration,
      issuedAt: createUTCDate(new Date(issuedAt)),
      contraventionCode,
      initialAmount: Math.round(Number(initialAmount) * 100),
      issuer,
      location: fullAddress,
      summary,
      sentAt: sentAt ? createUTCDate(new Date(sentAt)) : null,
      extractedText,
    },
    image: base64Image,
    imageUrl: blobStorageUrl,
    tempImagePath,
    ocrText: googleOcrText, // Include the Google Vision OCR text in response
  };
};
