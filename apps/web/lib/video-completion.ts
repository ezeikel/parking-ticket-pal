import { Readable } from 'stream';
import { generateText, Output } from 'ai';
import { z } from 'zod';
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
- Only the first 125 characters show before "See More". Front-load your hook and value prop there
- Open with a specific, benefit-focused hook (e.g. "New parking rule saves drivers £500+ if you know this one change")
- Conversational British English. Like a trusted motoring expert, NOT corporate tone
- 2-3 emoji max for functional emphasis, not decorative. Vary your emoji every post
- NEVER use em dashes (—). Use commas, full stops, or line breaks instead
- Structure: hook (first 125 chars), key insight, engagement CTA
- CTA must be relevant to the specific video content. Good CTAs: "Save this for your next drive", "Which part surprised you?", "Follow for more UK parking law". Bad CTAs: asking people to share rare personal experiences
- HASHTAGS: Max 3-5 (Instagram now caps this). Hashtags are topic verification ONLY, not distribution drivers (confirmed by Adam Mosseri). Use niche terms like #PCN #ParkingAppeals not broad ones like #cars
- Weave keywords naturally into caption text. Instagram's algorithm uses NLP to categorise content, keywords matter more than hashtags
- Do NOT use 10+ hashtags (platform penalises this), do NOT write press-release tone`,

    facebook: `Facebook Reels caption (2026 best practices):
- Up to 250 characters. FB's older demographic reads more than Instagram's
- Open with a problem-solution hook (e.g. "Avoid this £130 PCN trap that catches thousands of drivers")
- Clear, direct British English. Explain the reasoning, not just the rule. FB audience wants context
- 2-3 subtle emoji for emphasis only, keep it practical. Vary your emoji every post
- NEVER use em dashes (—). Use commas, full stops, or line breaks instead
- Double line breaks between paragraphs. Structure: hook, explanation, CTA
- CTA must be relevant to the specific video content. Good CTAs: "Share with anyone who drives", "Save this for later". Bad CTAs: asking people to share rare personal experiences
- HASHTAGS: 3-5 niche hashtags at end, but these are secondary to keyword-rich caption text. FB algorithm weights engagement signals and keyword relevance over hashtags
- Include relevant keywords naturally. FB's NLP indexes caption text for search and recommendations
- Do NOT overload emoji (feels too youthful for FB), do NOT use identical IG caption`,

    tiktok: `TikTok caption (2026 best practices):
