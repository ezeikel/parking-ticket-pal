'use server';

import { db } from '@parking-ticket-pal/db';
import type { EnrichmentItem, Enrichment } from '@parking-ticket-pal/types';
import { getStatutoryGroundById } from '@/constants/statutory-grounds';
import { getEducationalContentForCode } from '@/data/contravention-codes/educational-content';
import { getContraventionDetails } from '@parking-ticket-pal/constants';

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
