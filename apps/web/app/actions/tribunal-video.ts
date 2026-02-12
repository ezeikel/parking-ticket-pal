'use server';

import { generateObject, generateText } from 'ai';
import { z } from 'zod';
import { ElevenLabsClient } from 'elevenlabs';
import { db } from '@parking-ticket-pal/db';
import { createServerLogger } from '@/lib/logger';
import { put } from '@/lib/storage';
import { models, getTracedModel } from '@/lib/ai/models';
import { sendSocialDigest, type SocialDigestCaption } from '@/lib/email';
import { getRandomMusicTrack } from '@/lib/music';

const logger = createServerLogger({ action: 'tribunal-video' });

// Worker API configuration
const WORKER_URL = process.env.WORKER_URL;
const WORKER_SECRET = process.env.WORKER_SECRET;

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
    Array<{
      id: string;
      caseReference: string;
      authority: string;
      contravention: string | null;
      contraventionLocation: string | null;
      contraventionDate: Date | null;
      penaltyAmount: number | null;
      appealDecision: string;
      reasons: string;
    }>
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
        })
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
${candidates.map((c) => `ID: ${c.id}
Authority: ${c.authority}
Contravention: ${c.contravention}
Location: ${c.contraventionLocation}
Decision: ${c.appealDecision}
Reasons (excerpt): ${c.reasons.slice(0, 500)}
---`).join('\n')}

