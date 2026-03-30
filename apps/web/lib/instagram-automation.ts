import { db } from '@parking-ticket-pal/db';
import { createServerLogger } from '@/lib/logger';
import { SITE_URL as DEFAULT_SITE_URL } from '@/constants';

const logger = createServerLogger({ action: 'instagram-automation' });

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || DEFAULT_SITE_URL;
const { INSTAGRAM_ACCOUNT_ID } = process.env;
const PAGE_ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

/**
 * Append UTM tracking params to a blog URL.
 * utm_source=instagram, utm_medium=comment_dm, utm_campaign=reel_blog_link
 * utm_content differentiates news vs tribunal vs generic.
 */
function appendUtmParams(url: string, contentType: string | null): string {
  const parsed = new URL(url);
  parsed.searchParams.set('utm_source', 'instagram');
  parsed.searchParams.set('utm_medium', 'comment_dm');
  parsed.searchParams.set('utm_campaign', 'reel_blog_link');
  parsed.searchParams.set(
    'utm_content',
    contentType?.toLowerCase() || 'generic',
  );
  return parsed.toString();
}

// ============================================================================
// Varied comment replies — rotates to look natural
// ============================================================================

const COMMENT_REPLIES = [
  "We've sent you the full story - check your DMs! 📩",
  'Full breakdown heading your way - check your DMs! 💬',
  'On its way! Check your DMs for the full story 📬',
  'Just sent it over - check your DMs! 🔔',
  'Done! The full article is in your DMs 📨',
];

function getRandomCommentReply(username: string): string {
  const reply =
    COMMENT_REPLIES[Math.floor(Math.random() * COMMENT_REPLIES.length)];
  return `@${username} ${reply}`;
}

// ============================================================================
// Graph API helpers
// ============================================================================

/**
 * Reply to a comment on Instagram.
 * POST /{comment-id}/replies
 */
export async function replyToComment(
  commentId: string,
  message: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v24.0/${commentId}/replies`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          access_token: PAGE_ACCESS_TOKEN,
        }),
      },
    );
    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Comment reply failed: ${JSON.stringify(data)}`);
    }

    return { success: true };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('Failed to reply to comment', { commentId }, err);
    return { success: false, error: err.message };
  }
}

/**
 * Send a text DM to an Instagram user.
 * POST /{ig-account-id}/messages
 */
async function sendTextDM(
  recipientId: string,
  text: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!INSTAGRAM_ACCOUNT_ID) {
      throw new Error('INSTAGRAM_ACCOUNT_ID not configured');
    }

    console.log('[ig-auto] sendTextDM:', {
      recipientId,
      textPreview: text.slice(0, 50),
    });

    const response = await fetch(
      `https://graph.facebook.com/v24.0/${INSTAGRAM_ACCOUNT_ID}/messages`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: { id: recipientId },
          message: { text },
          access_token: PAGE_ACCESS_TOKEN,
        }),
      },
    );
    const data = await response.json();
    console.log('[ig-auto] sendTextDM response:', {
      ok: response.ok,
      status: response.status,
      data,
    });

    if (!response.ok) {
      throw new Error(`DM send failed: ${JSON.stringify(data)}`);
    }

    return { success: true };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('[ig-auto] sendTextDM error:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Send a DM with a URL button (generic template).
 * Uses the Instagram Messaging API generic template format.
 */
async function sendButtonDM(
  recipientId: string,
  text: string,
  buttonTitle: string,
  buttonUrl: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!INSTAGRAM_ACCOUNT_ID) {
      throw new Error('INSTAGRAM_ACCOUNT_ID not configured');
    }

    const response = await fetch(
      `https://graph.facebook.com/v24.0/${INSTAGRAM_ACCOUNT_ID}/messages`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: { id: recipientId },
          message: {
            attachment: {
              type: 'template',
              payload: {
                template_type: 'generic',
                elements: [
                  {
                    title: text,
                    buttons: [
                      {
                        type: 'web_url',
                        url: buttonUrl,
                        title: buttonTitle,
                      },
                    ],
                  },
                ],
              },
            },
          },
          access_token: PAGE_ACCESS_TOKEN,
        }),
      },
    );
    const data = await response.json();

    if (!response.ok) {
      // Fall back to plain text if template not supported
      logger.warn('Button DM failed, falling back to text', {
        recipientId,
        error: JSON.stringify(data),
      });
      return await sendTextDM(recipientId, `${text}\n\n${buttonUrl}`);
    }

    return { success: true };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('Failed to send button DM', { recipientId }, err);
    // Fall back to text
    return sendTextDM(recipientId, `${text}\n\n${buttonUrl}`);
  }
}

