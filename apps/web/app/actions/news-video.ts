/* eslint-disable no-plusplus, no-restricted-syntax, import-x/prefer-default-export */
'use server';

import { generateObject, generateText } from 'ai';
import { z } from 'zod';
import { createHash } from 'crypto';
import { ElevenLabsClient } from 'elevenlabs';
import { db } from '@parking-ticket-pal/db';
import { createServerLogger } from '@/lib/logger';
import { put } from '@/lib/storage';
import { models, getTracedModel } from '@/lib/ai/models';
import { getRandomMusicTrack } from '@/lib/music';

const logger = createServerLogger({ action: 'news-video' });

// Worker API configuration
const { WORKER_URL } = process.env;
const { WORKER_SECRET } = process.env;

// ElevenLabs configuration
const elevenlabs = process.env.ELEVENLABS_API_KEY
  ? new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY })
  : null;
const ELEVENLABS_VOICE_ID =
  process.env.ELEVENLABS_VOICE_ID || 'P6bTNc9ZMZitpFPNJFbo';

// ============================================================================
// Step 1: Discover news articles via Perplexity Sonar
// ============================================================================

type DiscoveredArticle = {
  url: string;
  source: string;
  headline: string;
  category: string;
  summary: string;
  interestScore: number;
};

/**
 * Discover a fresh UK motorist news article using Perplexity Sonar.
 * Deduplicates against previously processed articles.
 * Returns the highest-scoring new article, or null if none found.
 */
const discoverNews = async (): Promise<DiscoveredArticle | null> => {
  logger.info('Discovering UK motorist news via Perplexity');

  // 1. Search for recent UK motorist news
  const { text: searchResults } = await generateText({
    model: getTracedModel(models.search, {
      properties: { feature: 'news_video_discovery' },
    }),
    prompt: `Find the most interesting UK motorist news stories from the last 24 hours from reputable UK news sources.

IMPORTANT: Only include articles from proper news websites — BBC News, The Guardian, The Telegraph, Daily Mail, The Sun, Mirror, The Times, Sky News, ITV News, Express, Metro, Evening Standard, local UK newspapers, AutoExpress, What Car, Honest John, RAC, AA, Autocar, Car Magazine. Do NOT include YouTube videos, Reddit posts, or social media content.

Topics to search for:
- Parking fines and PCN changes
- New driving laws and regulations
- Congestion charges and ULEZ updates
- Electric vehicle news (charging, incentives, bans)
- Car insurance changes
- Vehicle tax and MOT updates
- Speed cameras and traffic enforcement
- Fuel prices
- Council parking revenue stories
- Road closures and major traffic news

For each story, provide:
1. The article URL (must be a news website, not YouTube)
2. The source publication (e.g., "BBC News", "The Guardian", "Daily Mail")
3. The headline
4. A 2-3 sentence summary
5. Category: PARKING, DRIVING, CONGESTION, EV, INSURANCE, TAX, or TRAFFIC

Focus on stories that would generate strong reactions from UK motorists — stories about unfair fines, new charges, controversial rules, or surprising statistics.

Return at least 5 stories if available.`,
  });

  logger.info('Perplexity search results received', {
    resultLength: searchResults.length,
    preview: searchResults.slice(0, 500),
  });

  // 2. Parse into structured articles
  const { object: parsed } = await generateObject({
    model: getTracedModel(models.textFast, {
      properties: { feature: 'news_video_parse' },
    }),
    schema: z.object({
      articles: z.array(
        z.object({
          url: z.string(),
          source: z.string(),
          headline: z.string(),
          category: z.enum([
            'PARKING',
            'DRIVING',
            'CONGESTION',
            'EV',
            'INSURANCE',
            'TAX',
            'TRAFFIC',
          ]),
          summary: z.string(),
        }),
      ),
    }),
    prompt: `Extract structured article data from the following search results. Return each distinct article with its URL, source, headline, category, and summary.

Search results:
${searchResults}`,
  });

  if (parsed.articles.length === 0) {
    logger.info('No articles found in search results');
    return null;
  }

  logger.info(
    `Found ${parsed.articles.length} articles, checking for duplicates`,
  );

  // 3. Deduplicate against existing records
  const urlHashes = parsed.articles.map((a) => ({
    ...a,
    hash: createHash('sha256').update(a.url).digest('hex'),
  }));

  const existing = await db.newsVideo.findMany({
    where: {
      articleUrlHash: { in: urlHashes.map((a) => a.hash) },
    },
    select: { articleUrlHash: true },
  });

  const existingHashes = new Set(existing.map((e) => e.articleUrlHash));
  const newArticles = urlHashes.filter((a) => !existingHashes.has(a.hash));

  if (newArticles.length === 0) {
    logger.info('All discovered articles already processed');
    return null;
  }

  logger.info(`${newArticles.length} new articles found, scoring`);

  // 4. Score articles for engagement potential
  const { object: scored } = await generateObject({
    model: getTracedModel(models.analytics, {
      properties: { feature: 'news_video_scoring' },
    }),
    schema: z.object({
      scores: z.array(
        z.object({
          url: z.string(),
          score: z.number().min(0).max(1),
        }),
      ),
    }),
    prompt: `Score each news article for how engaging it would be as a short social media video for UK motorists.

Score from 0 (boring) to 1 (extremely engaging) based on:
- Outrage factor: Will this make drivers angry? (unfair fines, new charges, council revenue grabs)
- Relatability: Could this affect most UK drivers?
- Discussion potential: Will people argue about this in comments?
- Visual potential: Can this be illustrated with interesting scenes?
- Timeliness: Is this breaking or developing news?
- Shareability: Would someone tag their friends?

Articles:
${newArticles.map((a) => `URL: ${a.url}\nSource: ${a.source}\nHeadline: ${a.headline}\nCategory: ${a.category}\nSummary: ${a.summary}\n---`).join('\n')}

Return scores for all articles.`,
  });

  // 5. Find highest scoring article
  const scoreMap = new Map(scored.scores.map((s) => [s.url, s.score]));
  let bestArticle = newArticles[0];
  let bestScore = 0;

  for (const article of newArticles) {
    const score = scoreMap.get(article.url) || 0;
    if (score > bestScore) {
      bestScore = score;
      bestArticle = article;
    }
  }

  logger.info('Selected article', {
    headline: bestArticle.headline,
    source: bestArticle.source,
    category: bestArticle.category,
    score: bestScore,
  });

  return {
    url: bestArticle.url,
    source: bestArticle.source,
    headline: bestArticle.headline,
    category: bestArticle.category,
    summary: bestArticle.summary,
    interestScore: bestScore,
  };
};