- 50-100 characters for maximum engagement (21% higher than longer captions). For educational content, can extend to 150-250 chars
- Open with a shocking fact or question that makes people stop scrolling
- Fun, urgent, punchy British English. Authentic, not corporate
- 2-3 emoji max, chosen to match the specific topic. Vary your emoji every post. Do NOT default to the same set every time
- NEVER use em dashes (—). Use commas, full stops, or line breaks instead
- Single line or minimal breaks; hook + keywords + CTA
- CTA must be relevant to the video content and realistic for the audience. Good CTAs: "Save this for later", "Follow for more UK driving law", "Tag someone who needs to see this", "Drop a 🅿️ if you didn't know this". Bad CTAs: asking people to comment about rare personal experiences they almost certainly haven't had
- HASHTAGS: 3-5 optimal (CapCut/ByteDance confirmed). Use the 3-3 strategy: 2 broad (#UKDriving #ParkingFine) + 3 niche content-specific (#PCNAppeal #ParkingTicketPal). Keywords in caption text are MORE powerful than hashtags for TikTok SEO
- Include searchable keywords naturally. 40% of young users search TikTok instead of Google
- Do NOT use 20+ hashtags (algorithm treats as spam), do NOT write long paragraphs`,

    youtube: `YouTube Shorts (2026 best practices):
- 70%+ of Shorts traffic now comes from SEARCH, not For You Page. Optimise for search queries
- Title: keyword-frontloaded, under 100 characters (e.g. "How to Challenge a Parking Fine in 2026 | UK Guide"). Maximum 2 hashtags at END of title only. Use 1 broad + 1 niche (e.g. #UKDriving #PCN)
- Description: 150-200 characters with keyword appearing twice, plus supporting context
- Expert, factual British English. Informative and authoritative
- NEVER use em dashes (—) in title or description. Use commas, full stops, or pipes instead
- 1-2 emoji max in description, keep professional. Vary your emoji every post
- CTA: "Subscribe for more UK driving law" or "Save this for later"
- Primary keyword must appear in title AND first line of description
- Do NOT put hashtags in description`,

    threads: `Threads post (2026 best practices):
- 300-500 characters. Threads is text-first, audience expects conversational depth
- Open with a story starter or hot take (e.g. "Just saw a driver get a £100 PCN for this and honestly, the council was wrong")
- Chatty, opinionated British English. Like a motoring insider sharing a genuine take, NOT polished brand content
- NEVER use em dashes (—). Use commas, full stops, or line breaks instead
- 1-2 supportive emoji, enhance tone without dominating. Vary your emoji every post
- Use paragraph breaks and questions to invite thread replies
- CTA must be relevant to the specific content. Good CTAs: "What's your take?", "Thoughts?", "Follow for more UK parking law". Bad CTAs: asking people to share rare personal experiences
- Use 2-3 topic tags for discoverability, but focus on writing interesting text that invites replies
- Do NOT copy the Instagram caption. Threads audience expects different, more conversational content. Do NOT use salesy CTAs. Give depth and opinion, not teasers`,

    linkedin: `LinkedIn video post caption (2026 best practices):
- First 210 characters show before "See More". Front-load the hook there
- Open with a question, stat, or bold claim (e.g. "Can a council really ignore the tribunal and get away with it?")
- Professional but accessible British English. Expert positioning, insightful, credible
- NEVER use em dashes (—). Use commas, full stops, or line breaks instead
- Line breaks every 1-2 sentences for scannability
- 1-2 emoji max, only for functional emphasis
- CTA must be relevant to the specific content. Good CTAs: "What would you have done?", "Thoughts?", "Has your council done this?". NOT "follow for more". LinkedIn rewards genuine discussion
- HASHTAGS: Do NOT use hashtags. LinkedIn has deprioritised hashtags entirely in 2026. They actually SHRINK visibility. Instead, weave relevant keywords naturally into the caption text (e.g. "parking ticket appeal", "penalty charge notice", "council parking fine")
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
    transcript?: string;
    imageUrls?: string[];
  },
): Promise<string> => {
  const platformGuidelines = getPlatformGuidelines(platform);
  const hasImages = caseData.imageUrls && caseData.imageUrls.length > 0;

  const promptText = `Write a ${platform} caption for a short video about a parking tribunal case.

Case: ${caseData.authority} - ${caseData.contravention}
Decision: ${caseData.appealDecision === 'ALLOWED' ? 'Appeal won' : 'Appeal lost'}
Hook: ${caseData.hook}
${caseData.transcript ? `\nFull video transcript:\n${caseData.transcript}\n\nUse specific details from the transcript to write a more compelling caption. Do not just repeat the hook.` : ''}
${hasImages ? '\nScene images from the video are attached. Use the visual context to inform the tone and content of the caption.' : ''}
${platformGuidelines}`;

  const { text } = await generateText({
    model: getTracedModel(hasImages ? models.analytics : models.textFast, {
      properties: { feature: `tribunal_video_caption_${platform}` },
    }),
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: promptText },
          ...(hasImages
            ? caseData.imageUrls!.map((url) => ({
                type: 'image' as const,
                image: new URL(url),
              }))
            : []),
        ],
      },
    ],
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
    transcript?: string;
    imageUrls?: string[];
  },
): Promise<string> => {
  const platformGuidelines = getPlatformGuidelines(platform);
  const hasImages = article.imageUrls && article.imageUrls.length > 0;

  const promptText = `Write a ${platform} caption for a short video about a UK motorist news story.

Story: ${article.headline}
Source: ${article.source}
Category: ${article.category}
Hook: ${article.hook}
${article.transcript ? `\nFull video transcript:\n${article.transcript}\n\nUse specific details from the transcript to write a more compelling caption. Do not just repeat the hook.` : ''}
${hasImages ? '\nScene images from the video are attached. Use the visual context to inform the tone and content of the caption.' : ''}
${platformGuidelines}`;

  const { text } = await generateText({
    model: getTracedModel(hasImages ? models.analytics : models.textFast, {
      properties: { feature: `news_video_caption_${platform}` },
    }),
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: promptText },
          ...(hasImages
            ? article.imageUrls!.map((url) => ({
                type: 'image' as const,
                image: new URL(url),
              }))
            : []),
        ],
      },
    ],
  });

  return text;
};

// ============================================================================
// YouTube structured caption generators (title + description as typed object)
// ============================================================================

const YouTubeVideoSchema = z.object({
  title: z
    .string()
    .describe(
      'SEO-optimized YouTube Shorts title, under 100 characters including hashtags',
    ),
  description: z
    .string()
    .describe(
      'YouTube Shorts description, 150-200 characters with keywords and CTA',
    ),
});

type YouTubeCaption = z.infer<typeof YouTubeVideoSchema>;

