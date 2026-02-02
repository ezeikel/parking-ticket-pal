/* eslint-disable import/prefer-default-export */

'use server';

import sharp from 'sharp';
import { generateText } from 'ai';
import { ElevenLabsClient } from 'elevenlabs';
import { PostPlatform, type Post } from '@/types';
import openai from '@/lib/openai';
import { OPENAI_MODEL_GPT_4O } from '@/constants';
import { createServerLogger } from '@/lib/logger';
import { put, del } from '@/lib/storage';
import { models } from '@/lib/ai/models';
import { sendSocialDigest, type SocialDigestCaption } from '@/lib/email';

const logger = createServerLogger({ action: 'social' });

// Worker API configuration
const WORKER_URL = process.env.WORKER_URL;
const WORKER_SECRET = process.env.WORKER_SECRET;

// ElevenLabs configuration
const elevenlabs = process.env.ELEVENLABS_API_KEY
  ? new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY })
  : null;
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'P6bTNc9ZMZitpFPNJFbo'; // Default: Custom voice

/**
 * Generate Instagram image by calling the OG image endpoint
 */
const generateInstagramImage = async (post: Post): Promise<Buffer> => {
  try {
    // use the existing OG image endpoint to generate the image
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      process.env.VERCEL_URL ||
      'http://localhost:3000';
    const ogImageUrl = `${baseUrl}/blog/${post.meta.slug}/opengraph-image`;

    // fetch the OG image
    const response = await fetch(ogImageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch OG image: ${response.statusText}`);
    }

    const imageBuffer = Buffer.from(await response.arrayBuffer());

    // convert to Instagram format (1080x1080) using Sharp
    const instagramBuffer = await sharp(imageBuffer)
      .resize(1080, 1080, {
        fit: 'cover',
        position: 'center',
      })
      .flatten({ background: '#ffffff' })
      .jpeg({
        quality: 100,
        progressive: true,
      })
      .toBuffer();

    return instagramBuffer;
  } catch (error) {
    logger.error(
      'Error generating Instagram image',
      {
        slug: post.meta.slug,
        title: post.meta.title,
      },
      error instanceof Error ? error : new Error(String(error)),
    );
    throw error;
  }
};

/**
 * Generate LinkedIn image by using the existing OG image
 */
const generateLinkedInImage = async (post: Post): Promise<Buffer> => {
  try {
    // use the existing OG image endpoint to generate the image
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      process.env.VERCEL_URL ||
      'http://localhost:3000';
    const ogImageUrl = `${baseUrl}/blog/${post.meta.slug}/opengraph-image`;

    // fetch the OG image
    const response = await fetch(ogImageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch OG image: ${response.statusText}`);
    }

    const imageBuffer = Buffer.from(await response.arrayBuffer());

    // LinkedIn prefers 1200x627 (similar to Facebook but slightly different aspect)
    const linkedinBuffer = await sharp(imageBuffer)
      .resize(1200, 627, {
        fit: 'cover',
        position: 'center',
      })
      .flatten({ background: '#ffffff' })
      .jpeg({
        quality: 95,
        progressive: true,
      })
      .toBuffer();

    return linkedinBuffer;
  } catch (error) {
    logger.error(
      'Error generating LinkedIn image',
      {
        slug: post.meta.slug,
        title: post.meta.title,
      },
      error instanceof Error ? error : new Error(String(error)),
    );
    throw error;
  }
};

/**
 * Generate Facebook image by using the existing OG image
 */
const generateFacebookImage = async (post: Post): Promise<Buffer> => {
  try {
    // use the existing OG image endpoint to generate the image
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      process.env.VERCEL_URL ||
      'http://localhost:3000';
    const ogImageUrl = `${baseUrl}/blog/${post.meta.slug}/opengraph-image`;

    // fetch the OG image
    const response = await fetch(ogImageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch OG image: ${response.statusText}`);
    }

    const imageBuffer = Buffer.from(await response.arrayBuffer());

    // the OG image is already 1200x630 (perfect for Facebook), just convert to JPEG
    const facebookBuffer = await sharp(imageBuffer)
      .flatten({ background: '#ffffff' })
      .jpeg({
        quality: 95,
        progressive: true,
      })
      .toBuffer();

    return facebookBuffer;
  } catch (error) {
    logger.error(
      'Error generating Facebook image',
      {
        slug: post.meta.slug,
        title: post.meta.title,
      },
      error instanceof Error ? error : new Error(String(error)),
    );
    throw error;
  }
};

/**
 * Upload image to temporary storage and return public URL
 */
const uploadToTempStorage = async (
  imageBuffer: Buffer,
  platform: PostPlatform,
): Promise<string> => {
  const tempFileName = `temp/social/${platform}/${Date.now()}-${Math.random().toString(36).substring(2)}.jpg`;

  try {
    const { url } = await put(tempFileName, imageBuffer, {
      contentType: 'image/jpeg',
    });

    return url;
  } catch (error) {
    logger.error(
      'Error saving temporary image',
      {
        platform,
        tempFileName,
      },
      error instanceof Error ? error : new Error(String(error)),
    );
    throw error;
  }
};

/**
 * Clean up temporary image
 */
const cleanupTempImage = async (imageUrl: string): Promise<void> => {
  try {
    const { pathname } = new URL(imageUrl);
    await del(pathname);
  } catch (error) {
    logger.error(
      'Error cleaning up temporary image',
      {
        imageUrl,
      },
      error instanceof Error ? error : new Error(String(error)),
    );
  }
};

/**
 * Generate Instagram caption
 */
const generateInstagramCaption = async (post: Post): Promise<string> => {
  const prompt = `You are a social media expert creating Instagram captions for a UK parking and traffic law website called "Parking Ticket Pal".

Create an engaging Instagram caption that:
- Starts with an attention-grabbing hook
- Briefly explains the key takeaway from the blog post
- Uses relevant emojis (but not too many)
- Includes relevant hashtags (5-8 hashtags max)
- Ends with "Link in bio for the full guide 📖"
- Keeps it concise (under 150 words)
- Uses UK terminology and context

The caption should be informative but accessible, helping people understand their parking rights and responsibilities.`;

  try {
    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL_GPT_4O,
      messages: [
        {
          role: 'system',
          content: prompt,
        },
        {
          role: 'user',
          content: `Generate an Instagram caption for this blog post:
Title: ${post.meta.title}
Summary: ${post.meta.summary}
Tags: ${post.meta.tags.join(', ')}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 300,
    });

    return response.choices[0].message.content || '';
  } catch (error) {
    logger.error(
      'Error generating Instagram caption',
      {
        slug: post.meta.slug,
        title: post.meta.title,
      },
      error instanceof Error ? error : new Error(String(error)),
    );
    throw error;
  }
};

