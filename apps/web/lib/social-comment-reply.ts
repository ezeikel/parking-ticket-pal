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
  likeOnly?: boolean;
};

// ============================================================================
// Post context builder
// ============================================================================

function buildPostContext({
  postCaption,
  postTranscript,
  visualContext,
}: {
  postCaption: string | null;
  postTranscript?: string | null;
  visualContext?: string | null;
}): string {
  const parts: string[] = [`Post caption: ${postCaption || '(not available)'}`];

  if (postTranscript) {
    parts.push(
      `Full voiceover transcript (what was said in the video):\n${postTranscript}`,
    );
  }

  if (visualContext) {
    parts.push(
      `VISUAL NOTE: This is a video reel with AI-generated clay diorama illustrations. The visuals are illustrative and may not perfectly match every detail of the voiceover narrative. If a commenter points out the visuals don't match the story, acknowledge it honestly rather than arguing about what the visual shows. Never claim the visual shows something it doesn't.\n${visualContext}`,
    );
  }

  return parts.join('\n\n');
}

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
  postContext?: {
    postTranscript?: string | null;
    visualContext?: string | null;
  },
): Promise<ClassifyResult> {
  const contextBlock = buildPostContext({
    postCaption,
    postTranscript: postContext?.postTranscript,
    visualContext: postContext?.visualContext,
  });

  const { object } = await generateObject({
    model: getTracedModel(models.analytics, {
      properties: { feature: 'social_comment_classify' },
    }),
    schema: classifySchema,
    prompt: `Classify this social media comment on a UK parking law content account.

${contextBlock}

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
// Thread reply classification
// ============================================================================

const threadClassifySchema = z.object({
  action: z.enum(['LIKE_ONLY', 'REPLY']),
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
  reason: z.string(),
});

async function classifyThreadReply(
  commentText: string,
  ourPreviousReply: string,
  postCaption: string | null,
  postTranscript?: string | null,
  visualContext?: string | null,
): Promise<{
  action: 'LIKE_ONLY' | 'REPLY';
  commentType: CommentType;
  reason: string;
}> {
  const { object } = await generateObject({
    model: getTracedModel(models.analytics, {
      properties: { feature: 'social_thread_classify' },
    }),
    schema: threadClassifySchema,
    prompt: `This is a follow-up reply to one of our previous comments on a UK parking law post. We already engaged with this person once. Decide whether to just like their reply or respond with a text reply.

${buildPostContext({ postCaption, postTranscript, visualContext })}
Our previous reply: "${ourPreviousReply}"
Their follow-up: "${commentText}"

Default action is LIKE_ONLY. Only choose REPLY if:
1. They asked a direct follow-up question that needs answering
2. They pointed out we were specifically wrong about something factual
3. They shared useful additional info worth a brief acknowledgement

Choose LIKE_ONLY for: "thanks", "ok", "makes sense", general agreement, emojis, tagging friends, combative pushback, opinions, or anything that doesn't need a text response. When in doubt, LIKE_ONLY.`,
  });

  return object as {
    action: 'LIKE_ONLY' | 'REPLY';
    commentType: CommentType;
    reason: string;
  };
}

// ============================================================================
// Reply generation (orchestrator)
// ============================================================================

export async function generateCommentReply({
  commentText,
  postCaption,
  postTranscript,
  visualContext,
  platform,
  threadContext,
}: {
  commentText: string;
  postCaption: string | null;
  postTranscript?: string | null;
  visualContext?: string | null;
  platform: 'INSTAGRAM' | 'FACEBOOK';
  threadContext?: {
    isThreadReply: boolean;
    ourPreviousReply: string | null;
  };
}): Promise<ReplyResult> {
  const contextBlock = buildPostContext({
    postCaption,
    postTranscript,
    visualContext,
  });
  // Thread replies: classify with like-only bias
  if (threadContext?.isThreadReply && threadContext.ourPreviousReply) {
    const threadClassification = await classifyThreadReply(
      commentText,
      threadContext.ourPreviousReply,
      postCaption,
      postTranscript,
      visualContext,
    );

    if (threadClassification.action === 'LIKE_ONLY') {
      return {
        reply: null,
        commentType: threadClassification.commentType,
        factChecked: false,
        skipped: false,
        likeOnly: true,
      };
    }

    // AI decided to reply — generate a short thread reply
    const { text: reply } = await generateText({
      model: getTracedModel(models.creative, {
        properties: { feature: 'social_thread_reply' },
      }),
      system: BRAND_VOICE,
      prompt: `Write a brief follow-up reply on ${platform.toLowerCase()}. This is a continued conversation — we already replied once so keep it SHORT (one sentence max). Don't repeat what you already said.

${contextBlock}
Our previous reply: "${threadContext.ourPreviousReply}"
Their follow-up: "${commentText}"

Reply type: ${threadClassification.commentType}

Reply with ONLY the reply text. If you can't add value, reply with exactly "SKIP".`,
    });

    const trimmedReply = reply.trim();
    if (trimmedReply === 'SKIP' || trimmedReply === '') {
      return {
        reply: null,
        commentType: threadClassification.commentType,
        factChecked: false,
        skipped: false,
        likeOnly: true,
      };
    }

    return {
      reply: trimmedReply,
      commentType: threadClassification.commentType,
      factChecked: false,
      skipped: false,
    };
  }

  // Standard top-level comment flow
  // Step 1: Classify
  const classification = await classifyComment(commentText, postCaption, {
    postTranscript,
    visualContext,
  });

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

${contextBlock}

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
