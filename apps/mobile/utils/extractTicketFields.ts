import {
  LOCAL_AUTHORITY_IDS,
  PRIVATE_COMPANIES,
  TRANSPORT_AUTHORITIES,
  slugToDisplayName,
} from '@parking-ticket-pal/constants';

export type ExtractedTicketFields = {
  pcn?: string;
  vrm?: string;
  issuer?: string;
};

// Format heuristics mirror the server-side OpenAI extraction prompt
// (apps/web/lib/ai/prompts.ts lines 112-124) so live preview and final
// extraction agree on what counts as a valid field.
const PCN_COUNCIL_REGEX = /\b[A-Z]{2}\d{6,10}\b/;
const PCN_NUMERIC_NEAR_KEYWORD_REGEX =
  /(?:pcn|penalty\s*charge|penalty\s*notice|notice\s*no|reference|ref\.?\s*no|ref)[^\d]{0,20}(\d{8,12})\b/i;

// UK plate styles. Current (post-2001): two letters + two digits + three letters.
// Older prefix style: one letter + 1-3 digits + three letters.
const VRM_CURRENT_REGEX = /\b([A-Z]{2}\d{2})\s?([A-Z]{3})\b/;
const VRM_PREFIX_REGEX = /\b([A-Z]\d{1,3})\s?([A-Z]{3})\b/;

// Build issuer candidates once at module load: display name + lowercased
// version for case-insensitive substring matching.
const ISSUER_CANDIDATES: ReadonlyArray<{ name: string; needle: string }> = [
  ...LOCAL_AUTHORITY_IDS.map((id) => {
    const name = slugToDisplayName(id);
    return { name, needle: name.toLowerCase() };
  }),
  ...PRIVATE_COMPANIES.map((c) => ({ name: c.name, needle: c.name.toLowerCase() })),
  ...TRANSPORT_AUTHORITIES.map((t) => ({ name: t.name, needle: t.name.toLowerCase() })),
];

const extractPcn = (text: string): string | undefined => {
  // Upper-case for the council pattern; OCR mixes case sometimes.
  const upper = text.toUpperCase();
  const council = upper.match(PCN_COUNCIL_REGEX);
  if (council) return council[0];

  const numeric = text.match(PCN_NUMERIC_NEAR_KEYWORD_REGEX);
  if (numeric) return numeric[1];

  return undefined;
};

const extractVrm = (text: string): string | undefined => {
  const upper = text.toUpperCase();
  const current = upper.match(VRM_CURRENT_REGEX);
  if (current) return `${current[1]} ${current[2]}`;

  const prefix = upper.match(VRM_PREFIX_REGEX);
  if (prefix) return `${prefix[1]} ${prefix[2]}`;

  return undefined;
};

const extractIssuer = (text: string): string | undefined => {
  const lower = text.toLowerCase();
  // First hit wins. Longest-needle-first to prefer "London Borough of Lewisham"
  // over "Lewisham" when both could match.
  const sorted = [...ISSUER_CANDIDATES].sort((a, b) => b.needle.length - a.needle.length);
  for (const candidate of sorted) {
    if (lower.includes(candidate.needle)) return candidate.name;
  }
  return undefined;
};

export const extractTicketFields = (text: string): ExtractedTicketFields => {
  if (!text) return {};
  return {
    pcn: extractPcn(text),
    vrm: extractVrm(text),
    issuer: extractIssuer(text),
  };
};
