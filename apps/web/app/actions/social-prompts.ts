/**
 * PTP caption system-prompt tails.
 *
 * Extracted from social.ts so the drift-guard test (social.test.ts) can
 * import them without pulling in social.ts's transitive deps (Resend,
 * ElevenLabs, sharp, etc.), which would module-load and error on missing
 * env vars in the test environment.
 *
 * Each caption fn in social.ts builds its system prompt as
 * `ptpVoice(p, k) + TAIL`. The voice block carries 95% of the brand
 * rules; the tails carry the per-fn formatting and CTA guidance. Both
 * deserve drift-guard coverage. Mirrors how CC keeps its caption
 * systems in lib/ai/prompts.ts (the testable surface) separate from the
 * generator fns in app/actions/social.ts.
 *
 * Adding a new caption fn? Export its tail here and add it to
 * allComposedPrompts() in social.test.ts.
 */

export const INSTAGRAM_CAPTION_TAIL = `

Write the Instagram caption now. End with "Link in bio for the full guide 📖". Return ONLY the caption text, no labels or section headers.`;

export const LINKEDIN_CAPTION_TAIL = `

Angle it where it touches a work context (fleets, employees, HR, compliance) when the article supports it, otherwise keep it driver-relevant. End with a clear, low-key call to read the full article. Return ONLY the post text, no labels or section headers.`;

export const FACEBOOK_CAPTION_TAIL = `

Give a substantial preview (2 to 3 key points from the article). End with the blog URL on its own line. Return ONLY the post text, no labels or section headers.`;

export const FACEBOOK_REEL_CAPTION_TAIL = `

Hook on watching the video. Include the blog URL for more info. Keep it concise. Return ONLY the caption text, no labels.`;

export const TIKTOK_CAPTION_TAIL = `

Start with a strong hook or question. CTA relevant to the content (good: "Save this for later", "Follow for more UK parking tips", "Tag someone who needs this"; bad: asking about rare personal experiences). Return ONLY the caption text, no labels.`;

export const YOUTUBE_SHORTS_CAPTION_TAIL = `

Description must include the blog URL and the #Shorts hashtag (required). Focus on search discoverability.`;

export const THREADS_CAPTION_TAIL = `

Open with a thought-provoking statement or question. Include the blog URL. Return ONLY the caption text, no labels.

CRITICAL: the post MUST be under 500 characters total (Threads rejects longer posts). Aim 200 to 400 characters. If you find yourself approaching 450, stop and trim.`;

export const INSTAGRAM_REEL_CAPTION_TAIL = `

Hook on watching the video ("Watch this before you..."). Keep it shorter than a feed post. End with "Link in bio for the full guide 📖". Return ONLY the caption text, no labels.`;
