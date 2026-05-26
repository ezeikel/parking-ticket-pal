/* eslint-disable no-restricted-syntax, no-await-in-loop --
 * This is a batch retry admin endpoint that intentionally processes IDs
 * sequentially to avoid hammering Facebook/Instagram APIs in parallel
 * (which gets us rate-limited). The `for...of` + sequential `await`
 * pattern is correct here, not a performance bug.
 */
import { NextRequest, NextResponse } from 'next/server';
import { db, Prisma } from '@parking-ticket-pal/db';
import { createServerLogger } from '@/lib/logger';
import {
  postCarouselToInstagram,
  postAlbumToFacebook,
  postReelToInstagram,
  postReelToFacebook,
  generateNewsCaption,
} from '@/lib/video-completion';

const log = createServerLogger({ action: 'admin-retry-social' });

export const maxDuration = 300;

/**
 * Retry failed IG/FB posts without duplicating YouTube.
 *
 * POST /api/admin/retry-social
 * Authorization: Bearer <CRON_SECRET>
 * Body: { "type": "news" | "quiz", "ids": ["id1", "id2"] }
 */
export const POST = async (request: NextRequest) => {
  const authHeader = request.headers.get('authorization');
  const adminSecret = process.env.ADMIN_SECRET || process.env.CRON_SECRET;

  if (adminSecret && authHeader !== `Bearer ${adminSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { type, ids } = await request.json();

  if (!type || !ids?.length) {
    return NextResponse.json({ error: 'Missing type or ids' }, { status: 400 });
  }

  const results: Record<string, unknown> = {};

  if (type === 'quiz') {
    for (const id of ids) {
      try {
        const quiz = await db.highwayCodeQuizPost.findUniqueOrThrow({
          where: { id },
        });

        const postingResults =
          (quiz.postingResults as Record<string, { success: boolean }>) || {};
        const retryResults: Record<string, unknown> = {};

        if (
          !postingResults.instagram?.success &&
          quiz.questionSlideUrl &&
          quiz.answerSlideUrl
        ) {
          const igResult = await postCarouselToInstagram(
            [quiz.questionSlideUrl, quiz.answerSlideUrl],
            quiz.caption || '',
            log,
          );
          retryResults.instagram = igResult;
        }

        if (
          !postingResults.facebook?.success &&
          quiz.questionSlideUrl &&
          quiz.answerSlideUrl
        ) {
          const fbResult = await postAlbumToFacebook(
            [quiz.questionSlideUrl, quiz.answerSlideUrl],
            quiz.caption || '',
            'Highway Code Quiz',
            log,
          );
          retryResults.facebook = fbResult;
        }

        await db.highwayCodeQuizPost.update({
          where: { id },
          data: {
            postingResults: {
              ...postingResults,
              ...retryResults,
            } as Prisma.InputJsonValue,
          },
        });

        results[id] = retryResults;
      } catch (error) {
        results[id] = {
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }
  }

  if (type === 'news') {
    for (const id of ids) {
      try {
        const video = await db.newsVideo.findUniqueOrThrow({
          where: { id },
        });

        const postingResultsRaw =
          (video.postingResults as Record<string, { success: boolean }>) || {};
        const retryResults: Record<string, unknown> = {};

        const scriptSegments = video.scriptSegments as {
          hook: string;
        } | null;

        const captionData = {
          headline: video.headline,
          source: video.source,
          category: video.category,
          hook: scriptSegments?.hook || '',
          transcript: video.script,
        };

        if (!postingResultsRaw.instagram?.success && video.videoUrl) {
          const caption = await generateNewsCaption('instagram', captionData);
          if (caption) {
            const igResult = await postReelToInstagram(
              video.videoUrl,
              caption,
              video.coverImageUrl,
              log,
            );
            retryResults.instagram = igResult;
          }
        }

        if (!postingResultsRaw.facebook?.success && video.videoUrl) {
          const caption = await generateNewsCaption('facebook', captionData);
          if (caption) {
            const fbResult = await postReelToFacebook(
              video.videoUrl,
              caption,
              `UK News: ${video.headline}`,
              log,
            );
            retryResults.facebook = fbResult;
          }
        }

        await db.newsVideo.update({
          where: { id },
          data: {
            postingResults: {
              ...postingResultsRaw,
              ...retryResults,
            } as Prisma.InputJsonValue,
          },
        });

        results[id] = retryResults;
      } catch (error) {
        results[id] = {
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }
  }

  log.info('Retry social posting completed', { type, results });

  return NextResponse.json({ success: true, results });
};
