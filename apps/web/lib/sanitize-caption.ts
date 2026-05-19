/**
 * Copy sanitisation for user-facing AI-generated social captions.
 *
 * Standalone copy of the logic in Chunky Crayon's
 * @one-colored-pixel/coloring-core utils/copy.ts. PTP is a separate repo
 * with no shared dependency on that package, so the implementation is
 * duplicated here and kept BYTE-IDENTICAL in behaviour. If you change one,
 * change the other.
 *
 * Two layers of defence:
 *   1. Rule strings in the generation system prompts (model is told not to
 *      produce em dashes / markdown in the first place).
 *   2. sanitizeCaption() at the output boundary, because prompt
 *      instructions are probabilistic — a LinkedIn post once shipped with
 *      literal "# LinkedIn Post:" and "**" because the model formatted its
 *      output and nothing stripped it. LinkedIn renders no markdown.
 */

const EM_DASH = '—';

export const NO_EM_DASHES_RULE = `Never use em dashes (—) in user-facing copy. Em dashes read as AI-generated. Use commas, parentheses, or split into separate sentences instead. This applies to every word the reader sees, including hooks, body copy, captions, hashtags, and CTAs.`;

export const NO_MARKDOWN_RULE = `Output plain text only. No markdown whatsoever: no # headings, no **bold** or *italic* or __underline__, no \`code\`, no markdown links, no bullet/numbered list markers. Social platforms render none of it, so it shows up literally as "#" and "**" in the post. Use line breaks, emojis, and plain sentences for structure instead.`;

/**
 * Replace em dashes with ", " and clean up the punctuation that produces.
 *   "warm — yet firm"  → "warm, yet firm"
 *   "calm—you teach"   → "calm, you teach"
 * Also strips the doubled-comma artefact and double spaces.
 */
export function stripEmDashes(text: string): string {
  return text
    .replace(new RegExp(`\\s*${EM_DASH}\\s*`, 'g'), ', ')
    .replace(/, ,/g, ',')
    .replace(/  +/g, ' ')
    .trim();
}

/**
 * Strip markdown that social platforms render literally rather than as
 * formatting. Conservative — only removes markup syntax, never the words.
 * Preserves emojis, #hashtags (NOT markdown headings), URLs, line breaks.
 *
 * A leading "#" is only a heading when followed by space(s) then text
 * ("# LinkedIn Post:"). "#WeddingPlanning" with no space is a hashtag and
 * is kept. That distinction is why this is regex, not a markdown parser.
 */
export function stripMarkdown(text: string): string {
  return text
    .replace(/^[ \t]*#{1,6}[ \t]+/gm, '')
    .replace(/^[ \t]*[=-]{3,}[ \t]*$/gm, '')
    .replace(/(\*\*\*|___)(.+?)\1/g, '$2')
    .replace(/(\*\*|__)(.+?)\1/g, '$2')
    .replace(/(\*|_)(?=\S)(.+?)(?<=\S)\1/g, '$2')
    .replace(/```[a-zA-Z]*\n?/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '$1 $2')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^[ \t]*>[ \t]?/gm, '')
    .replace(/^[ \t]*[-*+][ \t]+/gm, '')
    .replace(/^[ \t]*\d+[.)][ \t]+/gm, '')
    .replace(/^[ \t]*([*_-])(?:[ \t]*\1){2,}[ \t]*$/gm, '')
    .trim();
}

/**
 * Full sanitiser for a social caption: strip markdown the platform won't
 * render, then normalise em/en dashes. Markdown removal first so a stray
 * dash from a converted "- list item" still gets handled. Every
 * caption-returning function passes its model output through this.
 */
export function sanitizeCaption(text: string): string {
  return stripEmDashes(stripMarkdown(text)).trim();
}
