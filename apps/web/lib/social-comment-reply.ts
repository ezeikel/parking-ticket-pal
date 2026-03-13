import { generateObject, generateText } from 'ai';
import { z } from 'zod';
import { models, getTracedModel } from '@/lib/ai/models';
import { BRAND_VOICE, COMMENT_TYPE_GUIDANCE } from '@/lib/brand-voice';
import type { CommentType } from '@parking-ticket-pal/db';

// ============================================================================
// Types
// ============================================================================

type ClassifyResult = {
  commentType: CommentType;
  shouldReply: boolean;
  needsFactCheck: boolean;
  reason: string;
};

type FactCheckResult = {
  factCheckSummary: string;
  isOriginalPostCorrect: boolean;
};

type ReplyResult = {
  reply: string | null;
  commentType: CommentType;
  factChecked: boolean;
  skipped: boolean;
  skipReason?: string;
};

// ============================================================================
// Classification
// ============================================================================

const classifySchema = z.object({
  commentType: z.enum([
    'AGREEMENT',
    'QUESTION',
    'CORRECTION',
    'COMBATIVE',
    'APPRECIATION',
    'EMOJI_ONLY',
    'SPAM',
    'OTHER',
  ]),
  shouldReply: z.boolean(),
  needsFactCheck: z.boolean(),
  reason: z.string(),
});

export async function classifyComment(
  commentText: string,
  postCaption: string | null,
): Promise<ClassifyResult> {
  const { object } = await generateObject({
    model: getTracedModel(models.analytics, {
      properties: { feature: 'social_comment_classify' },
    }),
    schema: classifySchema,
    prompt: `Classify this social media comment on a UK parking law content account.

Post caption: ${postCaption || '(not available)'}

Comment: "${commentText}"

Classify the comment type and decide:
1. shouldReply: Default to TRUE. Only set to false for: spam, non-English, just tagging another user with no substantive text, or genuinely offensive/hateful content. When in doubt, reply — engagement matters more than perfection. Questions should ALWAYS get a reply, even if we can only partially answer. Emoji-only comments should ALSO get a reply (shouldReply: true).
2. needsFactCheck: true ONLY when the comment disputes a specific fact in the post (dates, figures, legal references), claims something in the post is wrong, asks about specific legislation/regulations, or asks a factual question requiring current/accurate information. NOT for opinions, general agreement, appreciation, or combative comments without factual claims.
3. commentType: the best-fit category.

Be precise with needsFactCheck — most comments don't need it.`,
  });

  return object as ClassifyResult;
}

// ============================================================================
// Fact-checking (Perplexity Sonar)
// ============================================================================

export async function factCheckWithPerplexity(
  commentText: string,
  postCaption: string | null,
): Promise<FactCheckResult> {
  const { text } = await generateText({
    model: getTracedModel(models.search, {
      properties: { feature: 'social_comment_fact_check' },
    }),
    system:
      'You are a UK parking law fact-checker. Verify claims accurately and concisely.',
    prompt: `A comment on our social media post disputes or questions a factual claim. Verify what is actually correct.

Post caption: ${postCaption || '(not available)'}

Comment: "${commentText}"

Research the specific factual claim being made or questioned. Determine:
1. What is actually true based on current UK law, regulations, and facts
2. Whether the original post content is correct or the commenter is correct

Respond in this exact format:
FACTS: [Brief summary of what is actually true, with specific references if applicable]
POST_CORRECT: [true/false - whether the original post's claims are accurate]`,
  });

  const isOriginalPostCorrect = !text
    .toLowerCase()
    .includes('post_correct: false');

  return {
    factCheckSummary: text
      .replace(/^FACTS:\s*/i, '')
      .replace(/\nPOST_CORRECT:.*$/is, '')
      .trim(),
    isOriginalPostCorrect,
  };
}

// ============================================================================
// Reply generation (orchestrator)
// ============================================================================

export async function generateCommentReply({
  commentText,
  postCaption,
  platform,
}: {
  commentText: string;
  postCaption: string | null;
  platform: 'INSTAGRAM' | 'FACEBOOK';
}): Promise<ReplyResult> {
  // Step 1: Classify
  const classification = await classifyComment(commentText, postCaption);

  if (!classification.shouldReply) {
    return {
      reply: null,
      commentType: classification.commentType,
      factChecked: false,
      skipped: true,
      skipReason: classification.reason,
    };
  }

  // Step 2: Fact-check if needed
  let factCheckResult: FactCheckResult | null = null;
  if (classification.needsFactCheck) {
    factCheckResult = await factCheckWithPerplexity(commentText, postCaption);
  }

  // Step 3: Generate reply
  const typeGuidance = COMMENT_TYPE_GUIDANCE[classification.commentType] || '';

  const factCheckContext = factCheckResult
    ? `\n\nFACT-CHECK RESULTS (use these to inform your reply — do NOT mention "fact-checking" or "research"):
Verified facts: ${factCheckResult.factCheckSummary}
Our post is ${factCheckResult.isOriginalPostCorrect ? 'correct' : 'INCORRECT — acknowledge gracefully'}`
    : '';

  const { text: reply } = await generateText({
    model: getTracedModel(models.creative, {
      properties: { feature: 'social_comment_reply' },
    }),
    system: BRAND_VOICE,
    prompt: `Write a reply to this ${platform.toLowerCase()} comment on our post.

Comment type: ${classification.commentType}
Guidance for this type: ${typeGuidance}

Our post caption: ${postCaption || '(not available)'}

Their comment: "${commentText}"${factCheckContext}

Reply with ONLY the reply text. If you genuinely can't add value, reply with exactly "SKIP".`,
  });

  const trimmedReply = reply.trim();

  if (trimmedReply === 'SKIP' || trimmedReply === '') {
    return {
      reply: null,
      commentType: classification.commentType,
      factChecked: !!factCheckResult,
      skipped: true,
      skipReason: 'AI decided not to reply — no value to add',
    };
  }

  return {
    reply: trimmedReply,
    commentType: classification.commentType,
    factChecked: !!factCheckResult,
    skipped: false,
  };
}