/**
 * Like a comment on Instagram or Facebook.
 * POST /{comment-id}/likes
 */
export async function likeComment(
  commentId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v24.0/${commentId}/likes`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_token: PAGE_ACCESS_TOKEN,
        }),
      },
    );
    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Like comment failed: ${JSON.stringify(data)}`);
    }

    return { success: true };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('Failed to like comment', { commentId }, err);
    return { success: false, error: err.message };
  }
}

/**
 * Fetch the caption for an Instagram post.
 * GET /{media-id}?fields=caption
 */
export async function fetchInstagramPostCaption(
  mediaId: string,
): Promise<string | null> {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v24.0/${mediaId}?fields=caption&access_token=${PAGE_ACCESS_TOKEN}`,
    );
    const data = await response.json();

    if (!response.ok) {
      logger.warn('Failed to fetch IG post caption', {
        mediaId,
        error: JSON.stringify(data),
      });
      return null;
    }

    return data.caption || null;
  } catch (_error) {
    logger.warn('Error fetching IG post caption', { mediaId });
    return null;
  }
}

/**
 * Fetch the message for a Facebook post.
 * GET /{post-id}?fields=message
 */
export async function fetchFacebookPostMessage(
  postId: string,
): Promise<string | null> {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v24.0/${postId}?fields=message&access_token=${PAGE_ACCESS_TOKEN}`,
    );
    const data = await response.json();

    if (!response.ok) {
      logger.warn('Failed to fetch FB post message', {
        postId,
        error: JSON.stringify(data),
      });
      return null;
    }

    return data.message || null;
  } catch (_error) {
    logger.warn('Error fetching FB post message', { postId });
    return null;
  }
}

/**
 * Fetch details of a Facebook comment (to check authorship for thread replies).
 */
export async function fetchFacebookCommentDetails(commentId: string): Promise<{
  id: string;
  message: string;
  fromId: string;
  fromName: string;
} | null> {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v24.0/${commentId}?fields=id,message,from&access_token=${PAGE_ACCESS_TOKEN}`,
    );
    const data = await response.json();

    if (!response.ok || !data.from) {
      logger.warn('Failed to fetch FB comment details', {
        commentId,
        error: JSON.stringify(data),
      });
      return null;
    }

    return {
      id: data.id,
      message: data.message || '',
      fromId: data.from.id,
      fromName: data.from.name || '',
    };
  } catch (_error) {
    logger.warn('Error fetching FB comment details', { commentId });
    return null;
  }
}

/**
 * Fetch a Facebook comment's parent comment (if it's a threaded reply).
 * Returns null if the comment is top-level (no parent) or on error.
 * Uses `parent` field which returns the parent comment object for nested replies.
 */
export async function fetchFacebookCommentParent(commentId: string): Promise<{
  parentId: string;
  parentMessage: string;
  parentFromId: string;
} | null> {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v24.0/${commentId}?fields=parent.fields(id,message,from)&access_token=${PAGE_ACCESS_TOKEN}`,
    );
    const data = await response.json();

    if (!response.ok) {
      logger.warn('Failed to fetch FB comment parent', {
        commentId,
        error: JSON.stringify(data),
      });
      return null;
    }

    // Top-level comments have no parent field
    if (!data.parent) {
      return null;
    }

    return {
      parentId: data.parent.id,
      parentMessage: data.parent.message || '',
      parentFromId: data.parent.from?.id || '',
    };
  } catch (_error) {
    logger.warn('Error fetching FB comment parent', { commentId });
    return null;
  }
}

/**
 * Reply to a comment on Facebook.
 * POST /{comment-id}/comments (FB uses /comments not /replies)
 */