// ============================================================================
// Step 2: Generate script with Claude Sonnet 4.5
// ============================================================================

const newsScriptSchema = z.object({
  hook: z
    .string()
    .describe(
      'Opening hook — grabs attention, makes people stop scrolling (1-2 sentences)',
    ),
  context: z
    .string()
    .describe('What happened — the key facts of the story (2-3 sentences)'),
  keyDetail: z
    .string()
    .describe(
      'The surprising or infuriating detail that makes this story stand out (2-3 sentences)',
    ),
  impact: z
    .string()
    .describe(
      'How this affects everyday drivers — make it personal (1-2 sentences)',
    ),
  cta: z
    .string()
    .describe(
      'Call to action — ask a question, spark debate, invite comments (1-2 sentences)',
    ),
  fullScript: z
    .string()
    .describe(
      'The complete script as one continuous piece, combining all segments. 200-250 words.',
    ),
  sceneImagePrompts: z
    .object({
      hook: z.string().describe('Image prompt for the hook scene'),
      context: z.string().describe('Image prompt for the context scene'),
      keyDetail: z.string().describe('Image prompt for the key detail scene'),
      impact: z.string().describe('Image prompt for the impact scene'),
      cta: z.string().describe('Image prompt for the CTA scene'),
    })
    .describe(
      'Short image prompts (1-2 sentences each) for clay diorama style scenes',
    ),
});

type NewsScriptSegments = z.infer<typeof newsScriptSchema>;

/**
 * Generate a video script for a news article using Claude Sonnet 4.5.
 */
