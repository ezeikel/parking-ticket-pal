import openai from '@/lib/openai';
import {
  CHALLENGE_WRITER_PROMPT,
  CHALLENGE_LETTER_PROMPT,
  OPENAI_MODEL_GPT_4O,
} from '@/constants';
import { zodResponseFormat } from 'openai/helpers/zod';
import { ChallengeLetterSchema } from '@/types';

type ChallengeContentType = 'form-field' | 'letter';

type GenerateChallengeContentParams = {
  pcnNumber: string;
  challengeReason: string;
  additionalDetails?: string;
  contentType: ChallengeContentType;
  // for form field generation
  formFieldPlaceholderText?: string;
  userEvidenceImageUrls?: string[];
  issuerEvidenceImageUrls?: string[];
  // for letter generation
  ticket?: any;
  user?: any;
  contraventionCodes?: Record<string, { description: string }>;
};

// helper function to generate challenge letter prompt (moved from promptGenerators.ts)
const generateChallengeLetterPrompt = (
  ticket: any,
  user: any,
  contraventionCodes: Record<string, { description: string }>,
  challengeReason: string,
) => {
  const userAddress = user.address;
  const userAddressLine1 = userAddress?.line1 || '';
  const userCity = userAddress?.city || '';
  const userPostcode = userAddress?.postcode || '';

  const ticketLocation = ticket.location;
  const ticketAddressLine1 = ticketLocation?.line1 || '';
  const ticketCity = ticketLocation?.city || '';
  const ticketPostcode = ticketLocation?.postcode || '';

  const contraventionDescription =
    contraventionCodes[ticket.contraventionCode]?.description ||
    'Unknown contravention';

  return `Generate a challenge letter for the following PCN:

PCN Number: ${ticket.pcnNumber}
Vehicle Registration: ${ticket.vehicle?.registrationNumber || 'N/A'}
Issuer: ${ticket.issuer}
Contravention Code: ${ticket.contraventionCode}
Contravention Description: ${contraventionDescription}
Amount Due: £${(ticket.initialAmount / 100).toFixed(2)}
Location: ${ticketAddressLine1}, ${ticketCity} ${ticketPostcode}
Date of Contravention: ${ticket.contraventionAt.toLocaleDateString('en-GB')}
Date Issued: ${ticket.issuedAt.toLocaleDateString('en-GB')}
Challenge Reason: ${challengeReason}
Sender Details (use exactly as provided):
Name: ${user.name}
Address: ${userAddressLine1}
City: ${userCity}
Postcode: ${userPostcode}
Email: ${user.email}
Signature URL: ${user.signatureUrl || 'None'}

Recipient Details (use exactly as provided):
Name: ${ticket.issuer}
Address: ${ticketAddressLine1 || 'Parking Services'}
City: ${ticketCity || 'London'}
Postcode: ${ticketPostcode || 'SW1A 1AA'}

Salutation: Dear Sir or Madam
Closing: Yours faithfully
Signature Name: ${user.name}

Please generate a professional challenge letter from the perspective of the vehicle owner (${user.name}) challenging this PCN on legal grounds. Use the exact addresses provided above and the standard salutation, closing, and signature name provided. Focus the challenge on the specific reason provided: ${challengeReason}.`;
};

/**
 * Shared utility for generating challenge content for both form fields and letters
 * Handles the common logic of processing challenge reasons and additional details
 */
const generateChallengeContent = async ({
  pcnNumber,
  challengeReason,
  additionalDetails,
  contentType,
  formFieldPlaceholderText,
  userEvidenceImageUrls = [],
  issuerEvidenceImageUrls = [],
  ticket,
  user,
  contraventionCodes,
}: GenerateChallengeContentParams) => {
  // Build the combined challenge reason text
  let combinedReasonText = challengeReason;

  if (additionalDetails) {
    combinedReasonText += `\n\nAdditional Details: ${additionalDetails}`;
  }

  if (contentType === 'form-field') {
    // Generate text for form field input
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
            
            Reason for challenge: ${combinedReasonText}
            
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
        model: OPENAI_MODEL_GPT_4O,
        messages,
        temperature: 0.7,
        max_tokens: 1000,
      });

      return completion.choices[0].message.content;
    } catch (error) {
      console.error('Error generating challenge text for form field:', error);
      return null;
    }
  } else if (contentType === 'letter') {
    // Generate structured letter content
    if (!ticket || !user || !contraventionCodes) {
      throw new Error('Missing required data for letter generation');
    }

    const letterResponse = await openai.chat.completions.create({
      model: OPENAI_MODEL_GPT_4O,
      messages: [
        {
          role: 'system',
          content: CHALLENGE_LETTER_PROMPT,
        },
        {
          role: 'user',
          content: generateChallengeLetterPrompt(
            ticket,
            user,
            contraventionCodes,
            combinedReasonText,
          ),
        },
      ],
      response_format: zodResponseFormat(ChallengeLetterSchema, 'letter'),
    });

    return JSON.parse(letterResponse.choices[0].message.content as string);
  }

  throw new Error(`Unsupported content type: ${contentType}`);
};

export default generateChallengeContent;
