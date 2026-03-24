import { db, Prisma } from '@parking-ticket-pal/db';

type VideoContext = {
  transcript: string | null;
  visualContext: string | null;
};

type PostingResults = Record<
  string,
  { success?: boolean; postId?: string; mediaId?: string }
>;

type SceneImagePrompts = Record<string, string>;

/**
 * Format scene image prompts into a readable string for AI context.
 */
function formatScenePrompts(prompts: SceneImagePrompts): string {
  return Object.entries(prompts)
    .map(([scene, prompt]) => `- ${scene}: ${prompt}`)
    .join('\n');
}

/**
 * Check if a postingResults JSON contains the given Graph API post ID.
 */
function postingResultsContainPostId(
  postingResults: unknown,
  postId: string,
): boolean {
  if (!postingResults || typeof postingResults !== 'object') return false;
  const results = postingResults as PostingResults;
  return Object.values(results).some(
    (r) => r.postId === postId || r.mediaId === postId,
  );
}

/**
 * Build visual context string from scene prompts or segments.
 */
function buildVisualContextFromNews(
  prompts: SceneImagePrompts | null,
  segments: SceneImagePrompts | null,
): string | null {
  if (prompts) {
    return `Scene image prompts (what each AI-generated clay diorama illustration was asked to depict):\n${formatScenePrompts(prompts)}`;
  }
  if (segments) {
    return `Scene narrative segments (each has a corresponding AI-generated clay diorama illustration):\n${formatScenePrompts(segments)}`;
  }
  return null;
}

/**
 * Look up the originating video record for a social media post and extract
 * the transcript and visual context (scene image prompts).
 *
 * Searches TribunalCaseVideo and NewsVideo by matching the Graph API postId
 * against stored postingResults.
 */
// eslint-disable-next-line import-x/prefer-default-export
export async function getVideoContextForPost(
  postId: string,
): Promise<VideoContext> {
  const empty: VideoContext = { transcript: null, visualContext: null };

  if (!postId) return empty;

  // Search recent videos (last 30 days) to keep query fast
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Check TribunalCaseVideo first (more common for reels)
  const tribunalVideos = await db.tribunalCaseVideo.findMany({
    where: {
      status: 'COMPLETED',
      createdAt: { gte: since },
      postingResults: { not: Prisma.DbNull },
    },
    select: {
      script: true,
      scriptSegments: true,
      postingResults: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  const matchedTribunal = tribunalVideos.find((video) =>
    postingResultsContainPostId(video.postingResults, postId),
  );

  if (matchedTribunal) {
    const segments = matchedTribunal.scriptSegments as SceneImagePrompts | null;
    return {
      transcript: matchedTribunal.script,
      visualContext: segments
        ? `Scene narrative segments (each has a corresponding AI-generated clay diorama illustration):\n${formatScenePrompts(segments)}`
        : null,
    };
  }

  // Check NewsVideo
  const newsVideos = await db.newsVideo.findMany({
    where: {
      status: 'COMPLETED',
      createdAt: { gte: since },
      postingResults: { not: Prisma.DbNull },
    },
    select: {
      script: true,
      scriptSegments: true,
      sceneImagePrompts: true,
      postingResults: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  const matchedNews = newsVideos.find((video) =>
    postingResultsContainPostId(video.postingResults, postId),
  );

  if (matchedNews) {
    const prompts = matchedNews.sceneImagePrompts as SceneImagePrompts | null;
    const segments = matchedNews.scriptSegments as SceneImagePrompts | null;
    return {
      transcript: matchedNews.script,
      visualContext: buildVisualContextFromNews(prompts, segments),
    };
  }

  return empty;
}