/**
 * Generate LinkedIn caption
 */
const generateLinkedInCaption = async (
  post: Post,
  blogUrl: string,
): Promise<string> => {
  const prompt = `You are a social media expert creating LinkedIn posts for a UK parking and traffic law website called "Parking Ticket Pal".

Create a professional LinkedIn post that:
- Starts with a professional hook relevant to business owners/HR professionals
- Focuses on how this affects businesses and employees
- Provides 2-3 key professional insights
- Uses professional tone with light business emojis
- Includes relevant business hashtags
- Ends with a clear call-to-action to read the full article
- Is professional but engaging (150-200 words)
- Uses UK business terminology
- Focuses on compliance, employee rights, and business implications

The post should position you as a thought leader in UK parking/traffic law.`;

  try {
    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL_GPT_4O,
      messages: [
        {
          role: 'system',
          content: prompt,
        },
        {
          role: 'user',
          content: `Generate a LinkedIn post for this blog article:
Title: ${post.meta.title}
Summary: ${post.meta.summary}
Tags: ${post.meta.tags.join(', ')}
Blog URL: ${blogUrl}

Include the blog URL at the end of the post.`,
        },
      ],
      temperature: 0.7,
      max_tokens: 400,
    });

    return response.choices[0].message.content || '';
  } catch (error) {
    logger.error(
      'Error generating LinkedIn caption',
      {
        slug: post.meta.slug,
        title: post.meta.title,
        blogUrl,
      },
      error instanceof Error ? error : new Error(String(error)),
    );
    throw error;
  }
};

/**
 * Generate Facebook caption
 */
const generateFacebookCaption = async (
  post: Post,
  blogUrl: string,
): Promise<string> => {
  const prompt = `You are a social media expert creating Facebook posts for a UK parking and traffic law website called "Parking Ticket Pal".

Create an engaging Facebook post that:
- Starts with an attention-grabbing question or statement
- Provides a substantial preview of the blog content (2-3 key points)
- Uses a conversational, helpful tone
- Includes relevant emojis sparingly
- Ends with a clear call-to-action to read the full article
- Is longer than Instagram (200-300 words is fine)
- Uses UK terminology and context
- Focuses on helping people understand their rights
- Uses PLAIN TEXT ONLY - NO markdown formatting (no **bold**, no *italic*, no # headers)
- Use CAPS, line breaks, and emojis for emphasis instead of markdown

The post should provide real value while encouraging clicks to read more.`;

  try {
    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL_GPT_4O,
      messages: [
        {
          role: 'system',
          content: prompt,
        },
        {
          role: 'user',
          content: `Generate a Facebook post for this blog article:
Title: ${post.meta.title}
Summary: ${post.meta.summary}
Tags: ${post.meta.tags.join(', ')}
Blog URL: ${blogUrl}

Include the blog URL at the end of the post.`,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    return response.choices[0].message.content || '';
  } catch (error) {
    logger.error(
      'Error generating Facebook caption',
      {
        slug: post.meta.slug,
        title: post.meta.title,
        blogUrl,
      },
      error instanceof Error ? error : new Error(String(error)),
    );
    throw error;
  }
};

/**
 * Generate Facebook Reel/video caption
 */
const generateFacebookReelCaption = async (
  post: Post,
  blogUrl: string,
): Promise<string> => {
  const prompt = `You are creating a Facebook video/Reel caption for a UK parking/traffic law website called "Parking Ticket Pal".

Create a caption that:
- Starts with a hook that references watching the video
- Is concise (under 150 words)
- Uses relevant emojis
- Includes the blog URL for more info
- Uses UK terminology
- Uses PLAIN TEXT ONLY - NO markdown formatting

Title: ${post.meta.title}
Summary: ${post.meta.summary}
Blog URL: ${blogUrl}`;

  try {
    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL_GPT_4O,
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: 'Generate the Facebook video caption.' },
      ],
      temperature: 0.7,
      max_tokens: 250,
    });

    return response.choices[0].message.content || '';
  } catch (error) {
    logger.error(
      'Error generating Facebook Reel caption',
      {
        slug: post.meta.slug,
        title: post.meta.title,
      },
      error instanceof Error ? error : new Error(String(error)),
    );
    throw error;
  }
};