const generateNewsScript = async (article: {
  headline: string;
  source: string;
  category: string;
  summary: string;
}): Promise<NewsScriptSegments> => {
  logger.info('Generating news script with Claude Sonnet 4.5');

  const { object: script } = await generateObject({
    model: getTracedModel(models.creative, {
      properties: { feature: 'news_video_script' },
    }),
    schema: newsScriptSchema,
    prompt: `You are writing a script for a 60-90 second social media video (Instagram Reel / TikTok / YouTube Short) about a real UK motorist news story.

The video tells the story in an educational, engaging way — like a knowledgeable friend explaining what happened and what we can learn from it.

ARTICLE:
- Headline: ${article.headline}
- Source: ${article.source}
- Category: ${article.category}
- Summary: ${article.summary}

WRITING GUIDELINES:
- Conversational but informative British English
- Third person ("drivers could face...", "councils are now...", "a motorist was fined...")
- Reference specific facts, numbers, dates, and locations from the article
- Frame as educational: "here's what's happening and what we can learn from it"
- Build suspense before revealing the key detail
- End with actionable advice viewers can use
- Target 200-250 words total (~70-90 seconds at natural speech pace)
- Keep sentences short and punchy — this is spoken, not written
- Simplify any legal or technical language for a general audience
- Cite real facts from the article to add credibility

SEGMENT GUIDELINES:
- hook: Start with a question or surprising statement that makes people stop scrolling. Reference a specific detail from the story.
- context: The core facts — what's happening, who's involved, where. Use real details from the article.
- keyDetail: The twist or detail that makes this story interesting — the surprising statistic, the hidden catch, or the unexpected consequence. Cite actual facts.
- impact: What this means for everyday drivers — make it practical and relatable.
- cta: One clear, practical piece of advice based on this story. What can other drivers learn or do?

The fullScript should flow naturally when read aloud — it's the voiceover script.

SCENE IMAGE PROMPTS:
For each segment, write a short image prompt (1-2 sentences) describing a specific scene. These will be rendered as soft 3D clay miniature dioramas.
- Reference the actual story details: real locations, real situations
- Be specific — "a clay parking meter on a busy high street with a council warden writing a ticket" not "a parking scene"
- Each scene should tell a visual mini-story matching the script segment`,
  });

  logger.info('News script generated', {
    wordCount: script.fullScript.split(/\s+/).length,
  });

  return script;
};

// ============================================================================
// Step 3: Generate voiceover with word-level timestamps
// ============================================================================

type WordTimestamp = {
  word: string;
  startTime: number;
  endTime: number;
};

/**
 * Generate voiceover audio with word-level timestamps using ElevenLabs.
 */
const generateVoiceoverWithTimestamps = async (
  script: string,
): Promise<{
  url: string;
  durationSeconds: number;
  wordTimestamps: WordTimestamp[];
}> => {
  if (!elevenlabs) {
    throw new Error('ElevenLabs not configured');
  }

  logger.info('Generating voiceover with timestamps', {
    scriptLength: script.length,
  });

  const result = await elevenlabs.textToSpeech.convertWithTimestamps(
    ELEVENLABS_VOICE_ID,
    {
      text: script,
      model_id: 'eleven_v3',
      output_format: 'mp3_44100_128',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.3,
        use_speaker_boost: true,
        speed: 0.95,
      },
    },
  );

  const audioBase64 = result.audio_base64;
  if (!audioBase64) {
    throw new Error('No audio returned from ElevenLabs');
  }
  const audioBuffer = Buffer.from(audioBase64, 'base64');

  const timestamp = Date.now();
  const r2Path = `social/voiceovers/news-${timestamp}.mp3`;
  const { url } = await put(r2Path, audioBuffer, {
    contentType: 'audio/mpeg',
  });

  // Derive word-level timestamps from character alignment
  const { alignment } = result;
  if (
    !alignment ||
    !alignment.characters ||
    !alignment.character_start_times_seconds ||
    !alignment.character_end_times_seconds
  ) {
    throw new Error('No alignment data returned from ElevenLabs');
  }

  const wordTimestamps: WordTimestamp[] = [];
  let currentWord = '';
  let wordStart = 0;
  let wordEnd = 0;

  for (let i = 0; i < alignment.characters.length; i++) {
    const char = alignment.characters[i];
    const startTime = alignment.character_start_times_seconds[i];
    const endTime = alignment.character_end_times_seconds[i];

    if (char === ' ' || i === alignment.characters.length - 1) {
      if (i === alignment.characters.length - 1 && char !== ' ') {
        currentWord += char;
        wordEnd = endTime;
      }

      if (currentWord.trim()) {
        wordTimestamps.push({
          word: currentWord.trim(),
          startTime: wordStart,
          endTime: wordEnd,
        });
      }
      currentWord = '';
      wordStart = endTime;
    } else {
      if (currentWord === '') {
        wordStart = startTime;
      }
      currentWord += char;
      wordEnd = endTime;
    }
  }

  const durationSeconds =
    wordTimestamps.length > 0
      ? wordTimestamps[wordTimestamps.length - 1].endTime
      : 0;

  logger.info('Voiceover generated', {
    url,
    durationSeconds,
    wordCount: wordTimestamps.length,
  });

  return { url, durationSeconds, wordTimestamps };
};

// ============================================================================
// Step 4: Generate background music + SFX
// ============================================================================

/**
 * Generate sound effects for news reel (transition whoosh + news alert).
 */
