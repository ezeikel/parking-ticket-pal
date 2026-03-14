import { generateText } from 'ai';
import { db } from '@parking-ticket-pal/db';
import { createServerLogger } from '@/lib/logger';
import { models, getTracedModel } from '@/lib/ai/models';
import { sendSocialDigest, type SocialDigestCaption } from '@/lib/email';
import {
  generateNewsBlogPost,
  generateTribunalBlogPost,
} from '@/app/actions/blog';
import { SITE_URL as DEFAULT_SITE_URL } from '@/constants';

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || DEFAULT_SITE_URL;

// ============================================================================
// Caption generation — platform-specific guidelines
// ============================================================================

const getPlatformGuidelines = (platform: string): string => {
  const guidelines: Record<string, string> = {
    instagram: `Instagram Reels format:
- 100-150 characters ideal for fast-scrolling feeds
- Open with a bold question or stat as hook (e.g. "Fined £100 for this parking mistake?")
- Conversational British English, relatable and authoritative — like a trusted motoring expert
- 3-5 emoji integrated after key phrases for visual breaks (e.g. 🚗💰⚠️), avoid looking spammy
- Line breaks every 1-2 sentences; structure as: hook → 2-3 key points → CTA → hashtags
- CTA: direct prompts like "Save for your next drive 👇" or "Tag a mate who needs this"
- 5-8 targeted hashtags at the end on a separate line (mix 2-3 broad like #UKParking with 4-5 niche like #PCN #ParkingAppeals)
- Include primary keyword in first line for algorithm categorisation
- Do NOT put hashtags inline in the body text`,

    facebook: `Facebook Reels format:
- Up to 250 characters — Facebook's older demographic reads more than Instagram's
- Open with a problem-solution hook (e.g. "Avoid this £130 PCN trap")
- Warm, advisory British English — like a community expert, inclusive "we UK drivers" phrasing
- 2-4 subtle emoji (e.g. 🅿️🚦), keep it practical not flashy
- Double line breaks between paragraphs; simple structure: hook → tips → CTA
- CTA: share-focused like "Share with family drivers" or "Comment your worst parking story"
- 3-5 hashtags max at the end (broad like #MotoringUK plus niche like #ParkingFines)
- Do NOT overload emoji or hashtags — feels too youthful for FB audience`,

    tiktok: `TikTok format:
- Ultra-short 50-100 characters before hashtags — on-video text carries the message, caption is secondary
- Open with a shocking fact or challenge (e.g. "£200 fine in 10 seconds? Watch 👀")
- Fun, urgent, youthful British English — punchy and direct
- 4-6 energetic emoji integrated into the hook (🔥🚗❌👀)
- Single line or minimal breaks; all-caps key words for emphasis; hook + CTA only
- CTA: urgent engagement like "Duet your parking fail! 👇" or "Stitch if this saved you"
- 4-7 hashtags front-loaded: 2 trending (e.g. #ParkingHack) plus 4 niche (#UKMotoring #PCN)
- Include keywords in first line for For You Page topic matching
- Do NOT write long paragraphs — users skip; keep it punchy`,

    youtube: `YouTube Shorts format — return as JSON with "title" and "description" fields:
- Title: 60-70 characters, keyword-frontloaded for search (e.g. "Is This Parking Legal in 2026? UK Rules Explained")
- Description: 150-200 characters, SEO-driven with keyword variations
- Expert, factual British English — informative like an official guide
- 2-3 informative emoji only (📍⚠️🚗), minimal to keep professional
- Numbered lists for tips; line breaks between points
- CTA: "Like & subscribe for more UK motoring laws 👇" or "Comment your area's rules"
- 3-5 hashtags ABOVE the title line (e.g. #UKParking #MotoringTips #DrivingLaw)
- Primary keyword must appear in both title and first line of description for search ranking
- Do NOT overload hashtags (harms SEO); avoid casual slang`,

    threads: `Threads format:
- 200-300 characters for conversational depth — Threads is text-first
- Open with a story starter (e.g. "Just saw a driver get a £100 PCN for this — here's why it happened")
- Chatty, opinionated British English — like a motoring insider sharing a take
- 1-3 supportive emoji (🤔🛣️⚠️), enhance readability without dominating
- Paragraph breaks with conversational flow; include questions to invite replies
- CTA: discussion prompts like "What's your take?" or "Has this happened to you? Reply below"
- 2-4 niche hashtags at the end (e.g. #ParkingUK #UKDriving)
- Do NOT use salesy CTAs; don't duplicate the Instagram caption verbatim; give depth not teasers`,

    linkedin: `LinkedIn format:
- 100-200 characters ideal, scannable with line breaks every 1-2 sentences
- Open with a hook: a question, surprising stat, or bold claim (e.g. "Can a council really ignore the tribunal?")
- Professional but accessible British English — credible and insightful, not casual or meme-like
- 1-2 emoji max, only for emphasis (e.g. a pointing hand for the CTA)
- End with a networking CTA: "Has this happened to you?" or "What would you have done?" — NOT "follow for more"
- 3-5 niche hashtags on a final separate line (e.g. #ParkingTicket #PCN #UKDriving #ParkingAppeals #ParkingTicketPal)
- Do NOT put hashtags inline in the body text`,
  };

  return guidelines[platform] || '';
};

