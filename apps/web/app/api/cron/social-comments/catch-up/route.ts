/* eslint-disable no-await-in-loop, no-restricted-syntax, no-continue */
import { NextResponse } from 'next/server';
import { db } from '@parking-ticket-pal/db';
import { createServerLogger } from '@/lib/logger';
import { fetchFacebookPostMessage } from '@/lib/instagram-automation';

export const maxDuration = 120;

const logger = createServerLogger({ action: 'cron-social-comments-catchup' });

const PAGE_ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
const { FACEBOOK_PAGE_ID } = process.env;

/**
 * Only scan posts from the last N days. Comments on older posts are
 * unlikely and we avoid burning through the entire post history.
 */
const LOOKBACK_DAYS = 7;

type FBComment = {
  id: string;
  from?: { id: string; name?: string };
  message?: string;
  created_time: string;
};

type FBPost = {
  id: string;
  created_time: string;
};

/**
 * Fetch all page posts from the last LOOKBACK_DAYS, paginating through
 * the Graph API until we pass the cutoff date or run out of pages.
 */
async function fetchRecentPosts(): Promise<FBPost[]> {
  const cutoff = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
  const posts: FBPost[] = [];
  let url: string | null =
    `https://graph.facebook.com/v24.0/${FACEBOOK_PAGE_ID}/posts?fields=id,created_time&limit=100&access_token=${PAGE_ACCESS_TOKEN}`;

  while (url) {
    const res: Response = await fetch(url);
    const data: { data?: FBPost[]; paging?: { next?: string } } =
      await res.json();

    if (!res.ok) {
      logger.error('Failed to fetch page posts', {
        error: JSON.stringify(data),
      });
      break;
    }

    const page = data.data || [];
    let reachedCutoff = false;

    for (const post of page) {
      if (new Date(post.created_time) < cutoff) {
        reachedCutoff = true;
        break;
      }
      posts.push(post);
    }

    if (reachedCutoff || !data.paging?.next) break;
    url = data.paging.next;
  }

  return posts;
}

/**
 * Fetch all top-level comments for a post.
 */
async function fetchPostComments(postId: string): Promise<FBComment[]> {
  const comments: FBComment[] = [];
  let url: string | null =
    `https://graph.facebook.com/v24.0/${postId}/comments?fields=id,from,message,created_time&limit=50&access_token=${PAGE_ACCESS_TOKEN}`;

  while (url) {
    const res: Response = await fetch(url);
    const data: { data?: FBComment[]; paging?: { next?: string } } =
      await res.json();

    if (!res.ok) {
      logger.warn('Failed to fetch post comments', {
        postId,
        error: JSON.stringify(data),
      });
      break;
    }

    comments.push(...(data.data || []));
    url = data.paging?.next || null;
  }

  return comments;
}

/**
 * GET /api/cron/social-comments/catch-up
 *
 * Daily catch-up: scans all Facebook posts from the last 7 days for
 * comments that the webhook missed and queues them for AI reply processing.
 */
async function catchUpComments(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!PAGE_ACCESS_TOKEN || !FACEBOOK_PAGE_ID) {
      return NextResponse.json(
        { error: 'Missing Facebook env vars' },
        { status: 500 },
      );
    }

    const posts = await fetchRecentPosts();

    if (posts.length === 0) {
      return NextResponse.json({ queued: 0, scanned: 0 });
    }

    // Get all comment IDs already in the queue for these posts
    const postIds = posts.map((p) => p.id);
    const existing = await db.socialCommentQueue.findMany({
      where: { postId: { in: postIds } },
      select: { commentId: true },
    });
    const existingIds = new Set(existing.map((e) => e.commentId));

    let scannedComments = 0;
    let queued = 0;
    const captionCache = new Map<string, string | null>();

    for (const post of posts) {
      const comments = await fetchPostComments(post.id);
      scannedComments += comments.length;

      for (const comment of comments) {
        // Skip: already queued
        if (existingIds.has(comment.id)) continue;

        // Skip: own comments
        if (comment.from?.id === FACEBOOK_PAGE_ID) continue;

        // Skip: empty or missing message
        const message = comment.message?.trim();
        if (!message) continue;

        // Skip: no author info (can't reply without from.id)
        if (!comment.from?.id) continue;

        // Queue with a short delay (30-90s) since these are already late
        const delayMs = (30 + Math.random() * 60) * 1000;
        const processAfter = new Date(Date.now() + delayMs);

        try {
          if (!captionCache.has(post.id)) {
            captionCache.set(post.id, await fetchFacebookPostMessage(post.id));
          }
          const caption = captionCache.get(post.id) ?? null;

          await db.socialCommentQueue.create({
            data: {
              platform: 'FACEBOOK',
              commentId: comment.id,
              postId: post.id,
              authorId: comment.from.id,
              authorUsername: comment.from.name || null,
              commentText: message,
              postCaption: caption,
              processAfter,
            },
          });

          queued += 1;
          logger.info('Catch-up: queued missed comment', {
            commentId: comment.id,
            postId: post.id,
          });
        } catch (error) {
          // Unique constraint = already exists (race condition), safe to ignore
          if (
            error instanceof Error &&
            error.message.includes('Unique constraint')
          ) {
            continue;
          }
          logger.error('Catch-up: failed to queue comment', {
            commentId: comment.id,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }

    const summary = {
      posts: posts.length,
      scannedComments,
      queued,
    };

    logger.info('Social comments catch-up complete', summary);
    return NextResponse.json(summary);
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('Social comments catch-up failed', {}, err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return catchUpComments(request);
}

export async function POST(request: Request) {
  return catchUpComments(request);
}
