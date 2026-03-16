'use server';

import { generateObject } from 'ai';
import { z } from 'zod';
import { MediaSource, MediaType, db } from '@parking-ticket-pal/db';
import type {
  EnrichmentItem,
  Enrichment,
  Address,
} from '@parking-ticket-pal/types';
import { getStatutoryGroundById } from '@/constants/statutory-grounds';
import { getEducationalContentForCode } from '@/data/contravention-codes/educational-content';
import { getContraventionDetails } from '@parking-ticket-pal/constants';
import { models, getTracedModel } from '@/lib/ai/models';
import fetchStreetViewImages from '@/utils/streetView';
import { put } from '@/lib/storage';

const REASON_TO_STATUTORY_GROUND: Record<string, string> = {
  CONTRAVENTION_DID_NOT_OCCUR: 'contravention-did-not-occur',
  NOT_VEHICLE_OWNER: 'not-owner-at-time',
  VEHICLE_STOLEN: 'vehicle-taken-without-consent',
  HIRE_FIRM: 'hired-vehicle',
  EXCEEDED_AMOUNT: 'penalty-exceeded',
  INVALID_TMO: 'invalid-tro',
  PROCEDURAL_IMPROPRIETY: 'procedural-impropriety',
  UNCLEAR_SIGNAGE: 'inadequate-signage',
  NO_BREACH_CONTRACT: 'contravention-did-not-occur',
  MITIGATING_CIRCUMSTANCES: 'medical-emergency',
};

// ============================================
// Collector Input
// ============================================

type CollectorInput = {
  contraventionCode: string | null;
  issuer: string | null;
  challengeReason: string;
  ticketId?: string;
};

// ============================================
// Collectors
// ============================================
//
// Each collector is an async function: (input: CollectorInput) => Promise<EnrichmentItem[]>
//
// ## Adding a new data source
//
// 1. Write a collector function below (see collectTribunalStats as the reference).
// 2. Add it to the `collectors` array at the bottom of this file.
// 3. That's it — AI prompts and the prediction service pick it up automatically.
//
// ## Outcome signals (feed the success prediction)
//
// The prediction answers: "what's the chance this goes away?"
// Two sequential stages:
//   - challenge_outcome: will the council/operator accept the challenge?
//   - tribunal_outcome:  if not, will the tribunal overturn it?
//
// Combined: overall = P(challenge_ok) + P(challenge_rejected) * P(tribunal_ok)
//
// Emit the right category depending on what stage your data covers:
//
//   Tribunal data (London Tribunal, POPLA, IAS):
//   { source: 'popla', category: 'tribunal_outcome', weight: 0.8,
//     data: { percentage: 58, numberOfCases: 120, confidence: 0.6 } }
//
//   Council challenge data:
//   { source: 'council_lewisham', category: 'challenge_outcome', weight: 0.9,
//     data: { percentage: 35, numberOfCases: 200, confidence: 0.7 } }
//
// ## Qualitative sources (feed AI prompts only, not the number)
//
// Use categories like 'statutory_ground', 'guidance', 'example_case',
// 'winning_pattern', 'losing_pattern'. No `data` needed.
//

/**
 * Normalize an issuer name to an issuer ID (mirrors prediction-service logic)
 */
function normalizeIssuerId(issuer: string): string {
  if (!issuer) return '';
  return issuer
    .toLowerCase()
    .replace(/^(london borough of |royal borough of |city of )/i, '')
    .replace(/\s+/g, '-')
    .trim();
}

/**
 * Collect tribunal statistics: success rate, winning patterns, losing patterns.
 * Contains the tiered lookup logic (issuer+code -> code-only -> baseline).
 */