const generateTribunalCaption = async (
  platform: string,
  caseData: {
    authority: string;
    contravention: string;
    appealDecision: string;
    hook: string;
  },
): Promise<string> => {
  const platformGuidelines = getPlatformGuidelines(platform);

  const { text } = await generateText({
    model: getTracedModel(models.textFast, {
      properties: { feature: `tribunal_video_caption_${platform}` },
    }),
    prompt: `Write a ${platform} caption for a short video about a parking tribunal case.

Case: ${caseData.authority} - ${caseData.contravention}
Decision: ${caseData.appealDecision === 'ALLOWED' ? 'Appeal won' : 'Appeal lost'}
Hook: ${caseData.hook}

${platformGuidelines}`,
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
  const platformGuidelines = getPlatformGuidelines(platform);

  const { text } = await generateText({
    model: getTracedModel(models.textFast, {
      properties: { feature: `news_video_caption_${platform}` },
    }),
    prompt: `Write a ${platform} caption for a short video about a UK motorist news story.

Story: ${article.headline}
Source: ${article.source}
Category: ${article.category}
Hook: ${article.hook}

${platformGuidelines}`,
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
// Carousel / album posting (for image-based content like quizzes)
// ============================================================================

export const postCarouselToInstagram = async (
  imageUrls: string[],
  caption: string,
  logger?: ReturnType<typeof createServerLogger>,
): Promise<{ success: boolean; mediaId?: string; error?: string }> => {
  try {
    if (
      !process.env.INSTAGRAM_ACCOUNT_ID ||
      !process.env.FACEBOOK_PAGE_ACCESS_TOKEN
    ) {
      throw new Error('Instagram credentials not configured');
    }

    const accessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
    const igAccountId = process.env.INSTAGRAM_ACCOUNT_ID;

    // 1. Create child containers for each image
    const childIds: string[] = [];
    // eslint-disable-next-line no-restricted-syntax
    for (const imageUrl of imageUrls) {
      // eslint-disable-next-line no-await-in-loop
      const childResponse = await fetch(
        `https://graph.facebook.com/v24.0/${igAccountId}/media`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image_url: imageUrl,
            is_carousel_item: true,
            access_token: accessToken,
          }),
        },
      );
      // eslint-disable-next-line no-await-in-loop
      const childData = await childResponse.json();
      if (!childResponse.ok) {
        throw new Error(
          `Instagram carousel child failed: ${JSON.stringify(childData)}`,
        );
      }
      childIds.push(childData.id);
    }

    // 2. Wait for each child to reach FINISHED
    // eslint-disable-next-line no-restricted-syntax
    for (const childId of childIds) {
      let ready = false;
      // eslint-disable-next-line no-plusplus
      for (let i = 0; i < 30; i++) {
        // eslint-disable-next-line no-await-in-loop, no-promise-executor-return
        await new Promise((r) => setTimeout(r, 3000));
        // eslint-disable-next-line no-await-in-loop
        const statusResponse = await fetch(
          `https://graph.facebook.com/v24.0/${childId}?fields=status_code&access_token=${accessToken}`,
        );
        // eslint-disable-next-line no-await-in-loop
        const statusData = await statusResponse.json();
        if (statusData.status_code === 'FINISHED') {
          ready = true;
          break;
        }
        if (statusData.status_code === 'ERROR') {
          throw new Error(
            `Instagram carousel child ${childId} processing failed`,
          );
        }
      }
      if (!ready) {
        throw new Error(
          `Instagram carousel child ${childId} processing timed out`,
        );
      }
    }

    // 3. Create carousel container
    const carouselResponse = await fetch(
      `https://graph.facebook.com/v24.0/${igAccountId}/media`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          media_type: 'CAROUSEL',
          children: childIds.join(','),
          caption,
          access_token: accessToken,
        }),
      },
    );
    const carouselData = await carouselResponse.json();
    if (!carouselResponse.ok) {
      throw new Error(
        `Instagram carousel create failed: ${JSON.stringify(carouselData)}`,
      );
    }
    const carouselId = carouselData.id;

    // 4. Wait for carousel to be ready
    let carouselReady = false;
    // eslint-disable-next-line no-plusplus
    for (let i = 0; i < 30; i++) {
      // eslint-disable-next-line no-await-in-loop, no-promise-executor-return
      await new Promise((r) => setTimeout(r, 3000));
      // eslint-disable-next-line no-await-in-loop
      const statusResponse = await fetch(
        `https://graph.facebook.com/v24.0/${carouselId}?fields=status_code&access_token=${accessToken}`,
      );
      // eslint-disable-next-line no-await-in-loop
      const statusData = await statusResponse.json();
      if (statusData.status_code === 'FINISHED') {
        carouselReady = true;
        break;
      }
      if (statusData.status_code === 'ERROR') {
        throw new Error('Instagram carousel processing failed');
      }
    }
    if (!carouselReady) {
      throw new Error('Instagram carousel processing timed out');
    }

    // 5. Publish
    const publishResponse = await fetch(
      `https://graph.facebook.com/v24.0/${igAccountId}/media_publish`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creation_id: carouselId,
          access_token: accessToken,
        }),
      },
    );
    const publishData = await publishResponse.json();
    if (!publishResponse.ok) {
      throw new Error(
        `Instagram carousel publish failed: ${JSON.stringify(publishData)}`,
      );
    }

    return { success: true, mediaId: publishData.id };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger?.error('Instagram carousel posting failed', {}, err);
    return { success: false, error: err.message };
  }
};