/**
 * Generate TikTok caption
 * Short, hashtag-heavy, trend-focused for younger audience
 */
const generateTikTokCaption = async (post: Post): Promise<string> => {
  const prompt = `You are creating a TikTok caption for a UK parking/traffic law website called "Parking Ticket Pal".

Create a caption that:
- Is SHORT (under 150 characters visible without tapping "more")
- Starts with a strong hook/question
- Uses casual, Gen-Z friendly tone
- Includes 8-10 relevant hashtags
- NO links (not clickable on TikTok)
- Uses UK terminology

Title: ${post.meta.title}
Summary: ${post.meta.summary}`;

  try {
    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL_GPT_4O,
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: 'Generate the TikTok caption.' },
      ],
      temperature: 0.7,
      max_tokens: 200,
    });

    return response.choices[0].message.content || '';
  } catch (error) {
    logger.error(
      'Error generating TikTok caption',
      {
        slug: post.meta.slug,
        title: post.meta.title,
      },
      error instanceof Error ? error : new Error(String(error)),
    );
    throw error;
  }
};

/**
 * Generate YouTube Shorts caption
 * SEO-focused with title and description
 */
const generateYouTubeShortsCaption = async (
  post: Post,
  blogUrl: string,
): Promise<{ title: string; description: string }> => {
  const prompt = `You are creating a YouTube Shorts title and description for a UK parking/traffic law website called "Parking Ticket Pal".

Create content that:
- Title: Under 100 characters, SEO-optimized, attention-grabbing
- Description: Include the blog URL, relevant keywords, and hashtags
- Include #Shorts hashtag (required for Shorts)
- Uses UK terminology
- Focus on search discoverability

Title: ${post.meta.title}
Summary: ${post.meta.summary}
Blog URL: ${blogUrl}

Return in JSON format: {"title": "...", "description": "..."}`;

  try {
    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL_GPT_4O,
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: 'Generate the YouTube Shorts title and description.' },
      ],
      temperature: 0.7,
      max_tokens: 400,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content || '{}';
    const parsed = JSON.parse(content);
    return {
      title: parsed.title || post.meta.title,
      description: parsed.description || post.meta.summary,
    };
  } catch (error) {
    logger.error(
      'Error generating YouTube Shorts caption',
      {
        slug: post.meta.slug,
        title: post.meta.title,
      },
      error instanceof Error ? error : new Error(String(error)),
    );
    throw error;
  }
};

/**
 * Generate Threads caption
 * Conversational, Instagram-adjacent, opinion-driven
 */
const generateThreadsCaption = async (
  post: Post,
  blogUrl: string,
): Promise<string> => {
  const prompt = `You are creating a Threads caption for a UK parking/traffic law website called "Parking Ticket Pal".

Create a caption that:
- Is conversational and opinion-driven
- Can be longer form (200-300 words is fine)
- NO hashtags (not widely used on Threads)
- Mentions "also posted on Instagram" or cross-promotes
- Includes the blog URL
- Starts with a thought-provoking statement or question
- Uses UK terminology
- Feels personal and engaging

Title: ${post.meta.title}
Summary: ${post.meta.summary}
Blog URL: ${blogUrl}`;

  try {
    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL_GPT_4O,
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: 'Generate the Threads caption.' },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    return response.choices[0].message.content || '';
  } catch (error) {
    logger.error(
      'Error generating Threads caption',
      {
        slug: post.meta.slug,
        title: post.meta.title,
      },
      error instanceof Error ? error : new Error(String(error)),
    );
    throw error;
  }
};

/**
 * Generate engaging hook for Reel using Gemini 3 Flash (Vercel AI SDK)
 */
const generateReelHook = async (
  post: Post,
  blogContent: string,
): Promise<string> => {
  try {
    const { text } = await generateText({
      model: models.analytics, // Gemini 3 Flash - fast and cost-effective
      prompt: `You are writing a short, engaging hook for an Instagram Reel voiceover.

CRITICAL: The hook must be spoken in under 4 seconds. This means:
- MAXIMUM 50 characters (strict limit)
- One short sentence only
- No filler words

The hook should:
- Create curiosity or urgency
- NOT use "..." at the end
- NOT be clickbait, but genuinely interesting
- Sound natural when spoken aloud

Blog title: ${post.meta.title}
Blog content excerpt: ${blogContent.slice(0, 1500)}

Return ONLY the hook text, nothing else. Remember: 50 characters MAX.`,
    });

    // Enforce character limit as safety net
    const trimmed = text.trim();
    if (trimmed.length > 60) {
      // Truncate at last complete word within limit
      const truncated = trimmed.substring(0, 60).replace(/\s+\S*$/, '');
      return truncated;
    }
    return trimmed;
  } catch (error) {
    logger.error(
      'Error generating Reel hook',
      {
        slug: post.meta.slug,
        title: post.meta.title,
      },
      error instanceof Error ? error : new Error(String(error)),
    );
    throw error;
  }
};

/**
 * Generate voiceover audio from text using ElevenLabs TTS
 * Returns URL of uploaded audio file, or null if ElevenLabs not configured
 */