async function collectTribunalStats(
  input: CollectorInput,
): Promise<EnrichmentItem[]> {
  const items: EnrichmentItem[] = [];
  const contravention = input.contraventionCode || '';
  const issuerId = normalizeIssuerId(input.issuer || '');

  if (!contravention) {
    // Baseline — no contravention code, emit baseline success rate
    items.push({
      source: 'london_tribunal',
      category: 'tribunal_outcome',
      content: 'Overall historical success rate: 46%',
      data: {
        percentage: 46,
        numberOfCases: 0,
        confidence: 0.3,
        statsLevel: 'baseline',
        lastUpdated: null,
      },
    });
    return items;
  }

  const MIN_CASES_ISSUER = 10;
  const MIN_CASES_CONTRAVENTION = 30;

  // Try issuer + contravention specific stats
  let issuerStats = null;
  if (issuerId) {
    issuerStats = await db.issuerContraventionStats.findUnique({
      where: {
        issuerId_contraventionCode: {
          issuerId,
          contraventionCode: contravention,
        },
      },
    });
  }

  // Fall back to contravention-only stats
  const contraventionStats = await db.contraventionStats.findUnique({
    where: { contraventionCode: contravention },
  });

  let percentage: number;
  let numberOfCases: number;
  let confidence: number;
  let statsLevel: string;
  let lastUpdated: Date | null = null;

  if (issuerStats && issuerStats.totalCases >= MIN_CASES_ISSUER) {
    percentage = Math.round(issuerStats.successRate * 100);
    numberOfCases = issuerStats.totalCases;
    confidence = Math.min(0.95, 0.5 + issuerStats.totalCases / 200);
    statsLevel = 'issuer_contravention';
    lastUpdated = issuerStats.lastUpdated;
  } else if (
    contraventionStats &&
    contraventionStats.totalCases >= MIN_CASES_CONTRAVENTION
  ) {
    percentage = Math.round(contraventionStats.successRate * 100);
    numberOfCases = contraventionStats.totalCases;
    confidence = Math.min(0.8, 0.4 + contraventionStats.totalCases / 500);
    statsLevel = 'contravention';
    lastUpdated = contraventionStats.lastUpdated;
  } else {
    // Baseline
    items.push({
      source: 'london_tribunal',
      category: 'tribunal_outcome',
      content: 'Overall historical success rate: 46%',
      data: {
        percentage: 46,
        numberOfCases: 0,
        confidence: 0.3,
        statsLevel: 'baseline',
        lastUpdated: null,
      },
    });
    return items;
  }

  // Emit tribunal outcome signal
  items.push({
    source: 'london_tribunal',
    category: 'tribunal_outcome',
    content: `Success rate for similar cases: ${percentage}% (based on ${numberOfCases} tribunal cases)`,
    data: {
      percentage,
      numberOfCases,
      confidence,
      statsLevel,
      lastUpdated: lastUpdated?.toISOString() ?? null,
    },
  });

  // Fetch patterns
  const patterns = await db.appealPattern.findMany({
    where: {
      contraventionCode: contravention,
      OR: issuerId ? [{ issuerId }, { issuerId: null }] : [{ issuerId: null }],
    },
    orderBy: { frequency: 'desc' },
  });

  patterns
    .filter((pat) => pat.outcome === 'WINNING')
    .slice(0, 5)
    .forEach((pat) => {
      items.push({
        source: 'london_tribunal',
        category: 'winning_pattern',
        content: pat.pattern.replace(/_/g, ' ').toLowerCase(),
        data: { pattern: pat.pattern, frequency: pat.frequency },
      });
    });

  patterns
    .filter((pat) => pat.outcome === 'LOSING')
    .slice(0, 5)
    .forEach((pat) => {
      items.push({
        source: 'london_tribunal',
        category: 'losing_pattern',
        content: pat.pattern.replace(/_/g, ' ').toLowerCase(),
        data: { pattern: pat.pattern, frequency: pat.frequency },
      });
    });

  return items;
}

/**
 * Collect example winning cases from London Tribunal.
 */
async function collectExampleCases(
  input: CollectorInput,
): Promise<EnrichmentItem[]> {
  if (!input.contraventionCode) return [];

  const cases = await db.londonTribunalCase.findMany({
    where: {
      normalizedContraventionCode: input.contraventionCode,
      appealDecision: 'ALLOWED',
      reasons: { not: '' },
    },
    select: { reasons: true },
    orderBy: { decisionDate: 'desc' },
    take: 2,
  });

  return cases.map((c) => ({
    source: 'london_tribunal',
    category: 'example_case',
    content:
      c.reasons.length > 500 ? `${c.reasons.slice(0, 500)}...` : c.reasons,
  }));
}

/**
 * Collect statutory ground based on challenge reason.
 */
async function collectStatutoryGround(
  input: CollectorInput,
): Promise<EnrichmentItem[]> {
  const groundId = REASON_TO_STATUTORY_GROUND[input.challengeReason];
  if (!groundId) return [];

  const ground = getStatutoryGroundById(groundId);
  if (!ground) return [];

  return [
    {
      source: 'legislation',
      category: 'statutory_ground',
      content: `${ground.label}\n${ground.description}`,
      data: { label: ground.label, description: ground.description },
    },
  ];
}

// ============================================
// Legal reference topic tag mapping
// ============================================

