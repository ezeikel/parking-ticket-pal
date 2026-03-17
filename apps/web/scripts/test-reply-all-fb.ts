/* eslint-disable no-restricted-syntax, no-continue, no-await-in-loop, no-console, no-promise-executor-return */
/**
 * Fetch all existing FB comments and reply to each via AI pipeline.
 * Checks DB for already-processed comments instead of hardcoded set.
 *
 * Usage: npx tsx scripts/test-reply-all-fb.ts
 * Set DRY_RUN=false to actually post replies.
 */

import { db } from '@parking-ticket-pal/db';
import { generateCommentReply } from '../lib/social-comment-reply';
import {
  likeComment,
  replyToFacebookComment,
} from '../lib/instagram-automation';

const DRY_RUN = process.env.DRY_RUN !== 'false';
const TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN!;
const PAGE_ID = process.env.FACEBOOK_PAGE_ID!;

async function graphGet(url: string) {
  const res = await fetch(url);
  return res.json();
}

async function main() {
  console.log(`DRY_RUN: ${DRY_RUN}\n`);

  // Get already-processed comment IDs from DB
  const existing = await db.socialCommentQueue.findMany({
    where: { platform: 'FACEBOOK' },
    select: { commentId: true },
  });
  const alreadyProcessed = new Set(existing.map((e) => e.commentId));
  console.log(`${alreadyProcessed.size} comments already in DB\n`);

  // Paginate through all posts
  let postsUrl: string | null =
    `https://graph.facebook.com/v24.0/${PAGE_ID}/feed?fields=id,message&limit=50&access_token=${TOKEN}`;

  const allComments: {
    commentId: string;
    postId: string;
    message: string;
    caption: string | null;
    fromId: string;
    fromName: string | null;
  }[] = [];

  while (postsUrl) {
    const posts = await graphGet(postsUrl);

    for (const post of posts.data || []) {
      let commentsUrl: string | null =
        `https://graph.facebook.com/v24.0/${post.id}/comments?fields=id,message,from&limit=50&access_token=${TOKEN}`;

      while (commentsUrl) {
        const comments = await graphGet(commentsUrl);
        for (const c of comments.data || []) {
          if (c.from?.id === PAGE_ID) continue;
          allComments.push({
            commentId: c.id,
            postId: post.id,
            message: c.message,
            caption: post.message || null,
            fromId: c.from?.id || 'unknown',
            fromName: c.from?.name || null,
          });
        }
        commentsUrl = comments.paging?.next || null;
      }
    }

    postsUrl = posts.paging?.next || null;
  }

  console.log(`Found ${allComments.length} total comments\n`);

  const toProcess = allComments.filter(
    (c) => !alreadyProcessed.has(c.commentId),
  );
  console.log(`${toProcess.length} to process\n`);

  if (toProcess.length === 0) {
    console.log('Nothing to do.');
    process.exit(0);
  }

  for (const comment of toProcess) {
    console.log(`--- Comment: "${comment.message.slice(0, 80)}" ---`);

    const result = await generateCommentReply({
      commentText: comment.message,
      postCaption: comment.caption,
      platform: 'FACEBOOK',
    });

    console.log(
      `  Type: ${result.commentType} | Fact-checked: ${result.factChecked} | Skipped: ${result.skipped}`,
    );

    if (result.skipped) {
      // Still like skipped comments (unless spam)
      if (result.commentType !== 'SPAM') {
        if (!DRY_RUN) {
          const likeRes = await likeComment(comment.commentId);
          console.log(`  Like only: ${likeRes.success ? 'OK' : likeRes.error}`);
        } else {
          console.log('  [DRY RUN - would like]');
        }
      }
      console.log(`  Skip reason: ${result.skipReason}\n`);

      // Record in DB
      if (!DRY_RUN) {
        await db.socialCommentQueue
          .create({
            data: {
              platform: 'FACEBOOK',
              commentId: comment.commentId,
              postId: comment.postId,
              authorId: comment.fromId,
              authorUsername: comment.fromName,
              commentText: comment.message,
              postCaption: comment.caption,
              status: 'SKIPPED',
              commentType: result.commentType,
              processAfter: new Date(),
              processedAt: new Date(),
            },
          })
          .catch(() => {});
      }
      continue;
    }

    console.log(`  Reply: ${result.reply}`);

    if (DRY_RUN) {
      console.log('  [DRY RUN - not posting]\n');
      continue;
    }

    const likeRes = await likeComment(comment.commentId);
    console.log(`  Like: ${likeRes.success ? 'OK' : likeRes.error}`);

    const replyRes = await replyToFacebookComment(
      comment.commentId,
      result.reply!,
    );
    console.log(`  Post: ${replyRes.success ? 'OK' : replyRes.error}\n`);

    // Record in DB
    await db.socialCommentQueue
      .create({
        data: {
          platform: 'FACEBOOK',
          commentId: comment.commentId,
          postId: comment.postId,
          authorId: comment.fromId,
          authorUsername: comment.fromName,
          commentText: comment.message,
          postCaption: comment.caption,
          status: 'REPLIED',
          commentType: result.commentType,
          replyText: result.reply,
          liked: likeRes.success,
          factChecked: result.factChecked,
          processAfter: new Date(),
          processedAt: new Date(),
        },
      })
      .catch(() => {});

    // Small delay between replies to avoid rate limits
    await new Promise((r) => setTimeout(r, 2000));
  }

  console.log('Done!');
  process.exit(0);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