const generateSoundEffects = async (): Promise<{
  transitionSfxUrl: string | null;
  newsSfxUrl: string | null;
}> => {
  if (!elevenlabs) {
    logger.info('ElevenLabs not configured, skipping sound effects');
    return { transitionSfxUrl: null, newsSfxUrl: null };
  }

  const generateSfx = async (
    text: string,
    durationSeconds: number,
    label: string,
  ): Promise<string | null> => {
    try {
      const audioStream = await elevenlabs.textToSoundEffects.convert({
        text,
        duration_seconds: durationSeconds,
      });

      const chunks: Buffer[] = [];
      for await (const chunk of audioStream) {
        chunks.push(Buffer.from(chunk));
      }
      const buffer = Buffer.concat(chunks);

      const timestamp = Date.now();
      const r2Path = `social/sfx/news-${label}-${timestamp}.mp3`;
      const { url } = await put(r2Path, buffer, {
        contentType: 'audio/mpeg',
      });

      logger.info(`SFX generated: ${label}`, { url });
      return url;
    } catch (error) {
      logger.error(
        `SFX generation failed: ${label}`,
        {},
        error instanceof Error ? error : new Error(String(error)),
      );
      return null;
    }
  };

  const [transitionSfxUrl, newsSfxUrl] = await Promise.all([
    generateSfx(
      'crisp paper page turn flip sound, single clean page flip, short snappy',
      1,
      'transition',
    ),
    generateSfx(
      'short bright digital chime, then a subtle low braam, modern news broadcast alert sting',
      2,
      'news-alert',
    ),
  ]);

  return { transitionSfxUrl, newsSfxUrl };
};

// ============================================================================
// Step 4c: Generate AI scene images with Gemini
// ============================================================================

type NewsSceneImages = {
  hookImageUrl: string | null;
  contextImageUrl: string | null;
  keyDetailImageUrl: string | null;
  impactImageUrl: string | null;
  ctaImageUrl: string | null;
};

/**
 * Generate AI images for each scene section using Gemini 3 Pro Image.
 */
const generateSceneImages = async (sceneImagePrompts: {
  hook: string;
  context: string;
  keyDetail: string;
  impact: string;
  cta: string;
}): Promise<NewsSceneImages> => {
  const generateSingleImage = async (
    prompt: string,
    label: string,
  ): Promise<string | null> => {
    try {
      const result = await generateText({
        model: getTracedModel(models.geminiImage, {
          properties: { feature: `news_video_scene_${label}` },
        }),
        prompt: `Generate a soft 3D clay miniature diorama scene. Stylised, warm tilt-shift look, rounded shapes, matte clay textures, soft studio lighting. No text in the image. ${prompt}`,
      });

      const imageFile = result.files?.find((f) =>
        f.mediaType?.startsWith('image/'),
      );

      if (!imageFile) {
        logger.error(`Scene image generation returned no image: ${label}`);
        return null;
      }

      const buffer = Buffer.from(imageFile.uint8Array);
      const timestamp = Date.now();
      const ext = imageFile.mediaType === 'image/png' ? 'png' : 'jpg';
      const r2Path = `social/scene-images/news-${label}-${timestamp}.${ext}`;
      const { url } = await put(r2Path, buffer, {
        contentType: imageFile.mediaType,
      });

      logger.info(`Scene image generated: ${label}`, { url });
      return url;
    } catch (error) {
      logger.error(
        `Scene image generation failed: ${label}`,
        {},
        error instanceof Error ? error : new Error(String(error)),
      );
      return null;
    }
  };

  const [
    hookImageUrl,
    contextImageUrl,
    keyDetailImageUrl,
    impactImageUrl,
    ctaImageUrl,
  ] = await Promise.all([
    generateSingleImage(sceneImagePrompts.hook, 'hook'),
    generateSingleImage(sceneImagePrompts.context, 'context'),
    generateSingleImage(sceneImagePrompts.keyDetail, 'keyDetail'),
    generateSingleImage(sceneImagePrompts.impact, 'impact'),
    generateSingleImage(sceneImagePrompts.cta, 'cta'),
  ]);

  return {
    hookImageUrl,
    contextImageUrl,
    keyDetailImageUrl,
    impactImageUrl,
    ctaImageUrl,
  };
};

// ============================================================================
// Main orchestrator
// ============================================================================

/**
 * Generate and post a news video end-to-end.
 * This is the main entry point called by the cron endpoint.
 */