const generateTribunalYouTubeCaption = async (caseData: {
  authority: string;
  contravention: string;
  appealDecision: string;
  hook: string;
  transcript?: string;
  imageUrls?: string[];
}): Promise<YouTubeCaption> => {
  const platformGuidelines = getPlatformGuidelines('youtube');
  const hasImages = caseData.imageUrls && caseData.imageUrls.length > 0;

  const promptText = `Write a YouTube Shorts title and description for a short video about a parking tribunal case.

Case: ${caseData.authority} - ${caseData.contravention}
Decision: ${caseData.appealDecision === 'ALLOWED' ? 'Appeal won' : 'Appeal lost'}
Hook: ${caseData.hook}
${caseData.transcript ? `\nFull video transcript:\n${caseData.transcript}\n\nUse specific details from the transcript to write a more compelling caption. Do not just repeat the hook.` : ''}
${hasImages ? '\nScene images from the video are attached. Use the visual context to inform the tone and content of the caption.' : ''}
${platformGuidelines}`;

  const { output } = await generateText({
    model: getTracedModel(hasImages ? models.analytics : models.textFast, {
      properties: { feature: 'tribunal_video_caption_youtube' },
    }),
    output: Output.object({
      schema: YouTubeVideoSchema,
      name: 'youtube_shorts',
      description: 'YouTube Shorts title and description',
    }),
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: promptText },
          ...(hasImages
            ? caseData.imageUrls!.map((url) => ({
                type: 'image' as const,
                image: new URL(url),
              }))
            : []),
        ],
      },
    ],
  });

  return {
    title:
      output?.title ||
      `Tribunal Case: ${caseData.authority} | ${caseData.contravention}`,
    description: output?.description || caseData.hook,
  };
};

const generateNewsYouTubeCaption = async (article: {
  headline: string;
  source: string;
  category: string;
  hook: string;
  transcript?: string;
  imageUrls?: string[];
}): Promise<YouTubeCaption> => {
  const platformGuidelines = getPlatformGuidelines('youtube');
  const hasImages = article.imageUrls && article.imageUrls.length > 0;

  const promptText = `Write a YouTube Shorts title and description for a short video about a UK motorist news story.

Story: ${article.headline}
Source: ${article.source}
Category: ${article.category}
Hook: ${article.hook}
${article.transcript ? `\nFull video transcript:\n${article.transcript}\n\nUse specific details from the transcript to write a more compelling caption. Do not just repeat the hook.` : ''}
${hasImages ? '\nScene images from the video are attached. Use the visual context to inform the tone and content of the caption.' : ''}
${platformGuidelines}`;

  const { output } = await generateText({
    model: getTracedModel(hasImages ? models.analytics : models.textFast, {
      properties: { feature: 'news_video_caption_youtube' },
    }),
    output: Output.object({
      schema: YouTubeVideoSchema,
      name: 'youtube_shorts',
      description: 'YouTube Shorts title and description',
    }),
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: promptText },
          ...(hasImages
            ? article.imageUrls!.map((url) => ({
                type: 'image' as const,
                image: new URL(url),
              }))
            : []),
        ],
      },
    ],
  });

  return {
    title: output?.title || `UK News: ${article.headline}`,
    description: output?.description || article.hook,
  };
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

  // Generate captions — pass transcript + scene images for richer context
  // sceneImages is stored as a JSON object with named URL fields, not an array
  const sceneImagesObj = videoRecord.sceneImages as Record<
    string,
    string | null
  > | null;
  const sceneImageUrls = sceneImagesObj
    ? Object.values(sceneImagesObj).filter(
        (url): url is string => typeof url === 'string',
      )
    : [];
  // Limit to 3 images to keep costs reasonable (cover + 2 key scenes)
  const captionImageUrls = [
    ...(coverImageUrl ? [coverImageUrl] : []),
    ...sceneImageUrls.slice(0, 2),
  ];

  const caseData = {
    authority: videoRecord.case.authority,
    contravention: videoRecord.case.contravention || 'Parking contravention',
    appealDecision: videoRecord.case.appealDecision,
    hook: scriptSegments?.hook || '',
    transcript: videoRecord.script,
    imageUrls: captionImageUrls.length > 0 ? captionImageUrls : undefined,
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
    generateTribunalYouTubeCaption(caseData).catch(() => null),
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
    let ytTitle = youtubeCaption.title;
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
      youtubeCaption.description,
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
        caption: `${youtubeCaption.title}\n\n${youtubeCaption.description}`,
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

  // Generate captions — pass transcript + scene images for richer context
  const newsSceneImagesObj = videoRecord.sceneImages as Record<
    string,
    string | null
  > | null;
  const newsSceneImageUrls = newsSceneImagesObj
    ? Object.values(newsSceneImagesObj).filter(
        (url): url is string => typeof url === 'string',
      )
    : [];
  const newsCaptionImageUrls = [
    ...(coverImageUrl ? [coverImageUrl] : []),
    ...newsSceneImageUrls.slice(0, 2),
  ];

  const captionData = {
    headline: videoRecord.headline,
    source: videoRecord.source,
    category: videoRecord.category,
    hook: scriptSegments?.hook || '',
    transcript: videoRecord.script,
    imageUrls:
      newsCaptionImageUrls.length > 0 ? newsCaptionImageUrls : undefined,
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
    generateNewsYouTubeCaption(captionData).catch(() => null),
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
    let ytTitle = youtubeCaption.title;
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
      youtubeCaption.description,
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
        caption: `${youtubeCaption.title}\n\n${youtubeCaption.description}`,
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
