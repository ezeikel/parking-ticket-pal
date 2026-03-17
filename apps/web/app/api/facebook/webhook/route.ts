/* eslint-disable no-restricted-syntax, no-continue */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@parking-ticket-pal/db';
import { createServerLogger } from '@/lib/logger';
import {
  handleTriggerComment,
  fetchInstagramPostCaption,
  fetchFacebookPostMessage,
} from '@/lib/instagram-automation';

const log = createServerLogger({ action: 'facebook-webhook' });

const VERIFY_TOKEN =
  process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN || 'ptp-secret-verify';

/** Our own Instagram account ID — ignore comments from ourselves */
const OWN_IG_ACCOUNT_ID = process.env.INSTAGRAM_ACCOUNT_ID;

/** Our own Facebook Page ID — ignore comments from ourselves */
const { FACEBOOK_PAGE_ID } = process.env;

/** Comment text patterns that trigger the DM automation */
const TRIGGER_PATTERNS = /^(ptp|link)$/i;

/**
 * Queue a comment for AI-powered reply.
 * Deduplicates on commentId (unique constraint) and adds a random delay of 2-5 min.
 */
async function queueCommentForReply({
  platform,
  commentId,
  postId,
  authorId,
  authorUsername,
  commentText,
  postCaption,
}: {
  platform: 'INSTAGRAM' | 'FACEBOOK';
  commentId: string;
  postId: string;
  authorId: string;
  authorUsername: string | null;
  commentText: string;
  postCaption: string | null;
}): Promise<void> {
  const delayMs = (120 + Math.random() * 180) * 1000; // 2-5 minutes
  const processAfter = new Date(Date.now() + delayMs);

  try {
    await db.socialCommentQueue.create({
      data: {
        platform,
        commentId,
        postId,
        authorId,
        authorUsername,
        commentText,
        postCaption,
        processAfter,
      },
    });
    log.info('Comment queued for AI reply', {
      platform,
      commentId,
      postId,
      processAfter: processAfter.toISOString(),
    });
  } catch (error) {
    // Unique constraint violation = duplicate webhook, safe to ignore
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      log.info('Duplicate comment ignored', { commentId });
      return;
    }
    throw error;
  }
}

export const GET = async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    log.info('Webhook verified');
    return new NextResponse(challenge, { status: 200 });
  }
  log.warn('Webhook verification failed');
  return new NextResponse('Verification failed', { status: 403 });
};

