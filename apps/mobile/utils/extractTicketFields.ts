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

// One recognized OCR line. `confidence` is the engine's 0–1 score (Apple Vision
// provides it; ML Kit's plain-text path leaves it undefined → treated as 1).
export type OCRLine = { text: string; confidence?: number };

// A candidate field value from a single read, with the weight (confidence) of
// the line it was extracted from. A value appearing on multiple lines (e.g. a
// VRM printed in several places on a ticket) yields multiple candidates — that
// within-read multiplicity strengthens its vote.
export type FieldCandidate = { value: string; weight: number };

export type TicketFieldCandidates = {
  pcn: FieldCandidate[];
  vrm: FieldCandidate[];
  issuer: FieldCandidate[];
};

// Floor for a real (numeric) confidence so a low/zero-confidence candidate still
// counts as a vote (just a weak one) rather than vanishing at weight 0.
const MIN_CANDIDATE_WEIGHT = 0.01;

// Extract weighted field candidates from a single OCR pass's lines. Per-line so
// each candidate carries that line's confidence and repeated values vote more.
// The caller (useLiveTicketOCR) accumulates these weights across reads and picks
// the best-supported value per field — robust to a one-frame misread, and a
// sharper/later read can overtake an earlier weak one.
export const extractTicketFieldCandidates = (
  lines: OCRLine[],
): TicketFieldCandidates => {
  const out: TicketFieldCandidates = { pcn: [], vrm: [], issuer: [] };

  for (const line of lines) {
    // `undefined` = the engine gives no confidence (ML Kit) → neutral weight 1,
    // so Android votes by count. A real numeric confidence (Apple Vision, incl.
    // a genuine low/0 for a poor read) is kept as-is, floored to a tiny epsilon
    // so a candidate is never invisible (weight 0) — but a worst-quality read
    // still votes far weaker than a confident one, which is the whole point.
    const weight =
      line.confidence == null
        ? 1
        : Math.max(line.confidence, MIN_CANDIDATE_WEIGHT);

    const pcn = extractPcn(line.text);
    if (pcn) out.pcn.push({ value: pcn, weight });

    const vrm = extractVrm(line.text);
    if (vrm) out.vrm.push({ value: vrm, weight });

    const issuer = extractIssuer(line.text);
    if (issuer) out.issuer.push({ value: issuer, weight });
  }

  // An issuer name can straddle two OCR lines ("London Borough of" / "Lewisham").
  // If per-line matching found nothing, fall back to the whole-blob substring so
  // we don't miss it entirely.
  if (out.issuer.length === 0) {
    const issuer = extractIssuer(lines.map((l) => l.text).join('\n'));
    if (issuer) out.issuer.push({ value: issuer, weight: 1 });
  }

  return out;
};