const generateVoiceover = async (text: string): Promise<string | null> => {
  if (!elevenlabs) {
    logger.info('ElevenLabs not configured, skipping voiceover generation', {
      hasApiKey: !!process.env.ELEVENLABS_API_KEY,
    });
    return null;
  }

  try {
    logger.info('Generating voiceover with ElevenLabs', {
      textLength: text.length,
      voiceId: ELEVENLABS_VOICE_ID,
    });

    const audioStream = await elevenlabs.textToSpeech.convert(
      ELEVENLABS_VOICE_ID,
      {
        text,
        model_id: 'eleven_turbo_v2_5', // Latest and fastest model
        output_format: 'mp3_44100_128',
      },
    );

    // Collect stream chunks into buffer
    const chunks: Buffer[] = [];
    for await (const chunk of audioStream) {
      chunks.push(Buffer.from(chunk));
    }
    const buffer = Buffer.concat(chunks);

    // Upload to temp storage
    const fileName = `temp/audio/voiceover-${Date.now()}-${Math.random().toString(36).substring(2)}.mp3`;
    const { url } = await put(fileName, buffer, {
      contentType: 'audio/mpeg',
    });

    logger.info('Voiceover generated and uploaded', { url });
    return url;
  } catch (error) {
    const errorInstance = error instanceof Error ? error : new Error(String(error));
    logger.error(
      'Error generating voiceover',
      {
        textLength: text.length,
        errorMessage: errorInstance.message,
        errorName: errorInstance.name,
      },
      errorInstance,
    );
    return null; // Non-fatal, continue without voiceover
  }
};

/**
 * Generate loopable ambient background music using ElevenLabs Sound Effects
 * Returns URL of uploaded audio file, or null if ElevenLabs not configured
 */
const generateBackgroundMusic = async (
  durationSeconds: number,
): Promise<string | null> => {
  if (!elevenlabs) {
    logger.info('ElevenLabs not configured, skipping background music');
    return null;
  }

  try {
    logger.info('Generating background music with ElevenLabs', {
      durationSeconds,
    });

    const audioStream = await elevenlabs.textToSoundEffects.convert({
      text: 'calm ambient corporate background music, subtle, professional, modern',
      duration_seconds: durationSeconds,
    });

    // Collect stream chunks into buffer
    const chunks: Buffer[] = [];
    for await (const chunk of audioStream) {
      chunks.push(Buffer.from(chunk));
    }
    const buffer = Buffer.concat(chunks);

    // Upload to temp storage
    const fileName = `temp/audio/bgmusic-${Date.now()}-${Math.random().toString(36).substring(2)}.mp3`;
    const { url } = await put(fileName, buffer, {
      contentType: 'audio/mpeg',
    });

    logger.info('Background music generated and uploaded', { url });
    return url;
  } catch (error) {
    logger.error(
      'Error generating background music',
      { durationSeconds },
      error instanceof Error ? error : new Error(String(error)),
    );
    return null; // Non-fatal, continue without music
  }
};

/**
 * Generate Instagram Reel caption (different tone than static post)
 */
const generateInstagramReelCaption = async (post: Post): Promise<string> => {
  const prompt = `You are creating an Instagram Reel caption for a UK parking/traffic law website called "Parking Ticket Pal".

Create a caption that:
- Starts with a hook that references the video (e.g., "Watch this before you...")
- Is shorter than a regular post (under 100 words)
- Uses relevant emojis
- Includes 5-8 hashtags
- Ends with "Link in bio for the full guide 📖"
- Uses UK terminology

Title: ${post.meta.title}
Summary: ${post.meta.summary}`;

  try {
    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL_GPT_4O,
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: 'Generate the Reel caption.' },
      ],
      temperature: 0.7,
      max_tokens: 200,
    });

    return response.choices[0].message.content || '';
  } catch (error) {
    logger.error(
      'Error generating Instagram Reel caption',
      {
        slug: post.meta.slug,
        title: post.meta.title,
      },
      error instanceof Error ? error : new Error(String(error)),
    );
    throw error;
  }
};

/**
 * Generate Instagram Reel video via Remotion worker
 */
const generateInstagramReelVideo = async (
  post: Post,
  blogContent: string,
): Promise<string> => {
  if (!WORKER_URL || !WORKER_SECRET) {
    throw new Error('Worker URL or secret not configured');
  }

  // 1. Generate engaging hook from blog content using Gemini Flash
  const hook = await generateReelHook(post, blogContent);

  logger.info('Generated Reel hook', {
    slug: post.meta.slug,
    hook,
  });

  // 2. Generate audio in parallel (non-blocking, returns null if fails)
  const VIDEO_DURATION_SECONDS = 6;
  const [voiceoverUrl, backgroundMusicUrl] = await Promise.all([
    generateVoiceover(hook),
    generateBackgroundMusic(VIDEO_DURATION_SECONDS),
  ]);

  logger.info('Audio generation complete', {
    slug: post.meta.slug,
    hasVoiceover: !!voiceoverUrl,
    hasBackgroundMusic: !!backgroundMusicUrl,
  });

  // 3. Call worker to render video with optional audio
  const response = await fetch(`${WORKER_URL}/video/render/blog-reel`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${WORKER_SECRET}`,
    },
    body: JSON.stringify({
      title: post.meta.title,
      excerpt: hook,
      featuredImageUrl: post.meta.image,
      voiceoverUrl,
      backgroundMusicUrl,
    }),
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(
      `Worker render failed: ${data.error || response.statusText}`,
    );
  }

  return data.url; // R2 URL of rendered video
};

// Instagram API functions
const createInstagramMediaContainer = async (
  imageUrl: string,
  caption: string,
) => {
  const response = await fetch(
    `https://graph.facebook.com/v24.0/${process.env.INSTAGRAM_ACCOUNT_ID}/media`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_url: imageUrl,
        caption,
        access_token: process.env.FACEBOOK_PAGE_ACCESS_TOKEN,
      }),
    },
  );

  const data = await response.json();
  if (!data.id) {
    throw new Error(
      `Failed to create Instagram media container: ${JSON.stringify(data)}`,
    );
  }
  return data.id;
};