export const POST = async (req: NextRequest) => {
  const debugLog: string[] = [];

  try {
    const body = await req.json();
    debugLog.push(`[webhook] FULL BODY: ${JSON.stringify(body)}`);

    // ====================================================================
    // Instagram comments
    // ====================================================================
    if (body.object === 'instagram') {
      const promises: Promise<void>[] = [];

      for (const entry of body.entry || []) {
        debugLog.push(`[webhook] Entry keys: ${Object.keys(entry).join(',')}`);
        debugLog.push(`[webhook] Entry: ${JSON.stringify(entry)}`);

        for (const change of entry.changes || []) {
          debugLog.push(`[webhook] Change field: ${change.field}`);
          debugLog.push(
            `[webhook] Change value: ${JSON.stringify(change.value)}`,
          );

          if (change.field === 'comments') {
            const { id: commentId, text, from, media } = change.value || {};

            if (!commentId || !text || !from || !media) {
              debugLog.push('[webhook] Incomplete comment payload');
              continue;
            }

            // Ignore our own comments (replies we post)
            if (from.id === OWN_IG_ACCOUNT_ID) {
              debugLog.push('[webhook] Ignoring own comment');
              continue;
            }

            const trimmedText = text.trim();
            if (TRIGGER_PATTERNS.test(trimmedText)) {
              debugLog.push(
                `[webhook] Trigger match! from=${from.username} media=${media.id}`,
              );

              promises.push(
                handleTriggerComment({
                  commentId,
                  commenterId: from.id,
                  commenterUsername: from.username,
                  mediaId: media.id,
                })
                  .then(() => {
                    debugLog.push('[webhook] Handler completed successfully');
                  })
                  .catch((error) => {
                    debugLog.push(`[webhook] Handler error: ${error}`);
                  }),
              );
            } else {
              // Non-trigger comment — queue for AI reply
              debugLog.push(
                `[webhook] Queueing for AI reply: "${trimmedText}" from=${from.username}`,
              );

              promises.push(
                (async () => {
                  const caption = await fetchInstagramPostCaption(media.id);
                  await queueCommentForReply({
                    platform: 'INSTAGRAM',
                    commentId,
                    postId: media.id,
                    authorId: from.id,
                    authorUsername: from.username,
                    commentText: trimmedText,
                    postCaption: caption,
                  });
                })().catch((error) => {
                  debugLog.push(`[webhook] Queue error: ${error}`);
                }),
              );
            }
          }
        }
      }

      if (promises.length > 0) {
        await Promise.all(promises);
      }
    }

    // ====================================================================
    // Facebook Page feed (comments on Page posts)
    // ====================================================================
    if (body.object === 'page') {
      const promises: Promise<void>[] = [];

      for (const entry of body.entry || []) {
        debugLog.push(
          `[webhook] FB entry keys: ${Object.keys(entry).join(',')}`,
        );
        debugLog.push(`[webhook] FB entry: ${JSON.stringify(entry)}`);

        for (const change of entry.changes || []) {
          debugLog.push(
            `[webhook] FB change field="${change.field}" value=${JSON.stringify(change.value)}`,
          );

          if (change.field !== 'feed') {
            debugLog.push(
              `[webhook] FB skipping: field is "${change.field}", not "feed"`,
            );
            continue;
          }

          const { value } = change;
          if (!value || value.item !== 'comment' || value.verb !== 'add') {
            debugLog.push(
              `[webhook] FB skipping: item="${value?.item}" verb="${value?.verb}"`,
            );
            continue;
          }

          const {
            comment_id: commentId,
            message,
            from,
            post_id: postId,
            parent_id: parentId,
          } = value;

          // Skip: missing data, nested replies, empty messages, own comments
          if (!commentId || !message || !from || !postId) {
            debugLog.push(
              `[webhook] FB skipping: missing data commentId=${!!commentId} message=${!!message} from=${!!from} postId=${!!postId}`,
            );
            continue;
          }
          if (parentId) {
            debugLog.push(
              `[webhook] FB skipping nested reply: parentId=${parentId} message="${message}"`,
            );
            continue;
          }
          if (from.id === FACEBOOK_PAGE_ID) {
            debugLog.push('[webhook] FB skipping: own comment');
            continue;
          }

          debugLog.push(
            `[webhook] FB comment: "${message}" from=${from.name} post=${postId}`,
          );

          promises.push(
            (async () => {
              const caption = await fetchFacebookPostMessage(postId);
              await queueCommentForReply({
                platform: 'FACEBOOK',
                commentId,
                postId,
                authorId: from.id,
                authorUsername: from.name || null,
                commentText: message.trim(),
                postCaption: caption,
              });
            })().catch((error) => {
              debugLog.push(`[webhook] FB queue error: ${error}`);
            }),
          );
        }
      }

      if (promises.length > 0) {
        await Promise.all(promises);
      }
    }

    if (body.object !== 'instagram' && body.object !== 'page') {
      debugLog.push(`[webhook] Unhandled object type: ${body.object}`);
    }

    // Log everything at once
    // eslint-disable-next-line no-console
    console.log(debugLog.join('\n'));
    return new NextResponse(debugLog.join('\n'), { status: 200 });
  } catch (error) {
    debugLog.push(`[webhook] ERROR: ${error}`);
    // eslint-disable-next-line no-console
    console.log(debugLog.join('\n'));
    return new NextResponse(debugLog.join('\n'), { status: 200 });
  }
};
