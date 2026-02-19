/* eslint-disable no-plusplus, import-x/prefer-default-export */
'use server';

import { generateObject, generateText } from 'ai';
import { z } from 'zod';
import { ElevenLabsClient } from 'elevenlabs';
import { db } from '@parking-ticket-pal/db';
import { createServerLogger } from '@/lib/logger';
import { put } from '@/lib/storage';
import { models, getTracedModel } from '@/lib/ai/models';
import { getRandomMusicTrack, getRandomSfx } from '@/lib/music';

const logger = createServerLogger({ action: 'tribunal-video' });

// Worker API configuration
const { WORKER_URL } = process.env;
const { WORKER_SECRET } = process.env;

// ElevenLabs configuration
const elevenlabs = process.env.ELEVENLABS_API_KEY
  ? new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY })
  : null;
const ELEVENLABS_VOICE_ID =
  process.env.ELEVENLABS_VOICE_ID || 'P6bTNc9ZMZitpFPNJFbo';

// TODO: v2 — Add avatar generation step here (e.g. HeyGen, Synthesia, D-ID)

// ============================================================================
// Step 1: Select an interesting tribunal case
// ============================================================================

type ScoredCase = {
  id: string;
  score: number;
};

/**
 * Select an interesting tribunal case that hasn't been used before.
 * Queries random cases, scores them with AI, returns the best one.
 */
const selectInterestingCase = async () => {
  logger.info('Selecting interesting tribunal case');

  // Get 50 random cases that haven't been used and have sufficient data
  const candidates = await db.$queryRaw<
    {
      id: string;
      caseReference: string;
      authority: string;
      contravention: string | null;
      contraventionLocation: string | null;
      contraventionDate: Date | null;
      penaltyAmount: number | null;
      appealDecision: string;
      reasons: string;
    }[]
  >`
    SELECT ltc.id, ltc."caseReference", ltc.authority, ltc.contravention,
           ltc."contraventionLocation", ltc."contraventionDate",
           ltc."penaltyAmount", ltc."appealDecision"::text, ltc.reasons
    FROM london_tribunal_cases ltc
    WHERE ltc.reasons IS NOT NULL
      AND ltc.reasons != ''
      AND ltc."appealDecision" IN ('ALLOWED', 'REFUSED')
      AND ltc."contraventionLocation" IS NOT NULL
      AND ltc.contravention IS NOT NULL
      AND ltc.id NOT IN (SELECT "caseId" FROM tribunal_case_videos)
    ORDER BY RANDOM()
    LIMIT 50
  `;

  if (candidates.length === 0) {
    throw new Error('No unused tribunal cases found with sufficient data');
  }

  logger.info(`Found ${candidates.length} candidate cases, scoring...`);

  // Score candidates with Gemini Flash (fast & cheap)
  const { object: scored } = await generateObject({
    model: getTracedModel(models.analytics, {
      properties: { feature: 'tribunal_video_scoring' },
    }),
    schema: z.object({
      scores: z.array(
        z.object({
          id: z.string(),
          score: z.number().min(0).max(1),
        }),
      ),
    }),
    prompt: `You are scoring parking tribunal cases for how interesting they would be as short social media videos.

Score each case from 0 (boring) to 1 (very engaging) based on:
- Surprising or unexpected outcome
- Relatable situation most drivers could face
- Clear lesson or takeaway for viewers
- Common contravention type (more relatable = higher score)
- Interesting legal reasoning or technicality
- Dramatic facts or circumstances

Cases:
${candidates
  .map(
    (c) => `ID: ${c.id}
Authority: ${c.authority}
Contravention: ${c.contravention}
Location: ${c.contraventionLocation}
Decision: ${c.appealDecision}
Reasons (excerpt): ${c.reasons.slice(0, 500)}
---`,
  )
  .join('\n')}

Return scores for all cases.`,
  });

  // Find highest scoring case
  const best = scored.scores.reduce<ScoredCase>(
    (max, current) => (current.score > max.score ? current : max),
    { id: '', score: -1 },
  );

  const selectedCase = candidates.find((c) => c.id === best.id);
  if (!selectedCase) {
    throw new Error('Best scored case not found in candidates');
  }

  logger.info('Selected case', {
    caseId: selectedCase.id,
    caseReference: selectedCase.caseReference,
    score: best.score,
    authority: selectedCase.authority,
    decision: selectedCase.appealDecision,
  });

  return { case: selectedCase, score: best.score };
};