Return scores for all cases.`,
  });

  // Find highest scoring case
  const best = scored.scores.reduce<ScoredCase>(
    (max, current) => (current.score > max.score ? current : max),
    { id: '', score: -1 }
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
      'Opening hook question or statement (1-2 sentences, grabs attention)'
    ),
  setup: z
    .string()
    .describe(
      'Sets up the situation — what happened, where, what the penalty was (2-3 sentences)'
    ),
  keyDetail: z
    .string()
    .describe(
      'The twist or interesting detail — what made this case unusual (2-3 sentences)'
    ),
  verdict: z
    .string()
    .describe(
      'The adjudicator\'s decision and brief reasoning (1-2 sentences)'
    ),
  takeaway: z
    .string()
    .describe(
      'Practical advice for viewers based on this case (1-2 sentences)'
    ),
  fullScript: z
    .string()
    .describe(
      'The complete script as one continuous piece, combining all segments. 200-250 words.'
    ),
  sceneImagePrompts: z
    .object({
      hook: z.string().describe('Image prompt for the hook scene — describe a specific visual related to THIS case'),
      setup: z.string().describe('Image prompt for the setup scene — the location/situation of THIS case'),
      keyDetail: z.string().describe('Image prompt for the key detail scene — the specific evidence or argument'),
      verdict: z.string().describe('Image prompt for the verdict scene — the tribunal outcome mood'),
      takeaway: z.string().describe('Image prompt for the takeaway scene — the lesson/advice visual'),
    })
    .describe('Short image prompts (1-2 sentences each) describing a specific scene to illustrate each segment. Reference actual case details like the location, contravention type, and specific circumstances. These will be rendered as soft 3D clay miniature diorama style.'),
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
  script: string
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
    }
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
  const alignment = result.alignment;
  if (!alignment || !alignment.characters || !alignment.character_start_times_seconds || !alignment.character_end_times_seconds) {
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
const generateSoundEffects = async (
  appealDecision: string
): Promise<{
  verdictSfxUrl: string | null;
  transitionSfxUrl: string | null;
}> => {
  if (!elevenlabs) {
    logger.info('ElevenLabs not configured, skipping sound effects');
    return { verdictSfxUrl: null, transitionSfxUrl: null };
  }

  const generateSfx = async (
    text: string,
    durationSeconds: number,
    label: string
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
      const r2Path = `social/sfx/tribunal-${label}-${timestamp}.mp3`;
      const { url } = await put(r2Path, buffer, {
        contentType: 'audio/mpeg',
      });

      logger.info(`SFX generated: ${label}`, { url });
      return url;
    } catch (error) {
      logger.error(
        `SFX generation failed: ${label}`,
        {},
        error instanceof Error ? error : new Error(String(error))
      );
      return null;
    }
  };

  const verdictText =
    appealDecision === 'ALLOWED'
      ? 'single clean wooden gavel tap on sounding block, bright positive resolution chime, warm reverb, professional courtroom audio'
      : 'single clean wooden gavel tap on sounding block, low serious orchestral note, solemn mood, professional courtroom audio';

  const [verdictSfxUrl, transitionSfxUrl] = await Promise.all([
    generateSfx(verdictText, 2, 'verdict'),
    generateSfx('crisp paper page turn flip sound, single clean page flip, short snappy', 1, 'transition'),
  ]);

  return { verdictSfxUrl, transitionSfxUrl };
};

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
const generateSceneImages = async (
  sceneImagePrompts: {
    hook: string;
    setup: string;
    keyDetail: string;
    verdict: string;
    takeaway: string;
  }
): Promise<SceneImages> => {
  const generateSingleImage = async (
    prompt: string,
    label: string
  ): Promise<string | null> => {
    try {
      const result = await generateText({
        model: getTracedModel(models.geminiImage, {
          properties: { feature: `tribunal_video_scene_${label}` },
        }),
        prompt: `Generate a soft 3D clay miniature diorama scene. Stylised, warm tilt-shift look, rounded shapes, matte clay textures, soft studio lighting. No text in the image. ${prompt}`,
      });

      const imageFile = result.files?.find((f) =>
        f.mediaType?.startsWith('image/')
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
        error instanceof Error ? error : new Error(String(error))
      );
      return null;
    }
  };

  const [hookImageUrl, setupImageUrl, keyDetailImageUrl, verdictImageUrl, takeawayImageUrl] =
    await Promise.all([
      generateSingleImage(sceneImagePrompts.hook, 'hook'),
      generateSingleImage(sceneImagePrompts.setup, 'setup'),
      generateSingleImage(sceneImagePrompts.keyDetail, 'keyDetail'),
      generateSingleImage(sceneImagePrompts.verdict, 'verdict'),
      generateSingleImage(sceneImagePrompts.takeaway, 'takeaway'),
    ]);

  return { hookImageUrl, setupImageUrl, keyDetailImageUrl, verdictImageUrl, takeawayImageUrl };
};

// ============================================================================
// Step 5: Social media caption generation
// ============================================================================

const generateTribunalCaption = async (
  platform: string,
  caseData: {
    authority: string;
    contravention: string;
    appealDecision: string;
    hook: string;
  }
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

// ============================================================================
// Step 6: Social media posting
// ============================================================================

/**
 * Post the tribunal video to Instagram as a Reel.
 */
const postTribunalReelToInstagram = async (
  videoUrl: string,
  caption: string,
  coverUrl?: string | null
): Promise<{ success: boolean; mediaId?: string; error?: string }> => {
  try {
    if (
      !process.env.INSTAGRAM_ACCOUNT_ID ||
      !process.env.FACEBOOK_PAGE_ACCESS_TOKEN
    ) {
      throw new Error('Instagram credentials not configured');
    }

    // Create reel container
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
      }
    );
    const createData = await createResponse.json();
    if (!createResponse.ok) {
      throw new Error(
        `Instagram create failed: ${JSON.stringify(createData)}`
      );
    }
    const creationId = createData.id;

    // Wait for media to be ready
    let ready = false;
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 5000));
      const statusResponse = await fetch(
        `https://graph.facebook.com/v24.0/${creationId}?fields=status_code&access_token=${process.env.FACEBOOK_PAGE_ACCESS_TOKEN}`
      );
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

    // Publish
    const publishResponse = await fetch(
      `https://graph.facebook.com/v24.0/${process.env.INSTAGRAM_ACCOUNT_ID}/media_publish`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creation_id: creationId,
          access_token: process.env.FACEBOOK_PAGE_ACCESS_TOKEN,
        }),
      }
    );
    const publishData = await publishResponse.json();
    if (!publishResponse.ok) {
      throw new Error(
        `Instagram publish failed: ${JSON.stringify(publishData)}`
      );
    }

    return { success: true, mediaId: publishData.id };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('Instagram Reel posting failed', {}, err);
    return { success: false, error: err.message };
  }
};

/**
 * Post the tribunal video to Facebook as a Reel.
 */
