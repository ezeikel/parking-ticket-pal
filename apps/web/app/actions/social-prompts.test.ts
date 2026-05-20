/**
 * Drift guard for the composed PTP social prompts.
 *
 * Why this test exists: PTP's brand-voice cores (PTP_BRAND_VOICE_CORE,
 * ptpPlatformAdapter, ptpContentTypeAdapter) define hard rules — British
 * English, no corporate-speak, no "UK parking law" framing (we're a
 * knowledgeable friend, not a solicitor), no em/en dashes (read as
 * AI-generated). The per-caption system-prompt tails added after the
 * voice block (e.g. INSTAGRAM_CAPTION_TAIL) are where drift has bitten:
 * a LinkedIn first-comment briefly read "More on UK parking law" until
 * caught manually, em dashes have appeared in CTA exemplars, etc.
 *
 * This composes the full system prompt each PTP caption fn would
 * actually send to the model (`ptpVoice(p, k) + TAIL`) and asserts the
 * voice rules hold across every combo.
 *
 * NOT exhaustive — explicitly designed to catch the categories of
 * drift that have already bitten us once. Add new rules as we catch
 * new drift; mirrors CC's prompts.test.ts pattern.
 *
 * Hard fails (the build breaks) on em dashes, en dashes, "UK parking
 * law" / "UK driving law" CTAs, and US spellings in body copy. Soft
 * warns on corporate-speak clichés worth reviewing but not breaking
 * the build over.
 */
import { describe, it, expect } from 'vitest';
import {
  PTP_BRAND_VOICE_CORE,
  ptpVoice,
  type PTPPlatform,
  type PTPContentType,
} from '@/lib/brand-voice';
import {
  INSTAGRAM_CAPTION_TAIL,
  LINKEDIN_CAPTION_TAIL,
  FACEBOOK_CAPTION_TAIL,
  FACEBOOK_REEL_CAPTION_TAIL,
  TIKTOK_CAPTION_TAIL,
  YOUTUBE_SHORTS_CAPTION_TAIL,
  THREADS_CAPTION_TAIL,
  INSTAGRAM_REEL_CAPTION_TAIL,
} from './social-prompts';

/**
 * The voice core intentionally names the banned things inside its own
 * "NEVER" list ("never corporate-speak", "no US spelling", etc.). Strip
 * the core copy before scanning so we're checking the rest of the
 * prompt's *advice and exemplars*, not the rule statement itself.
 */
const stripMetaStrings = (s: string): string =>
  s.replaceAll(PTP_BRAND_VOICE_CORE, '');

type Composed = { name: string; prompt: string };

/**
 * Every realistic system prompt PTP composes today. If a new caption
 * fn is added, export its TAIL from social.ts and add the (platform,
 * content, tail) tuple here so the drift guard covers it.
 *
 * The interpolated `Title: / Summary: / Blog URL:` lines that some fns
 * tack on at runtime are NOT included — they're per-post variable
 * content, not voice copy, and not where drift happens.
 */
const allComposedPrompts = (): Composed[] => {
  const entries: ReadonlyArray<{
    name: string;
    platform: PTPPlatform;
    content: PTPContentType;
    tail: string;
  }> = [
    {
      name: 'IG blog_promo',
      platform: 'instagram',
      content: 'blog_promo',
      tail: INSTAGRAM_CAPTION_TAIL,
    },
    {
      name: 'LinkedIn blog_promo',
      platform: 'linkedin',
      content: 'blog_promo',
      tail: LINKEDIN_CAPTION_TAIL,
    },
    {
      name: 'Facebook blog_promo',
      platform: 'facebook',
      content: 'blog_promo',
      tail: FACEBOOK_CAPTION_TAIL,
    },
    {
      name: 'Facebook reel',
      platform: 'facebook',
      content: 'reel',
      tail: FACEBOOK_REEL_CAPTION_TAIL,
    },
    {
      name: 'TikTok reel',
      platform: 'tiktok',
      content: 'reel',
      tail: TIKTOK_CAPTION_TAIL,
    },
    {
      name: 'YouTube Shorts reel',
      platform: 'youtube_shorts',
      content: 'reel',
      tail: YOUTUBE_SHORTS_CAPTION_TAIL,
    },
    {
      name: 'Threads blog_promo',
      platform: 'threads',
      content: 'blog_promo',
      tail: THREADS_CAPTION_TAIL,
    },
    {
      name: 'IG reel',
      platform: 'instagram',
      content: 'reel',
      tail: INSTAGRAM_REEL_CAPTION_TAIL,
    },
  ];

  // Also include each tail standalone (catches drift in the tail copy
  // even before the voice block contextualises it).
  const out: Composed[] = entries.flatMap((e) => [
    { name: `${e.name} (composed)`, prompt: ptpVoice(e.platform, e.content) + e.tail },
    { name: `${e.name} (tail only)`, prompt: e.tail },
  ]);

  return out;
};