// ============================================================================
// Step 2: Generate script with Claude Sonnet 4.5
// ============================================================================

const scriptSchema = z.object({
  hook: z
    .string()
    .describe(
      'Opening hook question or statement (1-2 sentences, grabs attention)',
    ),
  setup: z
    .string()
    .describe(
      'Sets up the situation — what happened, where, what the penalty was (2-3 sentences)',
    ),
  keyDetail: z
    .string()
    .describe(
      'The twist or interesting detail — what made this case unusual (2-3 sentences)',
    ),
  verdict: z
    .string()
    .describe("The adjudicator's decision and brief reasoning (1-2 sentences)"),
  takeaway: z
    .string()
    .describe(
      'Practical advice for viewers based on this case (1-2 sentences)',
    ),
  fullScript: z
    .string()
    .describe(
      'The complete script as one continuous piece, combining all segments. 200-250 words.',
    ),
  sceneImagePrompts: z
    .object({
      hook: z
        .string()
        .describe(
          'Image prompt for the hook scene — describe a specific visual related to THIS case',
        ),
      setup: z
        .string()
        .describe(
          'Image prompt for the setup scene — the location/situation of THIS case',
        ),
      keyDetail: z
        .string()
        .describe(
          'Image prompt for the key detail scene — the specific evidence or argument',
        ),
      verdict: z
        .string()
        .describe(
          'Image prompt for the verdict scene — the tribunal outcome mood',
        ),
      takeaway: z
        .string()
        .describe(
          'Image prompt for the takeaway scene — the lesson/advice visual',
        ),
    })
    .describe(
      'Short image prompts (1-2 sentences each) describing a specific scene to illustrate each segment. Reference actual case details like the location, contravention type, and specific circumstances. These will be rendered as soft 3D clay miniature diorama style.',
    ),
});

type ScriptSegments = z.infer<typeof scriptSchema>;

/**
 * Generate a video script for a tribunal case using Claude Sonnet 4.5.
 */
