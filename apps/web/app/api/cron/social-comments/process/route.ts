import { NextResponse } from 'next/server';
import { db, CommentQueueStatus } from '@parking-ticket-pal/db';
import { createServerLogger } from '@/lib/logger';
import { generateCommentReply } from '@/lib/social-comment-reply';
import {
  replyToComment,
  replyToFacebookComment,
  likeComment,
} from '@/lib/instagram-automation';

const logger = createServerLogger({ action: 'cron-social-comments' });

const BATCH_SIZE = parseInt(process.env.SOCIAL_COMMENT_BATCH_SIZE || '10', 10);

/**
 * POST /api/cron/social-comments/process
 *
 * Process queued social media comments — classify, generate AI replies,
 * like and reply via Graph API.
 */
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();

    const comments = await db.socialCommentQueue.findMany({
      where: {
        status: CommentQueueStatus.PENDING,
        processAfter: { lte: now },
      },
      orderBy: { processAfter: 'asc' },
      take: BATCH_SIZE,
    });

    if (comments.length === 0) {
      return NextResponse.json({ processed: 0 });
    }

    logger.info('Processing social comments', { count: comments.length });

    let replied = 0;
    let skipped = 0;
    let failed = 0;
    let rateLimited = false;

    await Promise.allSettled(
      comments.map(async (comment) => {
        if (rateLimited) {
          return { status: 'rate_limited' as const };
        }

        // Mark as processing
        await db.socialCommentQueue.update({
          where: { id: comment.id },
          data: { status: CommentQueueStatus.PROCESSING },
        });

        try {
          const result = await generateCommentReply({
            commentText: comment.commentText,
            postCaption: comment.postCaption,
            platform: comment.platform,
          });

          if (result.skipped) {
            await db.socialCommentQueue.update({
              where: { id: comment.id },
              data: {
                status: CommentQueueStatus.SKIPPED,
                commentType: result.commentType,
                factChecked: result.factChecked,
                processedAt: new Date(),
              },
            });
            skipped += 1;
            return { status: 'skipped' as const };
          }

          // Like the comment
          const likeResult = await likeComment(comment.commentId);

          // Check for rate limiting
          if (
            !likeResult.success &&
            likeResult.error &&
            (likeResult.error.includes('"code":4') ||
              likeResult.error.includes('"code":32'))
          ) {
            rateLimited = true;
            // Reset to pending for retry
            await db.socialCommentQueue.update({
              where: { id: comment.id },
              data: {
                status: CommentQueueStatus.PENDING,
                processAfter: new Date(Date.now() + 5 * 60 * 1000),
              },
            });
            failed += 1;
            return { status: 'rate_limited' as const };
          }

          // Post reply (platform-specific)
          let replyResult;
          if (comment.platform === 'INSTAGRAM') {
            replyResult = await replyToComment(
              comment.commentId,
              result.reply!,
            );
          } else {
            replyResult = await replyToFacebookComment(
              comment.commentId,
              result.reply!,
            );
          }

          // Check for rate limiting on reply
          if (
            !replyResult.success &&
            replyResult.error &&
            (replyResult.error.includes('"code":4') ||
              replyResult.error.includes('"code":32'))
          ) {
            rateLimited = true;
            await db.socialCommentQueue.update({
              where: { id: comment.id },
              data: {
                status: CommentQueueStatus.PENDING,
                processAfter: new Date(Date.now() + 5 * 60 * 1000),
              },
            });
            failed += 1;
            return { status: 'rate_limited' as const };
          }

          if (!replyResult.success) {
            throw new Error(replyResult.error || 'Reply failed');
          }

          await db.socialCommentQueue.update({
            where: { id: comment.id },
            data: {
              status: CommentQueueStatus.REPLIED,
              commentType: result.commentType,
              replyText: result.reply,
              liked: likeResult.success,
              factChecked: result.factChecked,
              processedAt: new Date(),
            },
          });
          replied += 1;
          return { status: 'replied' as const };
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          logger.error(
            'Failed to process comment',
            { commentId: comment.commentId },
            err,
          );

          const newRetryCount = comment.retryCount + 1;
          await db.socialCommentQueue.update({
            where: { id: comment.id },
            data: {
              status:
                newRetryCount >= 3
                  ? CommentQueueStatus.FAILED
                  : CommentQueueStatus.PENDING,
              errorMessage: err.message,
              retryCount: newRetryCount,
              ...(newRetryCount < 3
                ? { processAfter: new Date(Date.now() + 5 * 60 * 1000) }
                : { processedAt: new Date() }),
            },
          });
          failed += 1;
          return { status: 'failed' as const };
        }
      }),
    );

    const summary = { processed: comments.length, replied, skipped, failed };
    logger.info('Social comments batch complete', summary);

    if (rateLimited) {
      logger.warn('Stopped batch early due to Graph API rate limiting');
    }

    return NextResponse.json(summary);
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('Social comments cron failed', {}, err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * GET /api/cron/social-comments/process
 *
 * Health check — returns pending comment count.
 */
export async function GET() {
  const pending = await db.socialCommentQueue.count({
    where: { status: CommentQueueStatus.PENDING },
  });

  return NextResponse.json({ pending });
}
