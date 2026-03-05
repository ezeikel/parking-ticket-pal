import { generateText, Output } from 'ai';
import { CHALLENGE_WRITER_PROMPT, CHALLENGE_LETTER_PROMPT } from '@/constants';
import { ChallengeLetterSchema, ChallengeLetter } from '@/types';
import { models, getTracedModel } from '@/lib/ai/models';
import {
  ISSUER_ADDRESSES,
  displayNameToSlug,
  type IssuerAddress,
} from '@parking-ticket-pal/constants';

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

export type LetterEnrichment = {
  successRate?: { percentage: number; numberOfCases: number };
  winningPatterns?: { pattern: string; frequency: number }[];
  losingPatterns?: { pattern: string; frequency: number }[];
  statutoryGround?: { label: string; description: string };
  appealGuidance?: string[];
  exampleWinningReasons?: string[];
};

type LetterParams = BaseParams & {
  contentType: 'letter';
  ticket: any;
  user: any;
  contraventionCodes: Record<string, { description: string }>;
  enrichment?: LetterEnrichment;
  formFieldPlaceholderText?: never;
  userEvidenceImageUrls?: never;
  issuerEvidenceImageUrls?: never;
};

type GenerateChallengeContentParams = FormFieldParams | LetterParams;

/**
 * Look up an issuer's correspondence address using Perplexity Sonar.
 * Returns the address if found with high confidence, undefined otherwise.
 */
async function lookupIssuerAddress(
  issuerName: string,
): Promise<IssuerAddress | undefined> {
  try {
    const { text } = await generateText({
      model: models.search,
      system:
        'You look up postal correspondence addresses for UK parking enforcement companies and councils. Return ONLY valid JSON, no markdown.',
      prompt: `What is the postal correspondence address for "${issuerName}" parking services in the UK? I need to send them a formal challenge letter about a parking penalty charge notice.

Return a JSON object with these fields:
- formalName: the full legal/formal name of the organisation
- department: relevant department (e.g. "Appeals Department", "Parking Services") or null
- addressLine1: first line of address
- addressLine2: second line of address or null
- city: city/town
- postcode: UK postcode

If you cannot find a reliable address, return: {"notFound": true}`,
    });

    const cleaned = text
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim();
    const parsed = JSON.parse(cleaned);

    if (
      parsed.notFound ||
      !parsed.formalName ||
      !parsed.addressLine1 ||
      !parsed.postcode
    ) {
      return undefined;
    }

    return {
      formalName: parsed.formalName,
      department: parsed.department || undefined,
      addressLine1: parsed.addressLine1,
      addressLine2: parsed.addressLine2 || undefined,
      city: parsed.city,
      postcode: parsed.postcode,
    };
  } catch {
    return undefined;
  }
}