/**
 * Check Instagram media container status
 * Returns status_code: 'FINISHED', 'IN_PROGRESS', or 'ERROR'
 */
const checkInstagramMediaStatus = async (
  creationId: string,
): Promise<{ status: string; error?: string }> => {
  const response = await fetch(
    `https://graph.facebook.com/v24.0/${creationId}?fields=status_code,status&access_token=${process.env.FACEBOOK_PAGE_ACCESS_TOKEN}`,
  );
  const data = await response.json();
  return {
    status: data.status_code || 'UNKNOWN',
    error: data.status,
  };
};

/**
 * Wait for Instagram media container to be ready
 * Polls every 2 seconds for up to 30 seconds
 */
const waitForInstagramMediaReady = async (creationId: string): Promise<void> => {
  const maxAttempts = 15;
  const delayMs = 2000;

  for (let i = 0; i < maxAttempts; i++) {
    const { status, error } = await checkInstagramMediaStatus(creationId);

    if (status === 'FINISHED') {
      return;
    }

    if (status === 'ERROR') {
      throw new Error(`Instagram media processing failed: ${error}`);
    }

    logger.info('Waiting for Instagram media to be ready', {
      attempt: i + 1,
      maxAttempts,
      status,
    });

    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  throw new Error('Instagram media processing timed out');
};

/**
 * Create Instagram Reel media container
 * @param videoUrl - URL of the video file
 * @param caption - Caption for the Reel
 * @param coverUrl - Optional URL for cover image (must be from same domain as video)
 */
const createInstagramReelContainer = async (
  videoUrl: string,
  caption: string,
  coverUrl?: string,
): Promise<string> => {
  const payload: Record<string, unknown> = {
    video_url: videoUrl,
    caption,
    media_type: 'REELS',
    share_to_feed: true, // Also show in main feed
    access_token: process.env.FACEBOOK_PAGE_ACCESS_TOKEN,
  };

  // Add cover image if provided
  if (coverUrl) {
    payload.cover_url = coverUrl;
  }

  const response = await fetch(
    `https://graph.facebook.com/v24.0/${process.env.INSTAGRAM_ACCOUNT_ID}/media`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );
  const data = await response.json();
  if (!data.id) {
    throw new Error(
      `Failed to create Instagram Reel container: ${JSON.stringify(data)}`,
    );
  }
  return data.id;
};

const publishInstagramMedia = async (creationId: string) => {
  // Wait for media container to be ready before publishing
  await waitForInstagramMediaReady(creationId);

  const response = await fetch(
    `https://graph.facebook.com/v24.0/${process.env.INSTAGRAM_ACCOUNT_ID}/media_publish`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        creation_id: creationId,
        access_token: process.env.FACEBOOK_PAGE_ACCESS_TOKEN,
      }),
    },
  );

  const data = await response.json();
  if (!data.id) {
    throw new Error(
      `Failed to publish Instagram media: ${JSON.stringify(data)}`,
    );
  }
  return data.id;
};

// LinkedIn API functions
const postToLinkedInPage = async (message: string, imageUrl: string) => {
  // first, register the image with LinkedIn
  const registerImageResponse = await fetch(
    `https://api.linkedin.com/v2/assets?action=registerUpload`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.LINKEDIN_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        registerUploadRequest: {
          recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
          owner: `urn:li:organization:${process.env.LINKEDIN_ORGANIZATION_ID}`,
        },
      }),
    },
  );

  const registerData = await registerImageResponse.json();
  if (
    !registerData.value?.uploadMechanism?.[
      'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'
    ]
  ) {
    throw new Error(
      `Failed to register LinkedIn image: ${JSON.stringify(registerData)}`,
    );
  }

  const { uploadUrl } =
    registerData.value.uploadMechanism[
      'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'
    ];
  const { asset } = registerData.value;

  // download and upload the image to LinkedIn
  const imageResponse = await fetch(imageUrl);
  const imageBuffer = await imageResponse.arrayBuffer();

  await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.LINKEDIN_ACCESS_TOKEN}`,
    },
    body: imageBuffer,
  });

  // create the post
  const postResponse = await fetch(`https://api.linkedin.com/v2/ugcPosts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.LINKEDIN_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      author: `urn:li:organization:${process.env.LINKEDIN_ORGANIZATION_ID}`,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: {
            text: message,
          },
          shareMediaCategory: 'IMAGE',
          media: [
            {
              status: 'READY',
              media: asset,
            },
          ],
        },
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
      },
    }),
  });

  const postData = await postResponse.json();
  if (!postData.id) {
    throw new Error(`Failed to post to LinkedIn: ${JSON.stringify(postData)}`);
  }
  return postData.id;
};

// Facebook API functions
const postToFacebookPage = async (message: string, imageUrl: string) => {
  const response = await fetch(
    `https://graph.facebook.com/v24.0/${process.env.FACEBOOK_PAGE_ID}/photos`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: imageUrl,
        message,
        access_token: process.env.FACEBOOK_PAGE_ACCESS_TOKEN,
      }),
    },
  );

  const data = await response.json();
  if (!data.id) {
    throw new Error(`Failed to post to Facebook: ${JSON.stringify(data)}`);
  }
  return data.id;
};