export async function replyToFacebookComment(
  commentId: string,
  message: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v24.0/${commentId}/comments`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          access_token: PAGE_ACCESS_TOKEN,
        }),
      },
    );
    const data = await response.json();

    if (!response.ok) {
      throw new Error(`FB comment reply failed: ${JSON.stringify(data)}`);
    }

    return { success: true };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('Failed to reply to FB comment', { commentId }, err);
    return { success: false, error: err.message };
  }
}

// ============================================================================
// DM flow — mirrors ManyChat's multi-step approach
// ============================================================================

/**
 * Send the full DM sequence:
 * 1. Opening DM with context about the story
 * 2. Follow CTA asking them to follow before getting the link
 * 3. The actual blog link with a button
 *
 * Small delays between messages so they arrive in order and feel natural.
 */
async function sendDMSequence(
  recipientId: string,
  username: string,
  blogUrl: string,
  hasSpecificPost: boolean,
): Promise<{ success: boolean; error?: string }> {
  // Step 1: Opening DM — warm greeting + context
  const openingMessage = hasSpecificPost
    ? `Hey ${username}! 👋 Here's the full breakdown of the story from the reel you just watched. Tap the link below to read it on our blog 👇`
    : `Hey ${username}! 👋 We've got loads of in-depth articles about parking tickets, tribunal cases, and your rights as a driver. Here's a link to our blog 👇`;

  const openingResult = await sendTextDM(recipientId, openingMessage);
  if (!openingResult.success) {
    return openingResult;
  }

  // Small delay so messages arrive in order
  // eslint-disable-next-line no-promise-executor-return
  await new Promise((r) => setTimeout(r, 1500));

  // Step 2: Follow CTA — encourage them to follow for more content
  const followMessage =
    "We post parking tips, tribunal stories, and ways to fight unfair fines every day 🚗\n\nGive us a follow so you never miss one!\n\nThe link's coming right up 👇";

  const followResult = await sendTextDM(recipientId, followMessage);
  if (!followResult.success) {
    logger.warn('Follow CTA DM failed, still sending link', {
      recipientId,
      error: followResult.error,
    });
  }

  // eslint-disable-next-line no-promise-executor-return
  await new Promise((r) => setTimeout(r, 2000));

  // Step 3: The actual blog link with a button
  const buttonResult = await sendButtonDM(
    recipientId,
    hasSpecificPost
      ? 'Here you go — the full story:'
      : 'Check out our latest articles:',
    'Read full story 📖',
    blogUrl,
  );

  return buttonResult;
}

// ============================================================================
// Main handler
// ============================================================================

/**
 * Handle a trigger comment ("PTP" or "LINK") on an Instagram post.
 *
 * Flow:
 * 1. Look up blog post mapping for this IG media
 * 2. Reply to the comment (varied responses)
 * 3. Send multi-step DM sequence (opening, follow CTA, link)
 */

export async function handleTriggerComment({
  commentId,
  commenterId,
  commenterUsername,
  mediaId,
}: {
  commentId: string;
  commenterId: string;
  commenterUsername: string;
  mediaId: string;
}): Promise<void> {
  console.log('[ig-auto] handleTriggerComment called:', {
    commentId,
    commenterId,
    commenterUsername,
    mediaId,
  });

  // Look up the blog post for this Instagram media
  const mapping = await db.instagramPostBlogMapping.findUnique({
    where: { instagramMediaId: mediaId },
  });
  console.log(
    '[ig-auto] Blog mapping:',
    mapping ? { slug: mapping.blogPostSlug, url: mapping.blogPostUrl } : 'none',
  );

  const hasSpecificPost = !!mapping;
  const rawBlogUrl = mapping?.blogPostUrl ?? `${SITE_URL}/blog`;
  const blogUrl = appendUtmParams(rawBlogUrl, mapping?.contentType ?? null);
  console.log('[ig-auto] Blog URL:', blogUrl);

  // Reply to the comment with a varied response
  const commentReply = getRandomCommentReply(commenterUsername);
  console.log('[ig-auto] Replying to comment:', { commentId, commentReply });
  const replyResult = await replyToComment(commentId, commentReply);
  console.log('[ig-auto] Comment reply result:', replyResult);

  if (!replyResult.success) {
    console.warn(
      '[ig-auto] Comment reply failed, still attempting DM sequence:',
      replyResult.error,
    );
  }

  // Send the multi-step DM sequence
  console.log('[ig-auto] Starting DM sequence:', {
    commenterId,
    commenterUsername,
    blogUrl,
    hasSpecificPost,
  });
  const dmResult = await sendDMSequence(
    commenterId,
    commenterUsername,
    blogUrl,
    hasSpecificPost,
  );
  console.log('[ig-auto] DM sequence result:', dmResult);

  if (!dmResult.success) {
    console.error('[ig-auto] DM sequence failed:', dmResult.error);
  }

  console.log('[ig-auto] Trigger comment handled:', {
    commentId,
    mediaId,
    blogUrl,
    hasSpecificPost,
    replySuccess: replyResult.success,
    dmSuccess: dmResult.success,
  });
}
