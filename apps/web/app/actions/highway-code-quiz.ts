'use server';

import { generateText } from 'ai';
import { db } from '@parking-ticket-pal/db';
import { createServerLogger } from '@/lib/logger';
import { models, getTracedModel } from '@/lib/ai/models';
import {
  postCarouselToInstagram,
  postAlbumToFacebook,
} from '@/lib/video-completion';
import { sendSocialDigest, type SocialDigestCaption } from '@/lib/email';

const logger = createServerLogger({ action: 'highway-code-quiz' });

const { WORKER_URL } = process.env;
const { WORKER_SECRET } = process.env;

// ============================================================================
// Step 1: Select an unused sign
// ============================================================================

const selectUnusedSign = async () => {
  const sign = await db.highwayCodeSign.findFirst({
    where: { used: false },
    orderBy: { createdAt: 'asc' },
  });

  if (!sign) {
    throw new Error('No unused Highway Code signs available');
  }

  return sign;
};

// ============================================================================
// Step 2: Generate parking tie-in text via AI
// ============================================================================

const generateParkingTieIn = async (
  signName: string,
  signDescription: string,
  signCategory: string,
): Promise<string> => {
  const { text } = await generateText({
    model: getTracedModel(models.textFast, {
      properties: { feature: 'highway_code_quiz_tie_in' },
    }),
    prompt: `Write 1-2 short sentences connecting this road sign to parking.

Sign: ${signName}
Description: ${signDescription}
Category: ${signCategory}

Guidelines:
- British English
- Practical tip a driver would find useful
- Relate it to parking, stopping, or waiting where relevant
- If the sign has no direct parking connection, relate it to general driving awareness that helps avoid tickets
- Keep it under 30 words`,
  });

  return text;
};

// ============================================================================
// Step 3: Generate Instagram caption via AI
// ============================================================================

const generateQuizCaption = async (
  signName: string,
  signCategory: string,
): Promise<string> => {
  const { text } = await generateText({
    model: getTracedModel(models.textFast, {
      properties: { feature: 'highway_code_quiz_caption' },
    }),
    prompt: `Write an Instagram caption for a Highway Code quiz carousel post.

Sign: ${signName}
Category: ${signCategory}

Guidelines:
- Start with a quiz hook ("Can you guess…", "Do you know…", "Test yourself…")
- Include "Swipe for the answer" CTA
- British English
- Include relevant hashtags
- Keep the main text under 100 words

Hashtags to include: #HighwayCode #RoadSigns #DrivingTest #UKDriving #ParkingTicketPal #DrivingTips #RoadSafety #LearnToDrive

End with: Crown copyright (OGL v3.0)`,
  });

  return text;
};

// ============================================================================
// Main orchestrator
// ============================================================================

// eslint-disable-next-line import-x/prefer-default-export
export const generateAndPostHighwayCodeQuiz = async () => {
  let quizPostId: string | null = null;

  try {
    // 1. Select unused sign
    const sign = await selectUnusedSign();
    logger.info('Selected sign for quiz', {
      signId: sign.id,
      signName: sign.name,
      category: sign.category,
    });

    // 2. Create quiz post record
    const quizPost = await db.highwayCodeQuizPost.create({
      data: {
        signId: sign.id,
        status: 'PENDING',
      },
    });
    quizPostId = quizPost.id;

    // 3. Generate parking tie-in via AI
    const parkingTieIn = await generateParkingTieIn(
      sign.name,
      sign.description,
      sign.category,
    );
    logger.info('Parking tie-in generated', { parkingTieIn });

    // 4. Call worker to render quiz slides
    if (!WORKER_URL || !WORKER_SECRET) {
      throw new Error('Worker URL or secret not configured');
    }

    const renderResponse = await fetch(
      `${WORKER_URL}/video/render/quiz-slides`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${WORKER_SECRET}`,
        },
        body: JSON.stringify({
          postId: quizPost.id,
          signImageUrl: sign.imageUrl,
          signCategory: sign.category,
          signName: sign.name,
          signDescription: sign.description,
          parkingTieIn,
        }),
      },
    );

    const renderData = await renderResponse.json();
    if (!renderResponse.ok || !renderData.success) {
      throw new Error(
        `Worker quiz slide render failed: ${renderData.error || renderResponse.statusText}`,
      );
    }

    const { questionSlideUrl, answerSlideUrl } = renderData;

    // 5. Update DB with slide URLs
    await db.highwayCodeQuizPost.update({
      where: { id: quizPost.id },
      data: {
        questionSlideUrl,
        answerSlideUrl,
        status: 'POSTING',
      },
    });

    logger.info('Quiz slides rendered', { questionSlideUrl, answerSlideUrl });

    // 6. Generate Instagram caption
    const caption = await generateQuizCaption(sign.name, sign.category);

    await db.highwayCodeQuizPost.update({
      where: { id: quizPost.id },
      data: { caption },
    });

    // 7. Post Instagram carousel
    const imageUrls = [questionSlideUrl, answerSlideUrl];
    const postingResults: Record<
      string,
      { success: boolean; mediaId?: string; postId?: string; error?: string }
    > = {};

    const igResult = await postCarouselToInstagram(imageUrls, caption, logger);
    postingResults.instagram = igResult;

    // 8. Post Facebook album
    const fbResult = await postAlbumToFacebook(
      imageUrls,
      caption,
      `Highway Code Quiz: ${sign.name}`,
      logger,
    );
    postingResults.facebook = fbResult;

    // 9. Mark sign as used
    await db.highwayCodeSign.update({
      where: { id: sign.id },
      data: { used: true },
    });

    // 10. Send digest email
    const digestEmail = process.env.SOCIAL_DIGEST_EMAIL;
    if (digestEmail) {
      const digestCaptions: SocialDigestCaption[] = [
        {
          platform: 'instagramCarousel',
          caption,
          autoPosted: postingResults.instagram?.success ?? false,
          assetType: 'image',
        },
        {
          platform: 'facebookAlbum',
          caption,
          autoPosted: postingResults.facebook?.success ?? false,
          assetType: 'image',
        },
      ];

      try {
        await sendSocialDigest(digestEmail, {
          blogTitle: `Highway Code Quiz: ${sign.name}`,
          blogUrl: '',
          imageUrl: questionSlideUrl,
          videoUrl: '',
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

    // 11. Update DB with final status
    await db.highwayCodeQuizPost.update({
      where: { id: quizPost.id },
      data: {
        postingResults,
        status: 'COMPLETED',
      },
    });

    logger.info('Highway Code quiz pipeline completed', {
      quizPostId: quizPost.id,
      signName: sign.name,
      postingResults,
    });

    return {
      success: true,
      quizPostId: quizPost.id,
      signName: sign.name,
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('Highway Code quiz pipeline failed', {}, err);

    if (quizPostId) {
      await db.highwayCodeQuizPost.update({
        where: { id: quizPostId },
        data: {
          status: 'FAILED',
          errorMessage: err.message,
        },
      });
    }

    return {
      success: false,
      error: err.message,
      quizPostId: quizPostId ?? undefined,
    };
  }
};
