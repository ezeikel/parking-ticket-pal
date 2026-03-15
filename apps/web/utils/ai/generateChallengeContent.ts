import { generateText, Output } from 'ai';
import {
  CHALLENGE_WRITER_PROMPT,
  CHALLENGE_LETTER_PROMPT,
} from '@/lib/ai/prompts';
import { ChallengeLetterSchema, ChallengeLetter } from '@/types';
import { models, getTracedModel } from '@/lib/ai/models';
import {
  ISSUER_ADDRESSES,
  displayNameToSlug,
  type IssuerAddress,
} from '@parking-ticket-pal/constants';
import type { Enrichment } from '@parking-ticket-pal/types';
import { buildEnrichmentPromptSection } from '@parking-ticket-pal/types';

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
  enrichment?: Enrichment;
  ticketImageUrls?: string[];
  evidenceImageUrls?: string[];
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
  enrichment?: Enrichment,
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
  if (enrichment && enrichment.items.length > 0) {
    const enrichmentSection = buildEnrichmentPromptSection(enrichment);
    if (enrichmentSection) {
      prompt += `\n\n${enrichmentSection}`;
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

    // Generate text for form field input using Claude Sonnet
    const tracedModel = getTracedModel(models.creative, {
      userId: userId || 'system',
      properties: { feature: 'challenge_form_field', pcnNumber },
    });

    try {
      // Build user content with text and images
      const imageContext = [
        issuerEvidenceImageUrls.length > 0
          ? `The first ${issuerEvidenceImageUrls.length} image(s) are the parking ticket itself — check for PCN details, contravention description, and any procedural information.`
          : '',
        userEvidenceImageUrls.length > 0
          ? `The next ${userEvidenceImageUrls.length} image(s) are supporting evidence — these may include user-uploaded photos of signage, the vehicle position, road markings, OR Google Street View imagery showing the location from the driver's perspective. Assess signage visibility, adequacy, and any obstructions.`
          : '',
      ]
        .filter(Boolean)
        .join('\n');

      const userContent: (
        | { type: 'text'; text: string }
        | { type: 'image'; image: URL }
      )[] = [
        {
          type: 'text',
          text: `Write a challenge for PCN ${pcnNumber}.

Reason for challenge: ${combinedReasonText}

## Available images
${imageContext}

Analyse all images to identify facts that support the challenge — such as unclear or missing signage, obstructed signs, faded road markings, vehicle position relative to restrictions, or any discrepancy between what the ticket claims and what the images show. Combine these visual observations with the tribunal intelligence and legal grounds provided above to build the strongest possible argument.

Do not mention having photographic evidence or refer to "images" — present observations as facts.

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
      // eslint-disable-next-line no-console
      console.error('Error generating challenge text for form field:', error);
      return null;
    }
  } else if (contentType === 'letter') {
    const {
      ticket,
      user,
      contraventionCodes,
      enrichment,
      ticketImageUrls = [],
      evidenceImageUrls = [],
    } = params;

    // Generate structured letter content using Claude for legally stronger output
    const tracedModel = getTracedModel(models.creative, {
      userId: userId || 'system',
      properties: { feature: 'challenge_letter', pcnNumber },
    });

    const letterPrompt = await generateChallengeLetterPrompt(
      ticket,
      user,
      contraventionCodes,
      combinedReasonText,
      enrichment,
    );

    // Build multimodal content when images are available
    const allImageUrls = [...ticketImageUrls, ...evidenceImageUrls];

    if (allImageUrls.length > 0) {
      const imageContext = [
        ticketImageUrls.length > 0
          ? `The first ${ticketImageUrls.length} image(s) are the parking ticket — check for PCN details, contravention description, and any procedural information.`
          : '',
        evidenceImageUrls.length > 0
          ? `The next ${evidenceImageUrls.length} image(s) are supporting evidence — these may include user-uploaded photos of signage/vehicle position, council enforcement evidence, OR Google Street View imagery showing the location from the driver's perspective.`
          : '',
      ]
        .filter(Boolean)
        .join('\n');

      const userContent: (
        | { type: 'text'; text: string }
        | { type: 'image'; image: URL }
      )[] = [
        {
          type: 'text',
          text: `${letterPrompt}

## Available images
${imageContext}

Analyse all images to identify facts that support the challenge:
- **Signage**: Is restriction signage visible, adequate, properly positioned, and unobstructed? Are there missing, faded, or contradictory signs?
- **Road markings**: Are yellow/red lines clearly visible and correctly applied?
- **Vehicle position**: Does the vehicle's position relative to restrictions support or contradict the contravention?
- **Procedural details**: Does the ticket itself contain errors, omissions, or inconsistencies?
- **Street-level context**: If Street View images are present, assess what a driver would reasonably see when approaching the location.

Combine these visual observations with the tribunal intelligence, legal grounds, and statutory provisions provided above. Reference specific factual observations naturally in the letter body — do not mention "images", "photographs", or "Street View". Present all observations as first-hand factual statements.`,
        },
        ...ticketImageUrls.map((url) => ({
          type: 'image' as const,
          image: new URL(url),
        })),
        ...evidenceImageUrls.map((url) => ({
          type: 'image' as const,
          image: new URL(url),
        })),
      ];

      const { output: letter } = await generateText({
        model: tracedModel,
        output: Output.object({
          schema: ChallengeLetterSchema,
          name: 'letter',
          description: 'A formal challenge letter for a parking penalty notice',
        }),
        system: CHALLENGE_LETTER_PROMPT,
        messages: [{ role: 'user', content: userContent }],
      });

      return letter;
    }

    const { output: letter } = await generateText({
      model: tracedModel,
      output: Output.object({
        schema: ChallengeLetterSchema,
        name: 'letter',
        description: 'A formal challenge letter for a parking penalty notice',
      }),
      system: CHALLENGE_LETTER_PROMPT,
      prompt: letterPrompt,
    });

    return letter;
  }

  throw new Error(`Unsupported content type: ${contentType}`);
}

export default generateChallengeContent;
