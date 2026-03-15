import { z } from 'zod';

/**
 * A single enrichment item from any data source.
 *
 * Each collector produces an array of these. The items are consumed by:
 * - AI prompt builders (letters + auto-challenges) via `content`
 * - `calculatePrediction()` via `data` on outcome signal items
 *
 * ## Categories
 *
 * | Category               | Purpose                                          | `data` shape              |
 * |------------------------|--------------------------------------------------|---------------------------|
 * | `tribunal_outcome`     | Win rate at tribunal (London Tribunal, POPLA)    | `OutcomeSignalData`       |
 * | `challenge_outcome`    | Council/operator acceptance rate at challenge     | `OutcomeSignalData`       |
 * | `winning_pattern`      | Patterns that win at tribunal                    | `{ pattern, frequency }`  |
 * | `losing_pattern`       | Patterns that lose at tribunal                   | `{ pattern, frequency }`  |
 * | `example_case`         | Real winning case reasoning                      | (none — content only)     |
 * | `statutory_ground`     | Legal ground for the challenge                   | `{ label, description }`  |
 * | `guidance`             | How-to tips for this code                        | (none — content only)     |
 *
 * ## Prediction model
 *
 * The user-facing "success prediction" answers: "what's the chance this ticket
 * goes away if I challenge it?"
 *
 * That depends on two sequential stages:
 *   1. Council challenge — will the council/operator cancel it?
 *   2. Tribunal appeal   — if not, will the tribunal overturn it?
 *
 * The prediction service combines them:
 *   overall = P(challenge_accepted) + P(challenge_rejected) * P(tribunal_wins)
 *
 * Each stage has its own category:
 *   - `challenge_outcome` — council/operator acceptance rate data
 *   - `tribunal_outcome`  — tribunal win rate data (London Tribunal, POPLA, IAS)
 *
 * When only one stage has data (e.g. we only have tribunal stats today),
 * the prediction falls back to that single signal.
 *
 * ## Adding a new data source
 *
 * 1. Write a collector in `apps/web/utils/ai/enrichment.ts` (see existing ones).
 * 2. Add it to the `collectors` array in `gatherEnrichment()`.
 * 3. If your source has outcome data, emit the right category:
 *
 *    Tribunal data (London Tribunal, POPLA, IAS):
 *    ```ts
 *    {
 *      source: 'popla',
 *      category: 'tribunal_outcome',
 *      content: 'POPLA appeal success rate: 58% (120 cases)',
 *      weight: 0.8,
 *      data: { percentage: 58, numberOfCases: 120, confidence: 0.6 },
 *    }
 *    ```
 *
 *    Council/operator challenge data:
 *    ```ts
 *    {
 *      source: 'council_lewisham',
 *      category: 'challenge_outcome',
 *      content: 'Lewisham accepts 35% of informal challenges for this code',
 *      weight: 0.9,
 *      data: { percentage: 35, numberOfCases: 200, confidence: 0.7 },
 *    }
 *    ```
 *
 * 4. Emit any other category items (`winning_pattern`, `example_case`, etc.)
 *    and they'll automatically appear in AI prompts. Done.
 */
export const EnrichmentItemSchema = z.object({
  source: z.string(), // 'london_tribunal' | 'popla' | 'council_lewisham' | 'legislation' | 'contravention_guide' | 'user_outcomes' | etc.
  category: z.string(), // 'tribunal_outcome' | 'challenge_outcome' | 'winning_pattern' | 'losing_pattern' | 'example_case' | 'statutory_ground' | 'guidance'
  content: z.string(), // Human-readable text for prompt injection
  weight: z.number().optional(), // Relevance/reliability vs other items in same category (default 1)
  data: z.record(z.unknown()).optional(), // Machine-readable values for prediction service
});

export type EnrichmentItem = z.infer<typeof EnrichmentItemSchema>;

export const EnrichmentSchema = z.object({
  items: z.array(EnrichmentItemSchema),
});

export type Enrichment = z.infer<typeof EnrichmentSchema>;

/**
 * Machine-readable data for outcome signal items (`tribunal_outcome`, `challenge_outcome`).
 *
 * Every source that can estimate success likelihood at a particular stage
 * should put this shape in the item's `data` field.
 */
export type OutcomeSignalData = {
  percentage: number; // Estimated success percentage (0–100)
  numberOfCases: number; // Sample size behind this estimate (0 if qualitative)
  confidence: number; // 0–1, how much to trust this signal
  statsLevel?: string; // Optional provenance: 'issuer_contravention' | 'contravention' | 'baseline' | etc.
  lastUpdated?: string | null; // ISO timestamp of source data freshness
};

/**
 * Build a prompt section from enrichment items, grouping by category.
 */
export function buildEnrichmentPromptSection(enrichment: Enrichment): string {
  if (!enrichment.items.length) return '';

  const CATEGORY_HEADINGS: Record<string, string> = {
    statutory_ground: 'Statutory Ground',
    tribunal_outcome: 'Tribunal Intelligence',
    challenge_outcome: 'Challenge Intelligence',
    winning_pattern: 'Winning Patterns (lean into these)',
    losing_pattern: 'Losing Patterns (avoid these arguments)',
    example_case: 'Example Reasoning from Successful Appeals (use as inspiration, not verbatim)',
    guidance: 'Appeal Guidance for This Contravention Type',
    legal_reference: 'Relevant Legal Provisions (cite these accurately in the challenge)',
  };

  // Group items by category, preserving insertion order
  const groups = new Map<string, EnrichmentItem[]>();
  for (const item of enrichment.items) {
    const existing = groups.get(item.category);
    if (existing) {
      existing.push(item);
    } else {
      groups.set(item.category, [item]);
    }
  }

  const sections: string[] = [];
  for (const [category, items] of groups) {
    const heading = CATEGORY_HEADINGS[category] || category;
    const body = items.map((item) => `- ${item.content}`).join('\n');
    sections.push(`${heading}:\n${body}`);
  }

  return sections.join('\n\n');
}