export const generateAndPostNewsVideo = async () => {
  let videoRecordId: string | null = null;

  try {
    // 1. Discover news article
    const article = await discoverNews();

    if (!article) {
      logger.info('No new articles found, skipping');
      return { success: true, skipped: true };
    }

    // 2. Create tracking record
    const articleUrlHash = createHash('sha256')
      .update(article.url)
      .digest('hex');

    const videoRecord = await db.newsVideo.create({
      data: {
        articleUrl: article.url,
        articleUrlHash,
        source: article.source,
        headline: article.headline,
        category: article.category,
        summary: article.summary,
        interestScore: article.interestScore,
        script: '',
        status: 'SCRIPTING',
      },
    });
    videoRecordId = videoRecord.id;

    logger.info('Created news video record', { videoId: videoRecord.id });

    // 3. Generate script
    const script = await generateNewsScript(article);

    await db.newsVideo.update({
      where: { id: videoRecord.id },
      data: {
        script: script.fullScript,
        scriptSegments: {
          hook: script.hook,
          context: script.context,
          keyDetail: script.keyDetail,
          impact: script.impact,
          cta: script.cta,
        },
        sceneImagePrompts: script.sceneImagePrompts,
        status: 'VOICEOVER',
      },
    });

    logger.info('Script generated, generating audio + images');

    // 4. Generate voiceover + SFX + scene images in parallel; pick curated music track
    const backgroundMusicUrl = getRandomMusicTrack('news');

    const [voiceover, sfx, sceneImages] = await Promise.all([
      generateVoiceoverWithTimestamps(script.fullScript),
      generateSoundEffects(),
      generateSceneImages(script.sceneImagePrompts),
    ]);

    await db.newsVideo.update({
      where: { id: videoRecord.id },
      data: {
        voiceoverUrl: voiceover.url,
        voiceoverDuration: voiceover.durationSeconds,
        wordTimestamps: voiceover.wordTimestamps,
        backgroundMusicUrl,
        transitionSfxUrl: sfx.transitionSfxUrl,
        newsSfxUrl: sfx.newsSfxUrl,
        sceneImages,
        status: 'RENDERING',
      },
    });

    logger.info('Audio + images ready, calling worker to render', {
      durationSeconds: voiceover.durationSeconds,
      wordCount: voiceover.wordTimestamps.length,
    });

    // 5. Call worker to render video
    if (!WORKER_URL || !WORKER_SECRET) {
      throw new Error('Worker URL or secret not configured');
    }

    // Add 3 second buffer for outro
    const durationInFrames = Math.ceil((voiceover.durationSeconds + 3) * 30);

    // Build the callback URL for the worker to call when rendering is done
    const appUrl = process.env.NEXT_PUBLIC_URL || process.env.VERCEL_URL;
    if (!appUrl) {
      throw new Error('NEXT_PUBLIC_URL or VERCEL_URL not configured');
    }
    const callbackUrl = `${appUrl.startsWith('http') ? appUrl : `https://${appUrl}`}/api/news-video/complete`;

    // 5. Fire-and-forget async render to worker
    const renderResponse = await fetch(
      `${WORKER_URL}/video/render-async/news-reel`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${WORKER_SECRET}`,
        },
        body: JSON.stringify({
          videoId: videoRecord.id,
          callbackUrl,
          headline: article.headline,
          source: article.source,
          category: article.category,
          segments: {
            hook: script.hook,
            context: script.context,
            keyDetail: script.keyDetail,
            impact: script.impact,
            cta: script.cta,
          },
          voiceoverUrl: voiceover.url,
          voiceoverDurationSeconds: voiceover.durationSeconds,
          wordTimestamps: voiceover.wordTimestamps,
          backgroundMusicUrl,
          transitionSfxUrl: sfx.transitionSfxUrl,
          newsSfxUrl: sfx.newsSfxUrl,
          sceneImages,
          durationInFrames,
          coverProps: {
            headline: article.headline,
            source: article.source,
            category: article.category,
            hookText: script.hook,
            coverImageUrl: sceneImages.hookImageUrl,
          },
        }),
      },
    );

    const renderData = await renderResponse.json();

    if (!renderResponse.ok || !renderData.success) {
      throw new Error(
        `Worker async render failed: ${renderData.error || renderResponse.statusText}`,
      );
    }

    logger.info('Async render dispatched to worker', {
      videoId: videoRecord.id,
      callbackUrl,
    });

    // Return immediately — the worker will call the webhook when done
    return {
      success: true,
      videoId: videoRecord.id,
      status: 'RENDERING',
      headline: article.headline,
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('News video pipeline failed', {}, err);

    if (videoRecordId) {
      await db.newsVideo.update({
        where: { id: videoRecordId },
        data: {
          status: 'FAILED',
          errorMessage: err.message,
        },
      });
    }

    return {
      success: false,
      error: err.message,
      videoId: videoRecordId ?? undefined,
    };
  }
};