const generateScript = async (tribunalCase: {
  authority: string;
  contravention: string | null;
  contraventionLocation: string | null;
  contraventionDate: Date | null;
  penaltyAmount: number | null;
  appealDecision: string;
  reasons: string;
}): Promise<ScriptSegments> => {
  logger.info('Generating script with Claude Sonnet 4.5');

  const { object: script } = await generateObject({
    model: getTracedModel(models.creative, {
      properties: { feature: 'tribunal_video_script' },
    }),
    schema: scriptSchema,
    prompt: `You are writing a script for a 60-90 second social media video (Instagram Reel / TikTok / YouTube Short) about a real parking tribunal case.

The video tells the story of the case in an educational, engaging way — like a knowledgeable friend explaining what happened and what we can learn from it.

CASE DETAILS:
- Authority: ${tribunalCase.authority}
- Contravention: ${tribunalCase.contravention || 'Not specified'}
- Location: ${tribunalCase.contraventionLocation || 'Not specified'}
- Date: ${tribunalCase.contraventionDate ? new Date(tribunalCase.contraventionDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Not specified'}
- Penalty: ${tribunalCase.penaltyAmount ? `£${tribunalCase.penaltyAmount}` : 'Not specified'}
- Appeal Decision: ${tribunalCase.appealDecision}
- Adjudicator's Reasons: ${tribunalCase.reasons}

WRITING GUIDELINES:
- Conversational but informative British English
- Third person ("a driver received a ticket", "the motorist argued that...")
- NEVER mention the driver by name or any personal details
- Reference specific dates, amounts, locations, and adjudicator reasoning from the case
- Frame as educational: "here's a case and what we can learn from it"
- Build suspense before the verdict reveal
- Make the verdict feel dramatic — pause before revealing
- End with actionable advice viewers can use
- Target 200-250 words total (~70-90 seconds at natural speech pace)
- Keep sentences short and punchy — this is spoken, not written
- Use the case's actual legal reasoning but simplify the language
- Cite real facts from the case to add credibility

SEGMENT GUIDELINES:
- hook: Start with a question or surprising statement that makes people stop scrolling. Reference a specific detail from the case.
- setup: Describe what happened using real details — the contravention, location, date, and penalty amount.
- keyDetail: The twist — what made the driver's argument interesting, what evidence they presented, or what the council got wrong. Cite the adjudicator's actual reasoning.
- verdict: The decision — build to it dramatically. Include the adjudicator's key reasoning.
- takeaway: One clear, practical piece of advice based on this case. What can other drivers learn?

The fullScript should flow naturally when read aloud — it's the voiceover script.

SCENE IMAGE PROMPTS:
For each segment, write a short image prompt (1-2 sentences) describing a specific scene to illustrate it. These will be rendered as soft 3D clay miniature dioramas.
- Reference the actual case details: the real location, real contravention type, real circumstances
- Be specific — "a clay car parked across a dropped kerb on a residential street" not "a car parked illegally"
- Each scene should tell a visual mini-story that matches the script segment
- Verdict scene should reflect the outcome mood (warm/hopeful for allowed, cold/stern for refused)`,
  });

  logger.info('Script generated', {
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
 * Returns URL, duration, and word timestamps for subtitle sync.
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

  // Extract audio bytes
  const audioBase64 = result.audio_base64;
  if (!audioBase64) {
    throw new Error('No audio returned from ElevenLabs');
  }
  const audioBuffer = Buffer.from(audioBase64, 'base64');

  // Upload to R2
  const timestamp = Date.now();
  const r2Path = `social/voiceovers/tribunal-${timestamp}.mp3`;
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
      // End of word
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

  // Calculate duration from last word's end time
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
// Step 4: Generate sound effects
// ============================================================================

/**
 * Generate sound effects for the video (verdict gavel/chime and transition whoosh).
 * Non-fatal — returns nulls on failure.
 */
/**
 * Pick curated SFX for tribunal reel (verdict sound + transition whoosh).
 * Previously AI-generated per video via ElevenLabs — now instant from R2.
 */
const pickSoundEffects = (
  appealDecision: string,
): {
  verdictSfxUrl: string | null;
  transitionSfxUrl: string | null;
} => ({
  verdictSfxUrl: getRandomSfx(
    appealDecision === 'ALLOWED' ? 'gavel-allowed' : 'gavel-refused',
  ),
  transitionSfxUrl: getRandomSfx('transition'),
});

// ============================================================================
// Step 4c: Generate AI scene images with Gemini
// ============================================================================

type SceneImages = {
  hookImageUrl: string | null;
  setupImageUrl: string | null;
  keyDetailImageUrl: string | null;
  verdictImageUrl: string | null;
  takeawayImageUrl: string | null;
};

/**
 * Generate AI images for each scene section using Gemini 3 Pro Image.
 * Non-fatal per image — null on failure, AnimatedBackground remains as fallback.
 */
const generateSceneImages = async (sceneImagePrompts: {
  hook: string;
  setup: string;
  keyDetail: string;
  verdict: string;
  takeaway: string;
}): Promise<SceneImages> => {
  const generateSingleImage = async (
    prompt: string,
    label: string,
  ): Promise<string | null> => {
    try {
      const result = await generateText({
        model: getTracedModel(models.geminiImage, {
          properties: { feature: `tribunal_video_scene_${label}` },
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
      const r2Path = `social/scene-images/tribunal-${label}-${timestamp}.${ext}`;
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
    setupImageUrl,
    keyDetailImageUrl,
    verdictImageUrl,
    takeawayImageUrl,
  ] = await Promise.all([
    generateSingleImage(sceneImagePrompts.hook, 'hook'),
    generateSingleImage(sceneImagePrompts.setup, 'setup'),
    generateSingleImage(sceneImagePrompts.keyDetail, 'keyDetail'),
    generateSingleImage(sceneImagePrompts.verdict, 'verdict'),
    generateSingleImage(sceneImagePrompts.takeaway, 'takeaway'),
  ]);

  return {
    hookImageUrl,
    setupImageUrl,
    keyDetailImageUrl,
    verdictImageUrl,
    takeawayImageUrl,
  };
};

// ============================================================================
// Main orchestrator
// ============================================================================

/**
 * Generate and post a tribunal case video end-to-end.
 * This is the main entry point called by the cron endpoint.
 */
export const generateAndPostTribunalVideo = async () => {
  let videoRecordId: string | null = null;

  try {
    // 1. Select interesting case
    const { case: selectedCase, score } = await selectInterestingCase();

    // 2. Create tracking record
    const videoRecord = await db.tribunalCaseVideo.create({
      data: {
        caseId: selectedCase.id,
        interestScore: score,
        script: '',
        status: 'SCRIPTING',
      },
    });
    videoRecordId = videoRecord.id;

    logger.info('Created video record', { videoId: videoRecord.id });

    // 3. Generate script
    const script = await generateScript(selectedCase);

    await db.tribunalCaseVideo.update({
      where: { id: videoRecord.id },
      data: {
        script: script.fullScript,
        scriptSegments: {
          hook: script.hook,
          setup: script.setup,
          keyDetail: script.keyDetail,
          verdict: script.verdict,
          takeaway: script.takeaway,
        },
        status: 'VOICEOVER',
      },
    });

    logger.info('Script generated, generating voiceover');

    // 4. Generate voiceover + scene images in parallel; pick curated music + SFX
    const backgroundMusicUrl = getRandomMusicTrack('tribunal');
    const sfx = pickSoundEffects(selectedCase.appealDecision);

    const [voiceover, sceneImages] = await Promise.all([
      generateVoiceoverWithTimestamps(script.fullScript),
      generateSceneImages(script.sceneImagePrompts),
    ]);

    await db.tribunalCaseVideo.update({
      where: { id: videoRecord.id },
      data: {
        voiceoverUrl: voiceover.url,
        voiceoverDuration: voiceover.durationSeconds,
        wordTimestamps: voiceover.wordTimestamps,
        backgroundMusicUrl,
        verdictSfxUrl: sfx.verdictSfxUrl,
        transitionSfxUrl: sfx.transitionSfxUrl,
        sceneImages,
        status: 'RENDERING',
      },
    });

    logger.info('Audio ready, calling worker to render video', {
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
    // Prefer VERCEL_PROJECT_PRODUCTION_URL to avoid preview deployment auth issues
    const appUrl =
      process.env.NEXT_PUBLIC_URL ||
      process.env.VERCEL_PROJECT_PRODUCTION_URL ||
      process.env.VERCEL_URL;
    if (!appUrl) {
      throw new Error(
        'NEXT_PUBLIC_URL, VERCEL_PROJECT_PRODUCTION_URL, or VERCEL_URL not configured',
      );
    }
    const callbackUrl = `${appUrl.startsWith('http') ? appUrl : `https://${appUrl}`}/api/tribunal-video/complete`;

    // 5. Fire-and-forget async render to worker
    const renderResponse = await fetch(
      `${WORKER_URL}/video/render-async/tribunal-case-reel`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${WORKER_SECRET}`,
        },
        body: JSON.stringify({
          videoId: videoRecord.id,
          callbackUrl,
          authority: selectedCase.authority,
          contravention: selectedCase.contravention || 'Parking contravention',
          contraventionLocation: selectedCase.contraventionLocation || 'London',
          contraventionDate: selectedCase.contraventionDate
            ? new Date(selectedCase.contraventionDate).toLocaleDateString(
                'en-GB',
                { day: 'numeric', month: 'long', year: 'numeric' },
              )
            : 'Date not specified',
          penaltyAmount: selectedCase.penaltyAmount
            ? `\u00A3${selectedCase.penaltyAmount}`
            : 'Amount not specified',
          appealDecision: selectedCase.appealDecision,
          segments: {
            hook: script.hook,
            setup: script.setup,
            keyDetail: script.keyDetail,
            verdict: script.verdict,
            takeaway: script.takeaway,
          },
          voiceoverUrl: voiceover.url,
          voiceoverDurationSeconds: voiceover.durationSeconds,
          wordTimestamps: voiceover.wordTimestamps,
          backgroundMusicUrl,
          verdictSfxUrl: sfx.verdictSfxUrl,
          transitionSfxUrl: sfx.transitionSfxUrl,
          sceneImages,
          durationInFrames,
          coverProps: {
            authority: selectedCase.authority,
            contravention:
              selectedCase.contravention || 'Parking contravention',
            appealDecision: selectedCase.appealDecision,
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
      caseReference: selectedCase.caseReference,
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('Tribunal video pipeline failed', {}, err);

    // Update record with error if it exists
    if (videoRecordId) {
      await db.tribunalCaseVideo.update({
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