const REASON_TO_TOPIC_TAGS: Record<string, string[]> = {
  CONTRAVENTION_DID_NOT_OCCUR: ['representations', 'signage', 'tro'],
  NOT_VEHICLE_OWNER: ['owner-liability', 'representations'],
  VEHICLE_STOLEN: ['stolen-vehicle', 'representations'],
  HIRE_FIRM: ['hire-vehicle', 'representations'],
  EXCEEDED_AMOUNT: ['penalty-amount', 'discount-period'],
  INVALID_TMO: ['tro', 'representations'],
  PROCEDURAL_IMPROPRIETY: ['procedural', 'nto-service', 'representations'],
  UNCLEAR_SIGNAGE: ['signage', 'tro', 'representations'],
  NO_BREACH_CONTRACT: ['private-parking'],
  MITIGATING_CIRCUMSTANCES: ['representations'],
  PAYMENT_EQUIPMENT_BROKEN: ['representations', 'signage'],
  CHARGE_EXCESSIVE: ['penalty-amount', 'private-parking'],
  PAYMENT_MADE: ['representations'],
};

/**
 * Collect relevant legislation and guidance sections from LegalReference table.
 * Matches on topic tags derived from the challenge reason.
 */
async function collectLegalReferences(
  input: CollectorInput,
): Promise<EnrichmentItem[]> {
  const tags = REASON_TO_TOPIC_TAGS[input.challengeReason] || [
    'representations',
  ];

  try {
    const refs = await db.legalReference.findMany({
      where: {
        topicTags: { hasSome: tags },
      },
      orderBy: [
        { instrumentType: 'asc' }, // ACT first, then SI, then GUIDANCE
        { instrumentName: 'asc' },
        { sectionIdentifier: 'asc' },
      ],
      take: 8, // Limit to avoid overwhelming the prompt
    });

    return refs.map((ref) => ({
      source: 'legislation',
      category: 'legal_reference',
      content: [
        `${ref.instrumentName}, ${ref.sectionIdentifier}${ref.sectionTitle ? `: ${ref.sectionTitle}` : ''}`,
        ref.content.length > 800
          ? `${ref.content.slice(0, 800)}...`
          : ref.content,
      ].join('\n'),
      data: {
        instrumentName: ref.instrumentName,
        instrumentType: ref.instrumentType,
        sectionIdentifier: ref.sectionIdentifier,
        sourceUrl: ref.sourceUrl,
      },
    }));
  } catch {
    return [];
  }
}

/**
 * Collect appeal guidance from educational content for the contravention code.
 */
async function collectAppealGuidance(
  input: CollectorInput,
): Promise<EnrichmentItem[]> {
  if (!input.contraventionCode) return [];

  const codeDetails = getContraventionDetails(input.contraventionCode);
  const educationalContent = getEducationalContentForCode(
    input.contraventionCode,
    codeDetails.category,
  );

  if (!educationalContent.appealApproach?.length) return [];

  return educationalContent.appealApproach.map((tip) => ({
    source: 'contravention_guide',
    category: 'guidance',
    content: tip,
  }));
}

/**
 * Collect evidence image analysis using vision model.
 * Examines council evidence images for signage adequacy and evidence quality.
 */