/**
 * Post video/Reel to Facebook Page
 */
const postVideoToFacebookPage = async (
  videoUrl: string,
  description: string,
  title: string,
) => {
  const response = await fetch(
    `https://graph.facebook.com/v24.0/${process.env.FACEBOOK_PAGE_ID}/videos`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        file_url: videoUrl,
        description,
        title,
        access_token: process.env.FACEBOOK_PAGE_ACCESS_TOKEN,
      }),
    },
  );

  const data = await response.json();
  if (!data.id) {
    throw new Error(`Failed to post video to Facebook: ${JSON.stringify(data)}`);
  }
  return data.id;
};

/**
 * Post blog content to social media platforms
 */
export const postToSocialMedia = async (params: {
  post: Post;
  platforms?: PostPlatform[];
  blogContent?: string; // Required for Reel generation
}): Promise<{
  success: boolean;
  results: Record<
    string,
    {
      success: boolean;
      mediaId?: string;
      postId?: string;
      caption?: string;
      error?: string;
    }
  >;
  post: {
    slug: string;
    title: string;
  };
  error?: string;
}> => {
  let instagramImageUrl: string | null = null;
  let facebookImageUrl: string | null = null;
  let linkedinImageUrl: string | null = null;

  try {
    const { post, platforms = ['instagram', 'facebook', 'linkedin'] } = params;

    logger.info('Starting social media posting', {
      slug: post.meta.slug,
      title: post.meta.title,
      platforms,
    });

    const blogUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/blog/${post.meta.slug}`;
    const results: Record<
      string,
      {
        success: boolean;
        mediaId?: string;
        postId?: string;
        caption?: string;
        error?: string;
      }
    > = {};

    // Post to Instagram
    if (platforms.includes('instagram')) {
      try {
        if (
          !process.env.INSTAGRAM_ACCOUNT_ID ||
          !process.env.FACEBOOK_PAGE_ACCESS_TOKEN
        ) {
          throw new Error('Instagram credentials not configured');
        }

        logger.info('Generating Instagram image', {
          slug: post.meta.slug,
        });
        const instagramImage = await generateInstagramImage(post);

        logger.info('Uploading Instagram image', {
          slug: post.meta.slug,
        });
        instagramImageUrl = await uploadToTempStorage(
          instagramImage,
          'instagram',
        );

        logger.info('Generating Instagram caption', {
          slug: post.meta.slug,
        });
        const instagramCaption = await generateInstagramCaption(post);

        logger.info('Creating Instagram media container', {
          slug: post.meta.slug,
        });
        const creationId = await createInstagramMediaContainer(
          instagramImageUrl,
          instagramCaption,
        );

        logger.info('Publishing Instagram media', {
          slug: post.meta.slug,
        });
        const mediaId = await publishInstagramMedia(creationId);

        results.instagram = {
          success: true,
          mediaId,
          caption: instagramCaption,
        };

        logger.info('Successfully posted to Instagram', {
          slug: post.meta.slug,
          mediaId,
        });
      } catch (error) {
        const errorInstance =
          error instanceof Error ? error : new Error(String(error));
        logger.error(
          'Instagram posting failed',
          {
            slug: post.meta.slug,
            title: post.meta.title,
          },
          errorInstance,
        );
        results.instagram = {
          success: false,
          error: errorInstance.message,
        };
      }

      // Post Instagram Reel (separate from static image)
      if (params.blogContent) {
        try {
          logger.info('Generating Instagram Reel video', {
            slug: post.meta.slug,
          });
          const reelVideoUrl = await generateInstagramReelVideo(
            post,
            params.blogContent,
          );

          logger.info('Generating Reel caption', { slug: post.meta.slug });
          const reelCaption = await generateInstagramReelCaption(post);

          logger.info('Creating Reel container', { slug: post.meta.slug });
          // Use the Instagram image as the Reel cover if available
          const reelCreationId = await createInstagramReelContainer(
            reelVideoUrl,
            reelCaption,
            instagramImageUrl || undefined,
          );

          logger.info('Publishing Reel', { slug: post.meta.slug });
          const reelMediaId = await publishInstagramMedia(reelCreationId);

          results.instagramReel = {
            success: true,
            mediaId: reelMediaId,
            caption: reelCaption,
          };

          logger.info('Successfully posted Instagram Reel', {
            slug: post.meta.slug,
            mediaId: reelMediaId,
          });
        } catch (error) {
          const errorInstance =
            error instanceof Error ? error : new Error(String(error));
          logger.error(
            'Instagram Reel posting failed',
            {
              slug: post.meta.slug,
              title: post.meta.title,
            },
            errorInstance,
          );
          results.instagramReel = {
            success: false,
            error: errorInstance.message,
          };
        }
      } else {
        logger.info('Skipping Instagram Reel - no blog content provided', {
          slug: post.meta.slug,
        });
      }
    }

    // Post to Facebook
    if (platforms.includes('facebook')) {
      try {
        if (
          !process.env.FACEBOOK_PAGE_ID ||
          !process.env.FACEBOOK_PAGE_ACCESS_TOKEN
        ) {
          throw new Error('Facebook credentials not configured');
        }

        logger.info('Generating Facebook image', {
          slug: post.meta.slug,
        });
        const facebookImage = await generateFacebookImage(post);

        logger.info('Uploading Facebook image', {
          slug: post.meta.slug,
        });
        facebookImageUrl = await uploadToTempStorage(facebookImage, 'facebook');

        logger.info('Generating Facebook caption', {
          slug: post.meta.slug,
        });
        const facebookCaption = await generateFacebookCaption(post, blogUrl);

        logger.info('Posting to Facebook', {
          slug: post.meta.slug,
        });
        const postId = await postToFacebookPage(
          facebookCaption,
          facebookImageUrl,
        );

        results.facebook = {
          success: true,
          postId,
          caption: facebookCaption,
        };

        logger.info('Successfully posted to Facebook', {
          slug: post.meta.slug,
          postId,
        });
      } catch (error) {
        const errorInstance =
          error instanceof Error ? error : new Error(String(error));
        logger.error(
          'Facebook posting failed',
          {
            slug: post.meta.slug,
            title: post.meta.title,
          },
          errorInstance,
        );
        results.facebook = {
          success: false,
          error: errorInstance.message,
        };
      }

      // Post Facebook Reel/Video (reuse the Instagram Reel video if available)
      if (params.blogContent) {
        try {
          // Generate video (or reuse if already generated for Instagram)
          logger.info('Generating Facebook Reel video', {
            slug: post.meta.slug,
          });
          const reelVideoUrl = await generateInstagramReelVideo(
            post,
            params.blogContent,
          );

          logger.info('Generating Facebook Reel caption', {
            slug: post.meta.slug,
          });
          const facebookReelCaption = await generateFacebookReelCaption(
            post,
            blogUrl,
          );

          logger.info('Posting video to Facebook', { slug: post.meta.slug });
          const videoPostId = await postVideoToFacebookPage(
            reelVideoUrl,
            facebookReelCaption,
            post.meta.title,
          );

          results.facebookReel = {
            success: true,
            postId: videoPostId,
            caption: facebookReelCaption,
          };

          logger.info('Successfully posted Facebook Reel', {
            slug: post.meta.slug,
            postId: videoPostId,
          });
        } catch (error) {
          const errorInstance =
            error instanceof Error ? error : new Error(String(error));
          logger.error(
            'Facebook Reel posting failed',
            {
              slug: post.meta.slug,
              title: post.meta.title,
            },
            errorInstance,
          );
          results.facebookReel = {
            success: false,
            error: errorInstance.message,
          };
        }
      } else {
        logger.info('Skipping Facebook Reel - no blog content provided', {
          slug: post.meta.slug,
        });
      }
    }

    // Post to LinkedIn
    if (platforms.includes('linkedin')) {
      try {
        if (
          !process.env.LINKEDIN_ORGANIZATION_ID ||
          !process.env.LINKEDIN_ACCESS_TOKEN
        ) {
          throw new Error('LinkedIn credentials not configured');
        }

        logger.info('Generating LinkedIn image', {
          slug: post.meta.slug,
        });
        const linkedinImage = await generateLinkedInImage(post);

        logger.info('Uploading LinkedIn image', {
          slug: post.meta.slug,
        });
        linkedinImageUrl = await uploadToTempStorage(linkedinImage, 'linkedin');

        logger.info('Generating LinkedIn caption', {
          slug: post.meta.slug,
        });
        const linkedinCaption = await generateLinkedInCaption(post, blogUrl);

        logger.info('Posting to LinkedIn', {
          slug: post.meta.slug,
        });

        const postId = await postToLinkedInPage(
          linkedinCaption,
          linkedinImageUrl,
        );

        results.linkedin = {
          success: true,
          postId,
          caption: linkedinCaption,
        };

        logger.info('Successfully posted to LinkedIn', {
          slug: post.meta.slug,
          postId,
        });
      } catch (error) {
        const errorInstance =
          error instanceof Error ? error : new Error(String(error));
        logger.error(
          'LinkedIn posting failed',
          {
            slug: post.meta.slug,
            title: post.meta.title,
          },
          errorInstance,
        );
        results.linkedin = {
          success: false,
          error: errorInstance.message,
        };
      }
    }

    // Generate captions for manual platforms (TikTok, YouTube Shorts, Threads)
    // These are not auto-posted but included in the digest email
    const manualCaptions: Record<string, string | { title: string; description: string }> = {};

    logger.info('Generating captions for manual platforms', {
      slug: post.meta.slug,
    });

    // Generate all manual captions in parallel
    const [tiktokCaption, youtubeShortsCaption, threadsCaption] = await Promise.all([
      generateTikTokCaption(post).catch((error) => {
        logger.error('Error generating TikTok caption', { slug: post.meta.slug }, error);
        return null;
      }),
      generateYouTubeShortsCaption(post, blogUrl).catch((error) => {
        logger.error('Error generating YouTube Shorts caption', { slug: post.meta.slug }, error);
        return null;
      }),
      generateThreadsCaption(post, blogUrl).catch((error) => {
        logger.error('Error generating Threads caption', { slug: post.meta.slug }, error);
        return null;
      }),
    ]);

    if (tiktokCaption) manualCaptions.tiktok = tiktokCaption;
    if (youtubeShortsCaption) manualCaptions.youtubeShorts = youtubeShortsCaption;
    if (threadsCaption) manualCaptions.threads = threadsCaption;

    // Get LinkedIn caption if we didn't auto-post (for digest)
    if (!results.linkedin?.caption) {
      try {
        const linkedinCaptionForDigest = await generateLinkedInCaption(post, blogUrl);
        manualCaptions.linkedin = linkedinCaptionForDigest;
      } catch (error) {
        logger.error(
          'Error generating LinkedIn caption for digest',
          { slug: post.meta.slug },
          error instanceof Error ? error : new Error(String(error)),
        );
      }
    }

    // Send email digest if configured
    const digestEmail = process.env.SOCIAL_DIGEST_EMAIL;
    if (digestEmail) {
      logger.info('Sending social digest email', {
        slug: post.meta.slug,
        to: digestEmail,
      });

      // Build captions list for email
      const digestCaptions: SocialDigestCaption[] = [];

      // Add auto-posted platforms
      if (results.instagram?.caption) {
        digestCaptions.push({
          platform: 'instagram',
          caption: results.instagram.caption,
          autoPosted: results.instagram.success,
          assetType: 'image',
        });
      }
      if (results.instagramReel?.caption) {
        digestCaptions.push({
          platform: 'instagramReel',
          caption: results.instagramReel.caption,
          autoPosted: results.instagramReel.success,
          assetType: 'video',
        });
      }
      if (results.facebook?.caption) {
        digestCaptions.push({
          platform: 'facebook',
          caption: results.facebook.caption,
          autoPosted: results.facebook.success,
          assetType: 'image',
        });
      }
      if (results.facebookReel?.caption) {
        digestCaptions.push({
          platform: 'facebookReel',
          caption: results.facebookReel.caption,
          autoPosted: results.facebookReel.success,
          assetType: 'video',
        });
      }
      if (results.linkedin?.caption) {
        digestCaptions.push({
          platform: 'linkedin',
          caption: results.linkedin.caption,
          autoPosted: results.linkedin.success,
          assetType: 'image',
        });
      } else if (typeof manualCaptions.linkedin === 'string') {
        digestCaptions.push({
          platform: 'linkedin',
          caption: manualCaptions.linkedin,
          autoPosted: false,
          assetType: 'image',
        });
      }

      // Add manual platforms
      if (typeof manualCaptions.tiktok === 'string') {
        digestCaptions.push({
          platform: 'tiktok',
          caption: manualCaptions.tiktok,
          autoPosted: false,
          assetType: 'video',
        });
      }
      if (manualCaptions.youtubeShorts && typeof manualCaptions.youtubeShorts === 'object') {
        digestCaptions.push({
          platform: 'youtubeShorts',
          caption: '',
          title: manualCaptions.youtubeShorts.title,
          description: manualCaptions.youtubeShorts.description,
          autoPosted: false,
          assetType: 'video',
        });
      }
      if (typeof manualCaptions.threads === 'string') {
        digestCaptions.push({
          platform: 'threads',
          caption: manualCaptions.threads,
          autoPosted: false,
          assetType: 'both',
        });
      }

      // Get asset URLs (use Instagram image as the main image, video URL from results)
      const imageAssetUrl = instagramImageUrl || facebookImageUrl || linkedinImageUrl || '';
      const videoAssetUrl = results.instagramReel?.mediaId
        ? `https://www.instagram.com/reel/${results.instagramReel.mediaId}/`
        : '';

      try {
        const emailResult = await sendSocialDigest(digestEmail, {
          blogTitle: post.meta.title,
          blogUrl,
          imageUrl: imageAssetUrl,
          videoUrl: videoAssetUrl,
          captions: digestCaptions,
        });

        if (emailResult.success) {
          logger.info('Social digest email sent successfully', {
            slug: post.meta.slug,
            to: digestEmail,
            messageId: emailResult.messageId,
          });
        } else {
          logger.error(
            'Social digest email failed to send',
            { slug: post.meta.slug, to: digestEmail },
            new Error(emailResult.error || 'Unknown email error'),
          );
        }
      } catch (error) {
        logger.error(
          'Failed to send social digest email',
          { slug: post.meta.slug, to: digestEmail },
          error instanceof Error ? error : new Error(String(error)),
        );
      }
    }

    const hasSuccess = Object.values(results).some((result) => result.success);

    return {
      success: hasSuccess,
      results,
      post: {
        slug: post.meta.slug,
        title: post.meta.title,
      },
    };
  } catch (error) {
    const errorInstance =
      error instanceof Error ? error : new Error(String(error));
    logger.error(
      'Error in social media posting',
      {
        slug: params.post?.meta?.slug || 'unknown',
        platforms: params.platforms,
      },
      errorInstance,
    );

    return {
      success: false,
      results: {},
      post: {
        slug: '',
        title: '',
      },
      error: errorInstance.message,
    };
  } finally {
    // Clean up temporary images
    if (instagramImageUrl) {
      try {
        await cleanupTempImage(instagramImageUrl);
      } catch (error) {
        logger.error(
          'Error cleaning up Instagram image',
          {
            instagramImageUrl,
          },
          error instanceof Error ? error : new Error(String(error)),
        );
      }
    }
    if (facebookImageUrl) {
      try {
        await cleanupTempImage(facebookImageUrl);
      } catch (error) {
        logger.error(
          'Error cleaning up Facebook image',
          {
            facebookImageUrl,
          },
          error instanceof Error ? error : new Error(String(error)),
        );
      }
    }
    if (linkedinImageUrl) {
      try {
        await cleanupTempImage(linkedinImageUrl);
      } catch (error) {
        logger.error(
          'Error cleaning up LinkedIn image',
          {
            linkedinImageUrl,
          },
          error instanceof Error ? error : new Error(String(error)),
        );
      }
    }
  }
};