// helper function to generate challenge letter prompt (moved from promptGenerators.ts)
const generateChallengeLetterPrompt = async (
  ticket: any,
  user: any,
  contraventionCodes: Record<string, { description: string }>,
  challengeReason: string,
  enrichment?: LetterEnrichment,
) => {
  const userAddress = user.address;
  const userAddressLine1 = userAddress?.line1 || '';
  const userCity = userAddress?.city || '';
  const userPostcode = userAddress?.postcode || '';

  const ticketLocation = ticket.location;
  const ticketAddressLine1 = ticketLocation?.line1 || '';
  const ticketCity = ticketLocation?.city || '';
  const ticketPostcode = ticketLocation?.postcode || '';

  const contraventionDescription = ticket.contraventionCode
    ? contraventionCodes[ticket.contraventionCode]?.description ||
      'Unknown contravention'
    : 'Not specified';

  const today = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const issuerSlug = displayNameToSlug(ticket.issuer || '');
  let issuerAddress = issuerSlug ? ISSUER_ADDRESSES[issuerSlug] : undefined;

  // Fallback: look up unknown issuers via Perplexity
  if (!issuerAddress && ticket.issuer) {
    issuerAddress = await lookupIssuerAddress(ticket.issuer);
  }

  let prompt = `Generate a challenge letter for the following PCN:

PCN Number: ${ticket.pcnNumber}
Vehicle Registration: ${ticket.vehicle?.registrationNumber || 'N/A'}
Issuer: ${issuerAddress?.formalName || ticket.issuer || 'Not specified'}
Contravention Code: ${ticket.contraventionCode || 'Not specified'}
Contravention Description: ${contraventionDescription}
Amount Due: ${ticket.initialAmount != null ? `£${(ticket.initialAmount / 100).toFixed(2)}` : 'Not specified'}
Location of Contravention: ${ticketAddressLine1}, ${ticketCity} ${ticketPostcode}
Date of Contravention: ${ticket.contraventionAt.toLocaleDateString('en-GB')}
Date Issued: ${ticket.issuedAt.toLocaleDateString('en-GB')}
Today's Date (use as the letter date): ${today}
Challenge Reason: ${challengeReason}`;

  // Add enrichment data when available
  if (enrichment) {
    if (enrichment.statutoryGround) {
      prompt += `\n\nStatutory Ground: ${enrichment.statutoryGround.label}
Description: ${enrichment.statutoryGround.description}`;
    }

    if (enrichment.successRate && enrichment.successRate.numberOfCases > 0) {
      prompt += `\n\nTribunal Intelligence:
- Success rate for similar cases: ${enrichment.successRate.percentage}% (based on ${enrichment.successRate.numberOfCases} tribunal cases)`;
    }

    if (enrichment.winningPatterns && enrichment.winningPatterns.length > 0) {
      prompt += `\n- Winning patterns in similar cases: ${enrichment.winningPatterns.map((p) => p.pattern.replace(/_/g, ' ').toLowerCase()).join(', ')}`;
    }

    if (enrichment.losingPatterns && enrichment.losingPatterns.length > 0) {
      prompt += `\n- Arguments that tend to lose: ${enrichment.losingPatterns.map((p) => p.pattern.replace(/_/g, ' ').toLowerCase()).join(', ')}`;
    }

    if (
      enrichment.exampleWinningReasons &&
      enrichment.exampleWinningReasons.length > 0
    ) {
      prompt += `\n\nExample reasoning from successful tribunal appeals (use as inspiration, not verbatim):`;
      enrichment.exampleWinningReasons.forEach((reason, i) => {
        prompt += `\n${i + 1}. ${reason}`;
      });
    }

    if (enrichment.appealGuidance && enrichment.appealGuidance.length > 0) {
      prompt += `\n\nAppeal guidance for this contravention type:`;
      enrichment.appealGuidance.forEach((tip) => {
        prompt += `\n- ${tip}`;
      });
    }
  }

  prompt += `

Sender Details (use exactly as provided):
Name: ${user.name}
Address: ${userAddressLine1}
City: ${userCity}
Postcode: ${userPostcode}
Email: ${user.email}
Signature URL: ${user.signatureUrl || 'None'}

Recipient Details (use exactly as provided — do not shorten or alter the name):
Name: ${issuerAddress?.formalName || ticket.issuer}
${
  issuerAddress
    ? `Address: ${issuerAddress.department ? `${issuerAddress.department}, ` : ''}${issuerAddress.addressLine1}${issuerAddress.addressLine2 ? `, ${issuerAddress.addressLine2}` : ''}
City: ${issuerAddress.city}
Postcode: ${issuerAddress.postcode}`
    : 'Note: The recipient address is not available. Use the issuer name only for the recipient. Leave the recipient address, city, and postcode as empty strings in the JSON output — they will be filled in later before sending.'
}

Salutation: Dear Sir or Madam
Closing: Yours faithfully
Signature Name: ${user.name}

Generate a professional challenge letter from the perspective of the vehicle owner (${user.name}) challenging this PCN. Use the exact addresses provided above and the standard salutation, closing, and signature name provided. Focus the challenge on the specific reason provided: ${challengeReason}.`;

  return prompt;
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
  const { pcnNumber, challengeReason, additionalDetails, contentType, userId } =
    params;
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
    } = params;

    // Generate text for form field input using Vercel AI SDK
    const tracedModel = getTracedModel(models.text, {
      userId: userId || 'system',
      properties: { feature: 'challenge_form_field', pcnNumber },
    });

    try {
      // Build user content with text and images
      const userContent: (
        | { type: 'text'; text: string }
        | { type: 'image'; image: URL }
      )[] = [
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
    const { ticket, user, contraventionCodes, enrichment } = params;

    // Generate structured letter content using Claude for legally stronger output
    const tracedModel = getTracedModel(models.creative, {
      userId: userId || 'system',
      properties: { feature: 'challenge_letter', pcnNumber },
    });

    const { output: letter } = await generateText({
      model: tracedModel,
      output: Output.object({
        schema: ChallengeLetterSchema,
        name: 'letter',
        description: 'A formal challenge letter for a parking penalty notice',
      }),
      system: CHALLENGE_LETTER_PROMPT,
      prompt: await generateChallengeLetterPrompt(
        ticket,
        user,
        contraventionCodes,
        combinedReasonText,
        enrichment,
      ),
    });

    return letter;
  }

  throw new Error(`Unsupported content type: ${contentType}`);
}

export default generateChallengeContent;