async function collectEvidenceAnalysis(
  input: CollectorInput,
): Promise<EnrichmentItem[]> {
  if (!input.ticketId) return [];

  try {
    const evidenceMedia = await db.media.findMany({
      where: {
        ticketId: input.ticketId,
        source: { in: [MediaSource.EVIDENCE, MediaSource.ISSUER] },
      },
      orderBy: { createdAt: 'desc' },
      take: 4,
    });

    if (evidenceMedia.length === 0) return [];

    const imageUrls = evidenceMedia
      .filter((m) => /\.(jpeg|jpg|png|webp|gif)$/i.test(m.url))
      .map((m) => m.url);

    if (imageUrls.length === 0) return [];

    const tracedModel = getTracedModel(models.analytics, {
      properties: { feature: 'evidence_analysis' },
    });

    const EvidenceAnalysisSchema = z.object({
      signageVisible: z
        .boolean()
        .describe('Whether road signage/markings are visible in any image'),
      signageAdequate: z
        .boolean()
        .describe(
          'Whether visible signage is clear, unobstructed, and compliant',
        ),
      vehiclePositionClear: z
        .boolean()
        .describe(
          'Whether the vehicle position relative to restrictions is clearly shown',
        ),
      crossReferenceQuality: z
        .enum(['strong', 'moderate', 'weak'])
        .describe('How well the evidence supports the contravention'),
      summary: z
        .string()
        .describe('Brief 1-2 sentence assessment of evidence quality'),
    });

    const { object: analysis } = await generateObject({
      model: tracedModel,
      schema: EvidenceAnalysisSchema,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze these parking enforcement evidence images. Assess signage visibility and adequacy, whether the vehicle position is clearly shown, and overall evidence quality. Consider whether the evidence supports or weakens the enforcement case.`,
            },
            ...imageUrls.map((url) => ({
              type: 'image' as const,
              image: new URL(url),
            })),
          ],
        },
      ],
    });

    const items: EnrichmentItem[] = [];

    // Qualitative item for AI prompts
    items.push({
      source: 'evidence_images',
      category: 'evidence_analysis',
      content: [
        `Evidence analysis: ${analysis.summary}`,
        `Signage visible: ${analysis.signageVisible ? 'Yes' : 'No'}`,
        `Signage adequate: ${analysis.signageAdequate ? 'Yes' : 'No'}`,
        `Vehicle position clear: ${analysis.vehiclePositionClear ? 'Yes' : 'No'}`,
        `Evidence quality: ${analysis.crossReferenceQuality}`,
      ].join('\n'),
      data: analysis,
    });

    // If signage is inadequate, emit a modest challenge outcome boost
    if (analysis.signageVisible && !analysis.signageAdequate) {
      items.push({
        source: 'evidence_images',
        category: 'challenge_outcome',
        content:
          'Evidence images show inadequate signage — increases likelihood of successful challenge',
        weight: 0.3,
        data: {
          percentage: 55,
          numberOfCases: 0,
          confidence: 0.3,
        },
      });
    }

    return items;
  } catch {
    // Silently fail — evidence analysis is supplementary
    return [];
  }
}

/**
 * Collect street view analysis for the ticket location.
 * Fetches street-level imagery, caches to R2, and runs vision analysis.
 */
async function collectStreetViewAnalysis(
  input: CollectorInput,
): Promise<EnrichmentItem[]> {
  if (!input.ticketId) return [];

  try {
    const ticket = await db.ticket.findUnique({
      where: { id: input.ticketId },
      select: {
        id: true,
        location: true,
        media: {
          where: { source: MediaSource.STREET_VIEW },
          select: { url: true },
        },
      },
    });

    if (!ticket) return [];

    const location = ticket.location as Address | null;
    const lat = location?.coordinates?.latitude;
    const lng = location?.coordinates?.longitude;

    if (!lat || !lng || (lat === 0 && lng === 0)) return [];

    // Use cached images or fetch new ones
    let imageUrls: string[];

    if (ticket.media.length > 0) {
      imageUrls = ticket.media.map((m) => m.url);
    } else {
      const images = await fetchStreetViewImages(lat, lng);
      if (images.length === 0) return [];

      // Store to R2 and create Media records
      imageUrls = await Promise.all(
        images.map(async (img) => {
          const path = `tickets/${ticket.id}/street-view/${img.heading}.jpg`;
          const result = await put(path, img.buffer, {
            contentType: img.contentType,
          });

          await db.media.create({
            data: {
              ticketId: ticket.id,
              url: result.url,
              type: MediaType.IMAGE,
              source: MediaSource.STREET_VIEW,
              description: `Street view heading ${img.heading}°`,
            },
          });

          return result.url;
        }),
      );
    }

    if (imageUrls.length === 0) return [];

    // Run vision analysis
    const tracedModel = getTracedModel(models.analytics, {
      properties: { feature: 'street_view_analysis' },
    });

    const StreetViewAnalysisSchema = z.object({
      signageVisible: z
        .boolean()
        .describe(
          'Whether parking restriction signage is visible from street level',
        ),
      signageAdequate: z
        .boolean()
        .describe(
          'Whether signage is clear, properly positioned, and easily readable from a driver perspective',
        ),
      lineMarkingsVisible: z
        .boolean()
        .describe(
          'Whether road line markings (yellow lines, etc.) are visible',
        ),
      obstructions: z
        .string()
        .describe(
          'Any obstructions that might affect signage visibility (trees, vehicles, etc.)',
        ),
      summary: z
        .string()
        .describe(
          'Brief assessment of signage visibility from driver perspective',
        ),
    });

    const { object: analysis } = await generateObject({
      model: tracedModel,
      schema: StreetViewAnalysisSchema,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `These are Google Street View images of a location where a parking ticket was issued. Analyze the signage visibility from the driver's perspective. Look for: parking restriction signs, yellow/red lines, pay & display machines, and any obstructions that might make signage hard to see.`,
            },
            ...imageUrls.map((url) => ({
              type: 'image' as const,
              image: new URL(url),
            })),
          ],
        },
      ],
    });

    const items: EnrichmentItem[] = [];

    items.push({
      source: 'street_view',
      category: 'evidence_analysis',
      content: [
        `Street View analysis: ${analysis.summary}`,
        `Signage visible: ${analysis.signageVisible ? 'Yes' : 'No'}`,
        `Signage adequate: ${analysis.signageAdequate ? 'Yes' : 'No'}`,
        `Line markings visible: ${analysis.lineMarkingsVisible ? 'Yes' : 'No'}`,
        analysis.obstructions ? `Obstructions: ${analysis.obstructions}` : '',
      ]
        .filter(Boolean)
        .join('\n'),
      data: analysis,
    });

    // Boost challenge outcome if signage is inadequate
    if (!analysis.signageAdequate) {
      items.push({
        source: 'street_view',
        category: 'challenge_outcome',
        content:
          'Street View imagery shows inadequate or obstructed signage at this location',
        weight: 0.4,
        data: {
          percentage: 60,
          numberOfCases: 0,
          confidence: 0.35,
        },
      });
    }

    return items;
  } catch {
    return [];
  }
}

