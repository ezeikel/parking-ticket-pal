/**
 * Extract Appeal Patterns using GPT-5.2
 *
 * This script analyzes adjudicator reasoning text to extract winning and losing
 * patterns that can guide users on the best challenge reasons.
 *
 * Usage:
 *   cd packages/db
 *   pnpm tsx scripts/extract-patterns.ts
 *
 * Options:
 *   --limit N    Process only N cases (for testing)
 *   --dry-run    Don't save to database, just print results
 *
 * TODO: Move to worker repo when Prisma is added there
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from apps/web/.env.local BEFORE importing prisma
// __dirname = packages/db/scripts, so go up 3 levels to repo root
config({ path: resolve(__dirname, '../../../apps/web/.env.local') });

// Dynamic import after env is loaded
const { prisma } = await import('../src/client.js');

const openai = new OpenAI();

// PatternOutcome values to use with Prisma
type PatternOutcomeType = 'WINNING' | 'LOSING';

// Pattern categories we want to extract
const PATTERN_CATEGORIES = [
  // === WINNING PATTERNS ===
  // Procedural/Evidence issues
  'SIGNAGE_INADEQUATE',
  'CCTV_UNCLEAR',
  'EVIDENCE_INSUFFICIENT',
  'PROCEDURAL_ERROR',
  'TMO_INVALID',
  'TIME_DISCREPANCY',
  'NOTICE_NOT_SERVED',

  // Exemptions that applied
  'LOADING_EXEMPTION',
  'PERMIT_WAS_VALID',
  'BLUE_BADGE_DISPLAYED',
  'VEHICLE_SOLD',
  'VEHICLE_STOLEN',
  'HIRE_VEHICLE',
  'EMERGENCY_SITUATION',
  'BREAKDOWN',

  // === LOSING PATTERNS ===
  // Common failure reasons
  'NO_EVIDENCE_PROVIDED',
  'LATE_APPEAL',
  'ADMITTED_CONTRAVENTION',
  'MITIGATION_ONLY',
  'SIGNAGE_WAS_ADEQUATE',
  'CCTV_CLEAR',
  'NO_LOADING_ACTIVITY',
  'PERMIT_EXPIRED',
  'PERMIT_NOT_DISPLAYED',
  'PARKED_INCORRECTLY',
  'EXCEEDED_TIME_LIMIT',
] as const;

type PatternCategory = (typeof PATTERN_CATEGORIES)[number];

// Map patterns to challenge reason recommendations
export const PATTERN_TO_CHALLENGE_REASON: Record<string, string> = {
  // Maps winning patterns to COUNCIL_CHALLENGE_REASONS
  SIGNAGE_INADEQUATE: 'PROCEDURAL_IMPROPRIETY',
  PROCEDURAL_ERROR: 'PROCEDURAL_IMPROPRIETY',
  TMO_INVALID: 'INVALID_TMO',
  NOTICE_NOT_SERVED: 'PROCEDURAL_IMPROPRIETY',
  LOADING_EXEMPTION: 'CONTRAVENTION_DID_NOT_OCCUR',
  PERMIT_WAS_VALID: 'CONTRAVENTION_DID_NOT_OCCUR',
  BLUE_BADGE_DISPLAYED: 'CONTRAVENTION_DID_NOT_OCCUR',
  VEHICLE_SOLD: 'NOT_VEHICLE_OWNER',
  VEHICLE_STOLEN: 'VEHICLE_STOLEN',
  HIRE_VEHICLE: 'HIRE_FIRM',
  CCTV_UNCLEAR: 'CONTRAVENTION_DID_NOT_OCCUR',
  EVIDENCE_INSUFFICIENT: 'CONTRAVENTION_DID_NOT_OCCUR',
  TIME_DISCREPANCY: 'CONTRAVENTION_DID_NOT_OCCUR',
};

async function extractPatternsFromCase(caseData: {
  appealDecision: string;
  reasons: string;
}): Promise<PatternCategory[]> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-5.2',
      messages: [
        {
          role: 'system',
          content: `You analyze UK parking tribunal decisions to extract key reasons for the appeal outcome.

Return a JSON object with a "patterns" array containing codes from this list ONLY:
${PATTERN_CATEGORIES.join(', ')}

Rules:
- Only include patterns that are explicitly mentioned or strongly implied in the reasoning
- Return empty array if no clear patterns found
- Maximum 3 patterns per case
- Focus on the PRIMARY reason(s) for the decision

For ALLOWED appeals, look for:
- What evidence/argument convinced the adjudicator
- What procedural errors the authority made
- What exemptions applied

For REFUSED appeals, look for:
- Why the appellant's argument failed
- What evidence was lacking
- What the appellant admitted or failed to prove`,
        },
        {
          role: 'user',
          content: `Appeal Decision: ${caseData.appealDecision}\n\nAdjudicator Reasoning:\n${caseData.reasons.slice(0, 4000)}`,
        },
      ],
      response_format: { type: 'json_object' },
      max_completion_tokens: 150,
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return [];

    const result = JSON.parse(content);
    const patterns = result.patterns || [];

    // Filter to only valid patterns
    return patterns.filter((p: string) =>
      PATTERN_CATEGORIES.includes(p as PatternCategory)
    ) as PatternCategory[];
  } catch (error) {
    console.error('Error extracting patterns:', error);
    return [];
  }
}

async function extractPatterns(options: { limit?: number; dryRun?: boolean }) {
  console.log('Starting pattern extraction...');
  console.log(`Options: limit=${options.limit || 'all'}, dryRun=${options.dryRun || false}`);
  console.log('---');

  // Get cases with reasons text
  const cases = await prisma.londonTribunalCase.findMany({
    where: {
      reasons: { not: '' },
      appealDecision: { in: ['ALLOWED', 'REFUSED'] },
      normalizedContraventionCode: { not: null },
    },
    select: {
      id: true,
      caseReference: true,
      normalizedContraventionCode: true,
      normalizedIssuerId: true,
      appealDecision: true,
      reasons: true,
    },
    take: options.limit,
  });

  console.log(`Found ${cases.length} cases to process`);

  // Track pattern frequencies for dry run output
  const patternCounts: Record<string, { winning: number; losing: number }> = {};

  // Process in batches
  const BATCH_SIZE = 10;
  let processed = 0;
  let successfulExtractions = 0;

  for (let i = 0; i < cases.length; i += BATCH_SIZE) {
    const batch = cases.slice(i, i + BATCH_SIZE);

    const results = await Promise.all(
      batch.map(async (caseData) => {
        const patterns = await extractPatternsFromCase({
          appealDecision: caseData.appealDecision,
          reasons: caseData.reasons,
        });

        return {
          caseRef: caseData.caseReference,
          contravention: caseData.normalizedContraventionCode!,
          issuer: caseData.normalizedIssuerId,
          outcome: caseData.appealDecision === 'ALLOWED' ? 'WINNING' : 'LOSING',
          patterns,
        };
      })
    );

    // Save patterns to database (unless dry run)
    for (const result of results) {
      if (result.patterns.length === 0) continue;
      successfulExtractions++;

      for (const pattern of result.patterns) {
        // Track counts
        if (!patternCounts[pattern]) {
          patternCounts[pattern] = { winning: 0, losing: 0 };
        }
        if (result.outcome === 'WINNING') {
          patternCounts[pattern].winning++;
        } else {
          patternCounts[pattern].losing++;
        }

        if (!options.dryRun) {
          try {
            await prisma.appealPattern.upsert({
              where: {
                contraventionCode_issuerId_pattern_outcome: {
                  contraventionCode: result.contravention,
                  issuerId: result.issuer,
                  pattern,
                  outcome: result.outcome as PatternOutcomeType,
                },
              },
              update: {
                frequency: { increment: 1 },
                exampleCaseRefs: { push: result.caseRef },
                lastUpdated: new Date(),
              },
              create: {
                contraventionCode: result.contravention,
                issuerId: result.issuer,
                pattern,
                outcome: result.outcome as PatternOutcome,
                frequency: 1,
                exampleCaseRefs: [result.caseRef],
              },
            });
          } catch (error) {
            // Likely unique constraint - just increment
            console.error(`Error saving pattern for ${result.caseRef}:`, error);
          }
        }
      }
    }

    processed += batch.length;
    console.log(`Processed ${processed}/${cases.length} cases (${successfulExtractions} with patterns)`);

    // Rate limit - wait between batches
    if (i + BATCH_SIZE < cases.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  // Print summary
  console.log('\n--- Pattern Extraction Summary ---');
  console.log(`Total cases processed: ${processed}`);
  console.log(`Cases with patterns extracted: ${successfulExtractions}`);

  console.log('\n--- Pattern Frequencies ---');
  const sortedPatterns = Object.entries(patternCounts).sort(
    (a, b) => b[1].winning + b[1].losing - (a[1].winning + a[1].losing)
  );

  for (const [pattern, counts] of sortedPatterns) {
    const total = counts.winning + counts.losing;
    const winRate = total > 0 ? ((counts.winning / total) * 100).toFixed(1) : '0.0';
    console.log(`  ${pattern}: ${total} total (${counts.winning} winning, ${counts.losing} losing) - ${winRate}% win rate`);
  }

  if (options.dryRun) {
    console.log('\n[DRY RUN] No changes saved to database');
  }

  console.log('\n---');
  console.log('Pattern extraction complete!');

  await prisma.$disconnect();
}

// Parse command line arguments
const args = process.argv.slice(2);
const options: { limit?: number; dryRun?: boolean } = {};

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--limit' && args[i + 1]) {
    options.limit = parseInt(args[i + 1], 10);
    i++;
  }
  if (args[i] === '--dry-run') {
    options.dryRun = true;
  }
}

extractPatterns(options).catch((error) => {
  console.error('Pattern extraction failed:', error);
  process.exit(1);
});
