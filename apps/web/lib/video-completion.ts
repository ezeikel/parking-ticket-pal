import { Readable } from 'stream';
import { generateText } from 'ai';
import { google } from 'googleapis';
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
  // Guidelines based on Perplexity Sonar Deep Research (March 2026)
  // Key finding: hashtags are now topic verification signals, NOT distribution
  // drivers across all platforms. Semantic keywords matter more.
  const guidelines: Record<string, string> = {
    instagram: `Instagram Reels caption (2026 best practices):
- Only the first 125 characters show before "See More" — front-load your hook and value prop there
- Open with a specific, benefit-focused hook (e.g. "New parking rule saves drivers £500+ if you know this one change")
- Conversational British English — like a trusted motoring expert, NOT corporate tone
- 2-3 emoji max for functional emphasis (👉 for CTAs, ✅ for steps), not decorative
- Structure: hook (first 125 chars) → key insight → engagement CTA
- CTA: specific engagement prompts like "Which parking rule surprised you most?" or "Save this for your next drive" — these drive comments which the algorithm rewards most
- HASHTAGS: Max 3-5 (Instagram now caps this). Hashtags are topic verification ONLY, not distribution drivers (confirmed by Adam Mosseri). Use niche terms like #PCN #ParkingAppeals not broad ones like #cars
- Weave keywords naturally into caption text — Instagram's algorithm uses NLP to categorise content, keywords matter more than hashtags
- Do NOT use 10+ hashtags (platform penalises this), do NOT write press-release tone`,

    facebook: `Facebook Reels caption (2026 best practices):
- Up to 250 characters — FB's older demographic reads more than Instagram's
- Open with a problem-solution hook (e.g. "Avoid this £130 PCN trap that catches thousands of drivers")
- Clear, direct British English — explain the reasoning, not just the rule. FB audience wants context
- 2-3 subtle emoji for emphasis only (🅿️⚠️), keep it practical
- Double line breaks between paragraphs; structure: hook → explanation → CTA
- CTA: share-focused like "Share with anyone who drives" or "Comment your worst parking story"
- HASHTAGS: 3-5 niche hashtags at end, but these are secondary to keyword-rich caption text. FB algorithm weights engagement signals and keyword relevance over hashtags
- Include relevant keywords naturally — FB's NLP indexes caption text for search and recommendations
- Do NOT overload emoji (feels too youthful for FB), do NOT use identical IG caption`,

    tiktok: `TikTok caption (2026 best practices):
- 50-100 characters for maximum engagement (21% higher than longer captions). For educational content, can extend to 150-250 chars
- Open with a shocking fact or question (e.g. "£200 fine in 10 seconds? Here's why 👀")
- Fun, urgent, punchy British English — authentic, not corporate
- 3-4 energetic emoji in the hook (🔥🚗❌👀)
- Single line or minimal breaks; hook + keywords + CTA
- CTA: engagement-driving like "Comment if this has happened to you" or "Stitch this with your parking story" — questions get 44% more comments
- HASHTAGS: 3-5 optimal (CapCut/ByteDance confirmed). Use the 3-3 strategy: 2 broad (#UKDriving #ParkingFine) + 3 niche content-specific (#PCNAppeal #ParkingTicketPal). Keywords in caption text are MORE powerful than hashtags for TikTok SEO
- Include searchable keywords naturally — 40% of young users search TikTok instead of Google
- Do NOT use 20+ hashtags (algorithm treats as spam), do NOT write long paragraphs`,

    youtube: `YouTube Shorts — return as JSON with "title" and "description" fields (2026 best practices):
- 70%+ of Shorts traffic now comes from SEARCH, not For You Page. Optimise for search queries
- CRITICAL: Title MUST be under 100 characters total (including hashtags and spaces). YouTube API rejects titles of 100+ characters. Aim for 60-70 characters to leave room for hashtags
- Title: keyword-frontloaded (e.g. "How to Challenge a Parking Fine in 2026 | UK Guide")
- Description: 150-200 characters with keyword appearing twice, plus supporting context
- Expert, factual British English — informative and authoritative
- 1-2 emoji max in description (📍⚠️), keep professional
- CTA: "Comment which parking rule confuses you most" or "Subscribe for more UK driving guides"
- HASHTAGS: Maximum 2, placed ONLY at the END of the title (never in description, never at start of title). Keep title + hashtags under 100 characters total. Use 1 broad + 1 niche (e.g. #UKDriving #PCN)
- Primary keyword must appear in title AND first line of description AND tags
- Do NOT put hashtags in description, do NOT exceed 100 characters in the title`,

    threads: `Threads post (2026 best practices):
- 300-500 characters — Threads is text-first, audience expects conversational depth
- Open with a story starter or hot take (e.g. "Just saw a driver get a £100 PCN for this — and honestly, the council was wrong")
- Chatty, opinionated British English — like a motoring insider sharing a genuine take, NOT polished brand content
- 1-2 supportive emoji (🤔⚠️), enhance tone without dominating
- Use paragraph breaks and questions to invite thread replies
- CTA: genuine discussion prompts like "What's your take on this?" or "Has anyone successfully appealed one of these?" — Threads rewards conversation, not broadcasting
- Use 2-3 topic tags for discoverability, but focus on writing interesting text that invites replies
- Do NOT copy the Instagram caption — Threads audience expects different, more conversational content. Do NOT use salesy CTAs. Give depth and opinion, not teasers`,

    linkedin: `LinkedIn video post caption (2026 best practices):
- First 210 characters show before "See More" — front-load the hook there
- Open with a question, stat, or bold claim (e.g. "Can a council really ignore the tribunal and get away with it?")
- Professional but accessible British English — expert positioning, insightful, credible
- Line breaks every 1-2 sentences for scannability
- 1-2 emoji max, only for functional emphasis (👉 for CTA)
- CTA: networking-focused like "Has this happened to you?" or "What would you have done in this situation?" — NOT "follow for more". LinkedIn rewards genuine discussion
- HASHTAGS: Do NOT use hashtags. LinkedIn has deprioritised hashtags entirely in 2026 — they actually SHRINK visibility. Instead, weave relevant keywords naturally into the caption text (e.g. "parking ticket appeal", "penalty charge notice", "council parking fine")
- Keywords in caption text are how LinkedIn's algorithm categorises and surfaces content
- Do NOT use Instagram tone, do NOT include hashtags, do NOT write corporate press-release language`,
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

export const postShortToYouTube = async (
  videoUrl: string,
  title: string,
  description: string,
  logger?: ReturnType<typeof createServerLogger>,
): Promise<{ success: boolean; videoId?: string; error?: string }> => {
  try {
    const clientId =
      process.env.YOUTUBE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
    const clientSecret =
      process.env.YOUTUBE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret || !process.env.YOUTUBE_REFRESH_TOKEN) {
      throw new Error('YouTube credentials not configured');
    }

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
    oauth2Client.setCredentials({
      refresh_token: process.env.YOUTUBE_REFRESH_TOKEN,
    });

    // Download video from URL
    const videoResponse = await fetch(videoUrl);
    if (!videoResponse.ok) {
      throw new Error(`Failed to download video: ${videoResponse.status}`);
    }
    const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
    const videoStream = Readable.from(videoBuffer);

    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

    const response = await youtube.videos.insert({
      part: ['snippet', 'status'],
      requestBody: {
        snippet: {
          title,
          description,
          categoryId: '27', // Education
        },
        status: {
          privacyStatus: 'public',
          selfDeclaredMadeForKids: false,
        },
      },
      media: {
        body: videoStream,
      },
    });

    logger?.info('YouTube Short posted', { videoId: response.data.id });
    return { success: true, videoId: response.data.id ?? undefined };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    // Capture full YouTube API error details
    const apiErrors = (error as { errors?: unknown })?.errors;
    const responseData = (error as { response?: { data?: unknown } })?.response
      ?.data;
    logger?.error(
      'YouTube Short posting failed',
      {
        titleLength: title.length,
        titleBytes: Buffer.byteLength(title, 'utf8'),
        ...(apiErrors ? { apiErrors: JSON.stringify(apiErrors) } : {}),
        ...(responseData ? { responseData: JSON.stringify(responseData) } : {}),
      },
      err,
    );
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

  if (youtubeCaption) {
    const fallbackTitle = `Tribunal Case: ${caseData.authority} - ${caseData.contravention}`;
    let ytTitle = fallbackTitle;
    let ytDescription = youtubeCaption;
    try {
      const parsed = JSON.parse(youtubeCaption);
      if (parsed.title) ytTitle = parsed.title;
      if (parsed.description) ytDescription = parsed.description;
    } catch {
      // fallback already set
    }
    // YouTube API rejects titles >= 100 characters
    if (ytTitle.length >= 100) {
      logger?.warn('YouTube title too long, truncating', {
        original: ytTitle,
        length: ytTitle.length,
      });
      ytTitle = `${ytTitle.slice(0, 97)}...`;
    }
    const ytResult = await postShortToYouTube(
      videoUrl,
      ytTitle,
      ytDescription,
      logger,
    );
    postingResults.youtube = ytResult;
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
        autoPosted: postingResults.youtube?.success ?? false,
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

  if (youtubeCaption) {
    const fallbackTitle = `UK News: ${videoRecord.headline}`;
    let ytTitle = fallbackTitle;
    let ytDescription = youtubeCaption;
    try {
      const parsed = JSON.parse(youtubeCaption);
      if (parsed.title) ytTitle = parsed.title;
      if (parsed.description) ytDescription = parsed.description;
    } catch {
      // fallback already set
    }
    // YouTube API rejects titles >= 100 characters
    if (ytTitle.length >= 100) {
      logger?.warn('YouTube title too long, truncating', {
        original: ytTitle,
        length: ytTitle.length,
      });
      ytTitle = `${ytTitle.slice(0, 97)}...`;
    }
    const ytResult = await postShortToYouTube(
      videoUrl,
      ytTitle,
      ytDescription,
      logger,
    );
    postingResults.youtube = ytResult;
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
        autoPosted: postingResults.youtube?.success ?? false,
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
