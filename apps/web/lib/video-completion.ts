import { generateText } from 'ai';
import { db } from '@parking-ticket-pal/db';
import { createServerLogger } from '@/lib/logger';
import { models, getTracedModel } from '@/lib/ai/models';
import { sendSocialDigest, type SocialDigestCaption } from '@/lib/email';

// ============================================================================
// Caption generation
// ============================================================================

const generateTribunalCaption = async (
  platform: string,
  caseData: {
    authority: string;
    contravention: string;
    appealDecision: string;
    hook: string;
  },
): Promise<string> => {
  const { text } = await generateText({
    model: getTracedModel(models.textFast, {
      properties: { feature: `tribunal_video_caption_${platform}` },
    }),
    prompt: `Write a ${platform} caption for a short video about a parking tribunal case.

Case: ${caseData.authority} - ${caseData.contravention}
Decision: ${caseData.appealDecision === 'ALLOWED' ? 'Appeal won' : 'Appeal lost'}
Hook: ${caseData.hook}

Guidelines:
- Keep it short and engaging
- Include relevant hashtags for parking/driving content
- British English
- Include a CTA to follow for more
- ${platform === 'tiktok' ? 'Max 150 characters before hashtags' : ''}
- ${platform === 'youtube' ? 'Return as JSON with "title" and "description" fields' : ''}

Hashtags to consider: #parkingticket #parkingfine #pcn #drivingtips #parkingappeals #ukdriving #parkingticketpal`,
  });

  return text;
};

const generateNewsCaption = async (
  platform: string,
  article: {
    headline: string;
    source: string;
    category: string;
    hook: string;
  },
): Promise<string> => {
  const { text } = await generateText({
    model: getTracedModel(models.textFast, {
      properties: { feature: `news_video_caption_${platform}` },
    }),
    prompt: `Write a ${platform} caption for a short video about a UK motorist news story.

Story: ${article.headline}
Source: ${article.source}
Category: ${article.category}
Hook: ${article.hook}

Guidelines:
- Keep it short and engaging
- Include relevant hashtags for UK motoring content
- British English
- Include a CTA to follow for more motoring news
- ${platform === 'tiktok' ? 'Max 150 characters before hashtags' : ''}
- ${platform === 'youtube' ? 'Return as JSON with "title" and "description" fields' : ''}

Hashtags to consider: #uknews #drivingnews #parkingticket #ukdrivers #motoringnews #parkingfine #drivinglaw #carsnews #parkingticketpal`,
  });

  return text;
};

// ============================================================================
// Social posting
// ============================================================================

const postReelToInstagram = async (
  videoUrl: string,
  caption: string,
  coverUrl?: string | null,
  logger?: ReturnType<typeof createServerLogger>,
): Promise<{ success: boolean; mediaId?: string; error?: string }> => {
  try {
    if (
      !process.env.INSTAGRAM_ACCOUNT_ID ||
      !process.env.FACEBOOK_PAGE_ACCESS_TOKEN
    ) {
      throw new Error('Instagram credentials not configured');
    }

    const createResponse = await fetch(
      `https://graph.facebook.com/v24.0/${process.env.INSTAGRAM_ACCOUNT_ID}/media`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_url: videoUrl,
          caption,
          media_type: 'REELS',
          share_to_feed: true,
          ...(coverUrl ? { cover_url: coverUrl } : {}),
          access_token: process.env.FACEBOOK_PAGE_ACCESS_TOKEN,
        }),
      },
    );
    const createData = await createResponse.json();
    if (!createResponse.ok) {
      throw new Error(`Instagram create failed: ${JSON.stringify(createData)}`);
    }
    const creationId = createData.id;

    let ready = false;
    // eslint-disable-next-line no-plusplus
    for (let i = 0; i < 30; i++) {
      // eslint-disable-next-line no-await-in-loop, no-promise-executor-return
      await new Promise((r) => setTimeout(r, 5000));
      // eslint-disable-next-line no-await-in-loop
      const statusResponse = await fetch(
        `https://graph.facebook.com/v24.0/${creationId}?fields=status_code&access_token=${process.env.FACEBOOK_PAGE_ACCESS_TOKEN}`,
      );
      // eslint-disable-next-line no-await-in-loop
      const statusData = await statusResponse.json();
      if (statusData.status_code === 'FINISHED') {
        ready = true;
        break;
      }
      if (statusData.status_code === 'ERROR') {
        throw new Error('Instagram media processing failed');
      }
    }
    if (!ready) {
      throw new Error('Instagram media processing timed out');
    }

    const publishResponse = await fetch(
      `https://graph.facebook.com/v24.0/${process.env.INSTAGRAM_ACCOUNT_ID}/media_publish`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creation_id: creationId,
          access_token: process.env.FACEBOOK_PAGE_ACCESS_TOKEN,
        }),
      },
    );
    const publishData = await publishResponse.json();
    if (!publishResponse.ok) {
      throw new Error(
        `Instagram publish failed: ${JSON.stringify(publishData)}`,
      );
    }

    return { success: true, mediaId: publishData.id };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger?.error('Instagram Reel posting failed', {}, err);
    return { success: false, error: err.message };
  }
};

