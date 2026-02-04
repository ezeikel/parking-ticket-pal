import { generateText, generateObject } from 'ai';
import { CHALLENGE_WRITER_PROMPT, CHALLENGE_LETTER_PROMPT } from '@/constants';
import { ChallengeLetterSchema, ChallengeLetter } from '@/types';
import { models, getTracedModel } from '@/lib/ai/models';

type BaseParams = {
  pcnNumber: string;
  challengeReason: string;
  additionalDetails?: string;
  userId?: string;
};

type FormFieldParams = BaseParams & {
  contentType: 'form-field';
  formFieldPlaceholderText?: string;
  userEvidenceImageUrls?: string[];
  issuerEvidenceImageUrls?: string[];
  ticket?: never;
  user?: never;
  contraventionCodes?: never;
};

type LetterParams = BaseParams & {
  contentType: 'letter';
  ticket: any;
  user: any;
  contraventionCodes: Record<string, { description: string }>;
  formFieldPlaceholderText?: never;
  userEvidenceImageUrls?: never;
  issuerEvidenceImageUrls?: never;
};

type GenerateChallengeContentParams = FormFieldParams | LetterParams;

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
async function generateChallengeContent(
  params: FormFieldParams,
): Promise<string | null>;
async function generateChallengeContent(
  params: LetterParams,
): Promise<ChallengeLetter>;
async function generateChallengeContent(
  params: GenerateChallengeContentParams,
): Promise<string | null | ChallengeLetter> {
  const {
    pcnNumber,
    challengeReason,
    additionalDetails,
    contentType,
    userId,
  } = params;
  // Build the combined challenge reason text
  let combinedReasonText = challengeReason;

  if (additionalDetails) {
    combinedReasonText += `\n\nAdditional Details: ${additionalDetails}`;
  }

  if (contentType === 'form-field') {
    const {
      formFieldPlaceholderText,
      userEvidenceImageUrls = [],
      issuerEvidenceImageUrls = [],
    } = params as FormFieldParams;

    // Generate text for form field input using Vercel AI SDK
    const tracedModel = getTracedModel(models.text, {
      userId: userId || 'system',
      properties: { feature: 'challenge_form_field', pcnNumber },
    });

    try {
      // Build user content with text and images
      const userContent: Array<
        | { type: 'text'; text: string }
        | { type: 'image'; image: URL }
      > = [
        {
          type: 'text',
          text: `Analyze these images and write a challenge for PCN ${pcnNumber}.

            Reason for challenge: ${combinedReasonText}

            The response should fit this form field hint: "${formFieldPlaceholderText}"`,
        },
        ...issuerEvidenceImageUrls.map((url) => ({
          type: 'image' as const,
          image: new URL(url),
        })),
        ...userEvidenceImageUrls.map((url) => ({
          type: 'image' as const,
          image: new URL(url),
        })),
      ];

      const { text } = await generateText({
        model: tracedModel,
        system: CHALLENGE_WRITER_PROMPT,
        messages: [
          {
            role: 'user',
            content: userContent,
          },
        ],
      });

      return text;
    } catch (error) {
      console.error('Error generating challenge text for form field:', error);
      return null;
    }
  } else if (contentType === 'letter') {
    const { ticket, user, contraventionCodes } = params as LetterParams;

    // Generate structured letter content using Vercel AI SDK
    const tracedModel = getTracedModel(models.text, {
      userId: userId || 'system',
      properties: { feature: 'challenge_letter', pcnNumber },
    });

    const { object: letter } = await generateObject({
      model: tracedModel,
      schema: ChallengeLetterSchema,
      schemaName: 'letter',
      schemaDescription: 'A formal challenge letter for a parking penalty notice',
      system: CHALLENGE_LETTER_PROMPT,
      prompt: generateChallengeLetterPrompt(
        ticket,
        user,
        contraventionCodes,
        combinedReasonText,
      ),
    });

    return letter;
  }

  throw new Error(`Unsupported content type: ${contentType}`);
};

export default generateChallengeContent;