const postTribunalReelToFacebook = async (
  videoUrl: string,
  caption: string,
  title: string
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
      }
    );
    const data = await response.json();
    if (!response.ok) {
      throw new Error(`Facebook post failed: ${JSON.stringify(data)}`);
    }

    return { success: true, postId: data.id };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('Facebook Reel posting failed', {}, err);
    return { success: false, error: err.message };
  }
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

    // 4. Generate voiceover + sound effects + scene images in parallel; pick curated music track
    const backgroundMusicUrl = getRandomMusicTrack('tribunal');

    const [voiceover, sfx, sceneImages] = await Promise.all([
      generateVoiceoverWithTimestamps(script.fullScript),
      generateSoundEffects(selectedCase.appealDecision),
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
    const durationInFrames = Math.ceil(
      (voiceover.durationSeconds + 3) * 30
    );

    const renderResponse = await fetch(
      `${WORKER_URL}/video/render/tribunal-case-reel`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${WORKER_SECRET}`,
        },
        body: JSON.stringify({
          authority: selectedCase.authority,
          contravention: selectedCase.contravention || 'Parking contravention',
          contraventionLocation:
            selectedCase.contraventionLocation || 'London',
          contraventionDate: selectedCase.contraventionDate
            ? new Date(selectedCase.contraventionDate).toLocaleDateString(
                'en-GB',
                { day: 'numeric', month: 'long', year: 'numeric' }
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
        }),
      }
    );

    const renderData = await renderResponse.json();

    if (!renderResponse.ok || !renderData.success) {
      throw new Error(
        `Worker render failed: ${renderData.error || renderResponse.statusText}`
      );
    }

    const videoUrl = renderData.url;

    // 5b. Render cover image for reel thumbnail
    let coverImageUrl: string | null = null;
    try {
      logger.info('Rendering cover image');
      const coverResponse = await fetch(
        `${WORKER_URL}/video/render/tribunal-case-cover`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${WORKER_SECRET}`,
          },
          body: JSON.stringify({
            authority: selectedCase.authority,
            contravention: selectedCase.contravention || 'Parking contravention',
            appealDecision: selectedCase.appealDecision,
            hookText: script.hook,
            coverImageUrl: sceneImages.hookImageUrl,
          }),
        }
      );
      const coverData = await coverResponse.json();
      if (coverResponse.ok && coverData.success) {
        coverImageUrl = coverData.url;
        logger.info('Cover image rendered', { coverImageUrl });
      } else {
        logger.error('Cover image render failed', { error: coverData.error });
      }
    } catch (error) {
      logger.error(
        'Cover image render failed',
        {},
        error instanceof Error ? error : new Error(String(error))
      );
    }

    await db.tribunalCaseVideo.update({
      where: { id: videoRecord.id },
      data: {
        videoUrl,
        coverImageUrl,
        status: 'POSTING',
      },
    });

    logger.info('Video rendered, posting to social media', { videoUrl, coverImageUrl });

    // 6. Post to social media
    const caseData = {
      authority: selectedCase.authority,
      contravention: selectedCase.contravention || 'Parking contravention',
      appealDecision: selectedCase.appealDecision,
      hook: script.hook,
    };

    // Generate captions in parallel
    const [instagramCaption, facebookCaption, tiktokCaption, youtubeCaption, threadsCaption] =
      await Promise.all([
        generateTribunalCaption('instagram', caseData).catch(() => null),
        generateTribunalCaption('facebook', caseData).catch(() => null),
        generateTribunalCaption('tiktok', caseData).catch(() => null),
        generateTribunalCaption('youtube', caseData).catch(() => null),
        generateTribunalCaption('threads', caseData).catch(() => null),
      ]);

    // Post to platforms
    const postingResults: Record<string, { success: boolean; mediaId?: string; postId?: string; error?: string }> = {};

    if (instagramCaption) {
      const igResult = await postTribunalReelToInstagram(
        videoUrl,
        instagramCaption,
        coverImageUrl
      );
      postingResults.instagram = igResult;
    }

    if (facebookCaption) {
      const fbResult = await postTribunalReelToFacebook(
        videoUrl,
        facebookCaption,
        `Tribunal Case: ${caseData.authority} - ${caseData.contravention}`
      );
      postingResults.facebook = fbResult;
    }

    // Send email digest for manual platforms
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
          blogUrl: '', // No blog URL for tribunal videos
          imageUrl: '',
          videoUrl,
          captions: digestCaptions,
        });
        logger.info('Social digest email sent');
      } catch (error) {
        logger.error(
          'Failed to send digest email',
          {},
          error instanceof Error ? error : new Error(String(error))
        );
      }
    }

    // 7. Mark completed
    await db.tribunalCaseVideo.update({
      where: { id: videoRecord.id },
      data: {
        postingResults,
        status: 'COMPLETED',
      },
    });

    logger.info('Tribunal video pipeline complete', {
      videoId: videoRecord.id,
      caseReference: selectedCase.caseReference,
      videoUrl,
    });

    return {
      success: true,
      videoId: videoRecord.id,
      videoUrl,
      caseReference: selectedCase.caseReference,
      postingResults,
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