export const postAlbumToFacebook = async (
  imageUrls: string[],
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

    const accessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
    const pageId = process.env.FACEBOOK_PAGE_ID;

    // Upload each image as an unpublished photo, collect their IDs
    const photoIds: string[] = [];
    // eslint-disable-next-line no-restricted-syntax
    for (const imageUrl of imageUrls) {
      // eslint-disable-next-line no-await-in-loop
      const response = await fetch(
        `https://graph.facebook.com/v24.0/${pageId}/photos`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: imageUrl,
            published: false,
            access_token: accessToken,
          }),
        },
      );
      // eslint-disable-next-line no-await-in-loop
      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          `Facebook photo upload failed: ${JSON.stringify(data)}`,
        );
      }
      photoIds.push(data.id);
    }

    // Create a multi-photo post referencing all uploaded photos
    const attachedMedia = photoIds.map((id) => ({ media_fbid: id }));
    const response = await fetch(
      `https://graph.facebook.com/v24.0/${pageId}/feed`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `${title}\n\n${caption}`,
          attached_media: attachedMedia,
          access_token: accessToken,
        }),
      },
    );
    const data = await response.json();
    if (!response.ok) {
      throw new Error(`Facebook album post failed: ${JSON.stringify(data)}`);
    }

    return { success: true, postId: data.id };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger?.error('Facebook album posting failed', {}, err);
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
    linkedinCaption,
  ] = await Promise.all([
    generateTribunalCaption('instagram', caseData).catch(() => null),
    generateTribunalCaption('facebook', caseData).catch(() => null),
    generateTribunalCaption('tiktok', caseData).catch(() => null),
    generateTribunalCaption('youtube', caseData).catch(() => null),
    generateTribunalCaption('threads', caseData).catch(() => null),
    generateTribunalCaption('linkedin', caseData).catch(() => null),
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
    if (linkedinCaption) {
      digestCaptions.push({
        platform: 'linkedin',
        caption: linkedinCaption,
        autoPosted: false,
        assetType: 'video',
      });
    }

    try {
      await sendSocialDigest(digestEmail, {
        blogTitle: `Tribunal Case: ${caseData.authority} - ${caseData.contravention}`,
        blogUrl: '',
        imageUrl: coverImageUrl ?? '',
        videoUrl,
        captions: digestCaptions,
        voiceoverTranscript: videoRecord.script || undefined,
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

  // Generate blog post (non-fatal)
  let blogPostSlug: string | null = null;
  try {
    logger.info('Generating tribunal blog post', { videoId });
    const blogResult = await generateTribunalBlogPost({
      authority: videoRecord.case.authority,
      contravention: videoRecord.case.contravention || 'Parking contravention',
      appealDecision: videoRecord.case.appealDecision,
      reasons: videoRecord.case.reasons,
      coverImageUrl,
    });

    if (blogResult.success && blogResult.slug) {
      blogPostSlug = blogResult.slug;
      const blogPostUrl = `${SITE_URL}/blog/${blogResult.slug}`;

      // Update video record with blog slug
      await db.tribunalCaseVideo.update({
        where: { id: videoId },
        data: { blogPostSlug },
      });

      // Create IG mapping if Instagram was posted successfully
      if (
        postingResults.instagram?.success &&
        postingResults.instagram.mediaId
      ) {
        await db.instagramPostBlogMapping.create({
          data: {
            instagramMediaId: postingResults.instagram.mediaId,
            blogPostSlug,
            blogPostUrl,
            contentType: 'TRIBUNAL',
            videoRecordId: videoId,
          },
        });
        logger.info('Created Instagram blog mapping', {
          mediaId: postingResults.instagram.mediaId,
          blogPostSlug,
        });
      }

      logger.info('Tribunal blog post generated', {
        slug: blogResult.slug,
        title: blogResult.title,
      });
    } else {
      logger.warn('Tribunal blog post generation failed', {
        error: blogResult.error,
      });
    }
  } catch (error) {
    logger.error(
      'Non-fatal: tribunal blog generation error',
      {},
      error instanceof Error ? error : new Error(String(error)),
    );
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
    blogPostSlug,
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
    linkedinCaption,
  ] = await Promise.all([
    generateNewsCaption('instagram', captionData).catch(() => null),
    generateNewsCaption('facebook', captionData).catch(() => null),
    generateNewsCaption('tiktok', captionData).catch(() => null),
    generateNewsCaption('youtube', captionData).catch(() => null),
    generateNewsCaption('threads', captionData).catch(() => null),
    generateNewsCaption('linkedin', captionData).catch(() => null),
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
    if (linkedinCaption) {
      digestCaptions.push({
        platform: 'linkedin',
        caption: linkedinCaption,
        autoPosted: false,
        assetType: 'video',
      });
    }

    try {
      await sendSocialDigest(digestEmail, {
        blogTitle: `UK News: ${videoRecord.headline}`,
        blogUrl: videoRecord.articleUrl,
        imageUrl: coverImageUrl ?? '',
        videoUrl,
        captions: digestCaptions,
        sourceArticleUrl: videoRecord.articleUrl,
        sourceArticleName: videoRecord.source,
        voiceoverTranscript: videoRecord.script || undefined,
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

  // Generate blog post (non-fatal)
  let blogPostSlug: string | null = null;
  try {
    logger.info('Generating news blog post', { videoId });
    const blogResult = await generateNewsBlogPost({
      headline: videoRecord.headline,
      source: videoRecord.source,
      summary: videoRecord.summary,
      category: videoRecord.category,
      articleUrl: videoRecord.articleUrl,
      coverImageUrl,
    });

    if (blogResult.success && blogResult.slug) {
      blogPostSlug = blogResult.slug;
      const blogPostUrl = `${SITE_URL}/blog/${blogResult.slug}`;

      // Update video record with blog slug
      await db.newsVideo.update({
        where: { id: videoId },
        data: { blogPostSlug },
      });

      // Create IG mapping if Instagram was posted successfully
      if (
        postingResults.instagram?.success &&
        postingResults.instagram.mediaId
      ) {
        await db.instagramPostBlogMapping.create({
          data: {
            instagramMediaId: postingResults.instagram.mediaId,
            blogPostSlug,
            blogPostUrl,
            contentType: 'NEWS',
            videoRecordId: videoId,
          },
        });
        logger.info('Created Instagram blog mapping', {
          mediaId: postingResults.instagram.mediaId,
          blogPostSlug,
        });
      }

      logger.info('News blog post generated', {
        slug: blogResult.slug,
        title: blogResult.title,
      });
    } else {
      logger.warn('News blog post generation failed', {
        error: blogResult.error,
      });
    }
  } catch (error) {
    logger.error(
      'Non-fatal: news blog generation error',
      {},
      error instanceof Error ? error : new Error(String(error)),
    );
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
    blogPostSlug,
  });
}