/**
 * Mapping from challenge reasons to keywords found in PCN UK expert arguments.
 * Used to detect when a user's challenge reason aligns with strong expert-backed arguments.
 */
const REASON_TO_ARGUMENT_KEYWORDS: Record<string, string[]> = {
  UNCLEAR_SIGNAGE: ['sign', 'signage', 'marking', 'line', 'cpz', 'zone'],
  CONTRAVENTION_DID_NOT_OCCUR: ['loading', 'grace', 'observation', 'bay'],
  INVALID_TMO: ['tro', 'traffic regulation', 'order'],
  PROCEDURAL_IMPROPRIETY: ['procedur', 'pcn', 'notice', 'defect', 'served'],
  MITIGATING_CIRCUMSTANCES: ['compassionate', 'emergency', 'medical'],
  PAYMENT_EQUIPMENT_BROKEN: ['meter', 'machine', 'pay and display', 'faulty'],
};

/**
 * Collect challenge arguments from PCN UK expert data.
 * Provides code-specific legal points, sign requirements, and case precedents.
 */
async function collectChallengeArguments(
  input: CollectorInput,
): Promise<EnrichmentItem[]> {
  if (!input.contraventionCode) return [];

  try {
    const args = await db.challengeArgument.findMany({
      where: { contraventionCode: input.contraventionCode },
      orderBy: { argumentType: 'asc' },
      take: 15,
    });

    if (args.length === 0) return [];

    const items: EnrichmentItem[] = args.map((arg) => ({
      source: 'pcn_uk',
      category: 'contravention_argument',
      content: `[${arg.heading}] ${arg.content}`.slice(0, 1200),
    }));

    // If the user's challenge reason matches known strong arguments for this code,
    // emit a modest challenge_outcome signal
    const keywords = REASON_TO_ARGUMENT_KEYWORDS[input.challengeReason] || [];
    if (keywords.length > 0) {
      const reasonMatches = args.filter((a) =>
        keywords.some(
          (kw) =>
            a.heading.toLowerCase().includes(kw) ||
            a.content.toLowerCase().includes(kw),
        ),
      );

      if (reasonMatches.length >= 2) {
        items.push({
          source: 'pcn_uk',
          category: 'challenge_outcome',
          content: `Expert analysis confirms strong legal grounds for this challenge reason on code ${input.contraventionCode}`,
          weight: 0.2,
          data: {
            percentage: 55,
            numberOfCases: 0,
            confidence: 0.25,
          },
        });
      }
    }

    return items;
  } catch {
    return [];
  }
}

// ============================================
// Main gather function
// ============================================

/**
 * Gather enrichment data from all collectors.
 * Returns EnrichmentItem[] in a unified format consumed by both
 * AI prompt builders and the prediction service.
 */
export default async function gatherEnrichment(
  input: CollectorInput,
): Promise<Enrichment | undefined> {
  try {
    const collectors = [
      collectTribunalStats,
      collectExampleCases,
      collectStatutoryGround,
      collectLegalReferences,
      collectAppealGuidance,
      collectEvidenceAnalysis,
      collectStreetViewAnalysis,
      collectChallengeArguments,
    ];

    const results = await Promise.allSettled(collectors.map((c) => c(input)));

    const items = results
      .filter(
        (r): r is PromiseFulfilledResult<EnrichmentItem[]> =>
          r.status === 'fulfilled',
      )
      .flatMap((r) => r.value);

    if (items.length === 0) return undefined;

    return { items };
  } catch {
    return undefined;
  }
}