describe('PTP prompt drift guard — hard rules', () => {
  const prompts = allComposedPrompts();

  it.each(prompts)('no em dashes in the model-facing copy: $name', ({ prompt }) => {
    const scanned = stripMetaStrings(prompt);
    // sanitizeCaption strips em dashes from output, but if the prompt
    // itself models the rhythm the model copies it. Same rule both ends.
    expect(scanned, 'em dash present in prompt copy').not.toContain('—');
  });

  it.each(prompts)('no en dashes in the model-facing copy: $name', ({ prompt }) => {
    const scanned = stripMetaStrings(prompt);
    // En dashes drift in from copy-paste / AI output describing numeric
    // ranges ("150–220 words"). Same family as em dashes.
    expect(scanned, 'en dash present in prompt copy').not.toContain('–');
  });

  it.each(prompts)(
    'no "UK parking law" / "UK driving law" CTAs in the model-facing copy: $name',
    ({ prompt }) => {
      const scanned = stripMetaStrings(prompt);
      // PTP's positioning is "knowledgeable friend in UK parking law" —
      // we DO know the law, but we don't lead with the word "law" in
      // user-facing CTAs (reads as solicitor-adjacent, off-brand). This
      // drift bit us in a LinkedIn first-comment that said "More on UK
      // parking law", since fixed to "More UK parking guides and tools".
      expect(scanned, '"UK parking law" CTA in prompt copy').not.toMatch(
        /\bUK parking law\b/i,
      );
      expect(scanned, '"UK driving law" CTA in prompt copy').not.toMatch(
        /\bUK driving law\b/i,
      );
    },
  );

  it.each(prompts)(
    'no US spellings of common words in body copy: $name',
    ({ prompt }) => {
      const scanned = stripMetaStrings(prompt);
      // PTP is British English throughout (pavement, council, boot,
      // kerb, tyre, colour, organise). Catch the common drift words.
      // Hashtags and proper nouns ARE allowed to use whatever form they
      // actually exist in (#UKParking is fine), so we require a lower-
      // case word boundary check on the non-hashtag forms.
      const usSpellings: { word: string; uk: string }[] = [
        { word: 'sidewalk', uk: 'pavement' },
        { word: 'trunk', uk: 'boot' },
        { word: 'license plate', uk: 'number plate' },
        { word: 'parking lot', uk: 'car park' },
      ];
      for (const { word } of usSpellings) {
        expect(
          scanned.toLowerCase(),
          `US spelling "${word}" present`,
        ).not.toContain(word);
      }
    },
  );
});

describe('PTP prompt drift guard — soft review (warnings, do not fail)', () => {
  // These don't fail the build — they print to stderr so they show up
  // in CI logs and pre-commit output as "hey, you might want to look".
  // Promote a pattern to a hard rule once the rule is settled. Mirrors
  // CC's drift-guard convention.
  const borderlinePatterns: { name: string; pattern: RegExp }[] = [
    {
      name: 'corporate cliché "in today\'s fast-paced"',
      pattern: /in today's fast-paced/i,
    },
    { name: 'marketing cliché "unlock"', pattern: /\bunlock(?:s|ing)?\b/i },
    {
      name: 'marketing cliché "game.?changer"',
      pattern: /\bgame.?changer\b/i,
    },
    {
      name: 'corporate filler "empower"',
      pattern: /\bempower(?:s|ed|ing|ment)?\b/i,
    },
    {
      name: 'engagement-bait "don\'t miss out"',
      pattern: /don't miss out/i,
    },
  ];

  it('soft-warns on borderline phrases in any composed prompt', () => {
    const findings: string[] = [];
    for (const { name, prompt } of allComposedPrompts()) {
      const scanned = stripMetaStrings(prompt);
      for (const { name: ruleName, pattern } of borderlinePatterns) {
        if (pattern.test(scanned)) {
          findings.push(`  [${name}] matched borderline rule: ${ruleName}`);
        }
      }
    }
    if (findings.length > 0) {
      // eslint-disable-next-line no-console
      console.warn(
        `\n[prompt-drift-guard] ${findings.length} borderline match(es):\n${findings.join('\n')}\n(soft warning — fix or promote to hard rule)`,
      );
    }
    // Always passes — borderline matches are review-worthy, not blocking.
    expect(true).toBe(true);
  });
});