const postReelToFacebook = async (
  videoUrl: string,
  caption: string,
  title: string,
  logger?: ReturnType<typeof createServerLogger>,
): Promise<{ success: boolean; postId?: string; error?: string }> => {
  try {
    if (
      !process.env.FACEBOOK_PAGE_ID ||
      !process.env.FACEBOOK_PAGE_ACCESS_TOKEN
    ) {
      throw new Error('Facebook credentials not configured');
    }

    const response = await fetch(
      `https://graph.facebook.com/v24.0/${process.env.FACEBOOK_PAGE_ID}/videos`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_url: videoUrl,
          description: caption,
          title,
          access_token: process.env.FACEBOOK_PAGE_ACCESS_TOKEN,
        }),
      },
    );
    const data = await response.json();
    if (!response.ok) {
      throw new Error(`Facebook post failed: ${JSON.stringify(data)}`);
    }

    return { success: true, postId: data.id };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger?.error('Facebook Reel posting failed', {}, err);
    return { success: false, error: err.message };
  }
};

// ============================================================================
// Completion functions (called by webhook endpoints)
// ============================================================================

/**
 * Complete a tribunal video after async render.
 * Generates captions, posts to social media, sends digest email, updates DB.
 */
export async function completeTribunalVideo(
  videoId: string,
  videoUrl: string,
  coverImageUrl: string | null,
): Promise<void> {
  const logger = createServerLogger({ action: 'tribunal-video-complete' });

  // Fetch the video record with case data
  const videoRecord = await db.tribunalCaseVideo.findUniqueOrThrow({
    where: { id: videoId },
    include: { case: true },
  });

  const scriptSegments = videoRecord.scriptSegments as {
    hook: string;
    setup: string;
    keyDetail: string;
    verdict: string;
    takeaway: string;
  } | null;

  // Update DB with render results
  await db.tribunalCaseVideo.update({
    where: { id: videoId },
    data: {
      videoUrl,
      coverImageUrl,
      status: 'POSTING',
    },
  });

  logger.info('Video rendered, posting to social media', {
    videoUrl,
    coverImageUrl,
  });

  // Generate captions
  const caseData = {
    authority: videoRecord.case.authority,
    contravention: videoRecord.case.contravention || 'Parking contravention',
    appealDecision: videoRecord.case.appealDecision,
    hook: scriptSegments?.hook || '',
  };

  const [
    instagramCaption,
    facebookCaption,
    tiktokCaption,
    youtubeCaption,
    threadsCaption,
  ] = await Promise.all([
    generateTribunalCaption('instagram', caseData).catch(() => null),
    generateTribunalCaption('facebook', caseData).catch(() => null),
    generateTribunalCaption('tiktok', caseData).catch(() => null),
    generateTribunalCaption('youtube', caseData).catch(() => null),
    generateTribunalCaption('threads', caseData).catch(() => null),
  ]);

  // Post to platforms
  const postingResults: Record<
    string,
    { success: boolean; mediaId?: string; postId?: string; error?: string }
  > = {};

  if (instagramCaption) {
    const igResult = await postReelToInstagram(
      videoUrl,
      instagramCaption,
      coverImageUrl,
      logger,
    );
    postingResults.instagram = igResult;
  }

  if (facebookCaption) {
    const fbResult = await postReelToFacebook(
      videoUrl,
      facebookCaption,
      `Tribunal Case: ${caseData.authority} - ${caseData.contravention}`,
      logger,
    );
    postingResults.facebook = fbResult;
  }

  // Send email digest
  const digestEmail = process.env.SOCIAL_DIGEST_EMAIL;
  if (digestEmail) {
    const digestCaptions: SocialDigestCaption[] = [];

    if (instagramCaption) {
      digestCaptions.push({
        platform: 'instagramReel',
        caption: instagramCaption,
        autoPosted: postingResults.instagram?.success ?? false,
        assetType: 'video',
      });
    }
    if (facebookCaption) {
      digestCaptions.push({
        platform: 'facebookReel',
        caption: facebookCaption,
        autoPosted: postingResults.facebook?.success ?? false,
        assetType: 'video',
      });
    }
    if (tiktokCaption) {
      digestCaptions.push({
        platform: 'tiktok',
        caption: tiktokCaption,
        autoPosted: false,
        assetType: 'video',
      });
    }
    if (youtubeCaption) {
      digestCaptions.push({
        platform: 'youtubeShorts',
        caption: youtubeCaption,
        autoPosted: false,
        assetType: 'video',
      });
    }
    if (threadsCaption) {
      digestCaptions.push({
        platform: 'threads',
        caption: threadsCaption,
        autoPosted: false,
        assetType: 'video',
      });
    }

    try {
      await sendSocialDigest(digestEmail, {
        blogTitle: `Tribunal Case: ${caseData.authority} - ${caseData.contravention}`,
        blogUrl: '',
        imageUrl: '',
        videoUrl,
        captions: digestCaptions,
      });
      logger.info('Social digest email sent');
    } catch (error) {
      logger.error(
        'Failed to send digest email',
        {},
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  // Mark completed
  await db.tribunalCaseVideo.update({
    where: { id: videoId },
    data: {
      postingResults,
      status: 'COMPLETED',
    },
  });

  logger.info('Tribunal video completion pipeline finished', {
    videoId,
    videoUrl,
    postingResults,
  });
}

/**
 * Complete a news video after async render.
 * Generates captions, posts to social media, sends digest email, updates DB.
 */
export async function completeNewsVideo(
  videoId: string,
  videoUrl: string,
  coverImageUrl: string | null,
): Promise<void> {
  const logger = createServerLogger({ action: 'news-video-complete' });

  // Fetch the video record
  const videoRecord = await db.newsVideo.findUniqueOrThrow({
    where: { id: videoId },
  });

  const scriptSegments = videoRecord.scriptSegments as {
    hook: string;
    context: string;
    keyDetail: string;
    impact: string;
    cta: string;
  } | null;

  // Update DB with render results
  await db.newsVideo.update({
    where: { id: videoId },
    data: {
      videoUrl,
      coverImageUrl,
      status: 'POSTING',
    },
  });

  logger.info('Video rendered, posting to social media', {
    videoUrl,
    coverImageUrl,
  });

  // Generate captions
  const captionData = {
    headline: videoRecord.headline,
    source: videoRecord.source,
    category: videoRecord.category,
    hook: scriptSegments?.hook || '',
  };

  const [
    instagramCaption,
    facebookCaption,
    tiktokCaption,
    youtubeCaption,
    threadsCaption,
  ] = await Promise.all([
    generateNewsCaption('instagram', captionData).catch(() => null),
    generateNewsCaption('facebook', captionData).catch(() => null),
    generateNewsCaption('tiktok', captionData).catch(() => null),
    generateNewsCaption('youtube', captionData).catch(() => null),
    generateNewsCaption('threads', captionData).catch(() => null),
  ]);

  // Post to platforms
  const postingResults: Record<
    string,
    { success: boolean; mediaId?: string; postId?: string; error?: string }
  > = {};

  if (instagramCaption) {
    const igResult = await postReelToInstagram(
      videoUrl,
      instagramCaption,
      coverImageUrl,
      logger,
    );
    postingResults.instagram = igResult;
  }

  if (facebookCaption) {
    const fbResult = await postReelToFacebook(
      videoUrl,
      facebookCaption,
      `UK News: ${videoRecord.headline}`,
      logger,
    );
    postingResults.facebook = fbResult;
  }

  // Send email digest
  const digestEmail = process.env.SOCIAL_DIGEST_EMAIL;
  if (digestEmail) {
    const digestCaptions: SocialDigestCaption[] = [];

    if (instagramCaption) {
      digestCaptions.push({
        platform: 'instagramReel',
        caption: instagramCaption,
        autoPosted: postingResults.instagram?.success ?? false,
        assetType: 'video',
      });
    }
    if (facebookCaption) {
      digestCaptions.push({
        platform: 'facebookReel',
        caption: facebookCaption,
        autoPosted: postingResults.facebook?.success ?? false,
        assetType: 'video',
      });
    }
    if (tiktokCaption) {
      digestCaptions.push({
        platform: 'tiktok',
        caption: tiktokCaption,
        autoPosted: false,
        assetType: 'video',
      });
    }
    if (youtubeCaption) {
      digestCaptions.push({
        platform: 'youtubeShorts',
        caption: youtubeCaption,
        autoPosted: false,
        assetType: 'video',
      });
    }
    if (threadsCaption) {
      digestCaptions.push({
        platform: 'threads',
        caption: threadsCaption,
        autoPosted: false,
        assetType: 'video',
      });
    }

    try {
      await sendSocialDigest(digestEmail, {
        blogTitle: `UK News: ${videoRecord.headline}`,
        blogUrl: videoRecord.articleUrl,
        imageUrl: '',
        videoUrl,
        captions: digestCaptions,
        sourceArticleUrl: videoRecord.articleUrl,
        sourceArticleName: videoRecord.source,
      });
      logger.info('Social digest email sent');
    } catch (error) {
      logger.error(
        'Failed to send digest email',
        {},
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  // Mark completed
  await db.newsVideo.update({
    where: { id: videoId },
    data: {
      postingResults,
      status: 'COMPLETED',
    },
  });

  logger.info('News video completion pipeline finished', {
    videoId,
    videoUrl,
    postingResults,
  });
}
