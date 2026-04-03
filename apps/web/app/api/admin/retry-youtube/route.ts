import { NextRequest, NextResponse } from 'next/server';
import { db } from '@parking-ticket-pal/db';
import { createServerLogger } from '@/lib/logger';
import {
  postShortToYouTube,
  generateTribunalYouTubeCaption,
  generateNewsYouTubeCaption,
} from '@/lib/video-completion';

const logger = createServerLogger({ action: 'retry-youtube-shorts' });

export const maxDuration = 300;

type Result = {
  type: string;
  id: string;
  title: string;
  success: boolean;
  videoId?: string;
  error?: string;
};

export const POST = async (request: NextRequest) => {
  const authHeader = request.headers.get('authorization');
  const adminSecret = process.env.ADMIN_SECRET || process.env.CRON_SECRET;

  if (adminSecret && authHeader !== `Bearer ${adminSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Fetch all failed videos
  const [tribunalVideos, newsVideos] = await Promise.all([
    db.tribunalCaseVideo.findMany({
      where: {
        status: 'COMPLETED',
        videoUrl: { not: null },
        postingResults: {
          path: ['youtube', 'success'],
          equals: false,
        },
        createdAt: { gte: new Date('2026-03-28T14:00:00Z') },
      },
      include: { case: true },
    }),
    db.newsVideo.findMany({
      where: {
        status: 'COMPLETED',
        videoUrl: { not: null },
        postingResults: {
          path: ['youtube', 'success'],
          equals: false,
        },
        createdAt: { gte: new Date('2026-03-28T14:00:00Z') },
      },
    }),
  ]);

  logger.info(
    `Found ${tribunalVideos.length} tribunal + ${newsVideos.length} news videos to retry`,
  );

  // Process tribunal videos sequentially to avoid YouTube rate limits

  const tribunalResults = await tribunalVideos.reduce<Promise<Result[]>>(
    async (accPromise, video) => {
      const acc = await accPromise;
      const scriptSegments = video.scriptSegments as {
        hook: string;
      } | null;
      const sceneImagesObj = video.sceneImages as Record<
        string,
        string | null
      > | null;
      const sceneImageUrls = sceneImagesObj
        ? Object.values(sceneImagesObj).filter(
            (url): url is string => typeof url === 'string',
          )
        : [];
      const captionImageUrls = [
        ...(video.coverImageUrl ? [video.coverImageUrl] : []),
        ...sceneImageUrls.slice(0, 2),
      ];

      try {
        const caption = await generateTribunalYouTubeCaption({
          authority: video.case.authority,
          contravention: video.case.contravention || 'Parking contravention',
          appealDecision: video.case.appealDecision,
          hook: scriptSegments?.hook || '',
          transcript: video.script,
          imageUrls: captionImageUrls.length > 0 ? captionImageUrls : undefined,
        });

        let { title } = caption;
        if (title.length >= 100) {
          title = `${title.slice(0, 97)}...`;
        }

        const ytResult = await postShortToYouTube(
          video.videoUrl!,
          title,
          caption.description,
          logger,
        );

        const existing =
          (video.postingResults as Record<string, unknown>) || {};

        await db.tribunalCaseVideo.update({
          where: { id: video.id },
          data: { postingResults: { ...existing, youtube: ytResult } },
        });

        logger.info('Retried tribunal YouTube Short', {
          videoId: video.id,
          success: ytResult.success,
        });

        return [
          ...acc,
          {
            type: 'tribunal',
            id: video.id,
            title,
            success: ytResult.success,
            videoId: ytResult.videoId,
            error: ytResult.error,
          },
        ];
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        logger.error(
          'Failed to retry tribunal YouTube Short',
          { videoId: video.id },
          error instanceof Error ? error : new Error(msg),
        );
        return [
          ...acc,
          {
            type: 'tribunal',
            id: video.id,
            title: video.case.authority,
            success: false,
            error: msg,
          },
        ];
      }
    },
    Promise.resolve([]),
  );

  // Process news videos sequentially

  const newsResults = await newsVideos.reduce<Promise<Result[]>>(
    async (accPromise, video) => {
      const acc = await accPromise;
      const scriptSegments = video.scriptSegments as {
        hook: string;
      } | null;
      const newsSceneImagesObj = video.sceneImages as Record<
        string,
        string | null
      > | null;
      const newsSceneImageUrls = newsSceneImagesObj
        ? Object.values(newsSceneImagesObj).filter(
            (url): url is string => typeof url === 'string',
          )
        : [];
      const captionImageUrls = [
        ...(video.coverImageUrl ? [video.coverImageUrl] : []),
        ...newsSceneImageUrls.slice(0, 2),
      ];

      try {
        const caption = await generateNewsYouTubeCaption({
          headline: video.headline,
          source: video.source,
          category: video.category,
          hook: scriptSegments?.hook || '',
          transcript: video.script,
          imageUrls: captionImageUrls.length > 0 ? captionImageUrls : undefined,
        });

        let { title } = caption;
        if (title.length >= 100) {
          title = `${title.slice(0, 97)}...`;
        }

        const ytResult = await postShortToYouTube(
          video.videoUrl!,
          title,
          caption.description,
          logger,
        );

        const existing =
          (video.postingResults as Record<string, unknown>) || {};

        await db.newsVideo.update({
          where: { id: video.id },
          data: { postingResults: { ...existing, youtube: ytResult } },
        });

        logger.info('Retried news YouTube Short', {
          videoId: video.id,
          success: ytResult.success,
        });

        return [
          ...acc,
          {
            type: 'news',
            id: video.id,
            title,
            success: ytResult.success,
            videoId: ytResult.videoId,
            error: ytResult.error,
          },
        ];
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        logger.error(
          'Failed to retry news YouTube Short',
          { videoId: video.id },
          error instanceof Error ? error : new Error(msg),
        );
        return [
          ...acc,
          {
            type: 'news',
            id: video.id,
            title: video.headline,
            success: false,
            error: msg,
          },
        ];
      }
    },
    Promise.resolve([]),
  );

  const allResults = [...tribunalResults, ...newsResults];
  const succeeded = allResults.filter((r) => r.success).length;
  const failed = allResults.filter((r) => !r.success).length;

  logger.info('YouTube retry complete', {
    succeeded,
    failed,
    total: allResults.length,
  });

  return NextResponse.json({
    total: allResults.length,
    succeeded,
    failed,
    results: allResults,
  });
};
