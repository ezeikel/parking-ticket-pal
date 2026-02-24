/**
 * AI-powered image evaluation for blog posts
 *
 * Uses Gemini 2.5 Pro vision model to evaluate whether stock photos
 * are relevant and appropriate for blog post content.
 */

import { generateText, Output } from 'ai';
import { z } from 'zod';
import { models, getTracedModel } from './models';

// Schema for image evaluation response
const ImageEvaluationSchema = z.object({
  isRelevant: z
    .boolean()
    .describe('Whether the image is relevant to the blog post'),
  confidence: z.number().min(0).max(100).describe('Confidence score 0-100'),
  reasoning: z.string().describe('Brief explanation of the evaluation'),
  concerns: z
    .array(z.string())
    .describe(
      'Any concerns about the image (e.g., too generic, wrong context, misleading)',
    ),
});

export type ImageEvaluation = z.infer<typeof ImageEvaluationSchema>;

export type EvaluateImageOptions = {
  /** Blog post title */
  title: string;
  /** Blog post excerpt/summary */
  excerpt: string;
  /** Blog post category */
  category: string;
  /** URL of the image to evaluate */
  imageUrl: string;
  /** Search term that found this image */
  searchTerm: string;
  /** Minimum confidence threshold (default: 60) */
  minConfidence?: number;
};

/**
 * Evaluate whether a stock photo is suitable for a blog post
 *
 * Uses Gemini 2.5 Pro vision model to analyze the image and determine
 * if it's relevant to the blog post content.
 *
 * @returns Evaluation result with relevance decision, confidence, and reasoning
 */
export async function evaluateImageRelevance(
  options: EvaluateImageOptions,
): Promise<ImageEvaluation> {
  const { title, excerpt, category, imageUrl, searchTerm } = options;

  const prompt = `You are evaluating whether a stock photo is suitable as the featured image for a blog post.

BLOG POST CONTEXT:
- Title: ${title}
- Excerpt: ${excerpt}
- Category: ${category}
- Search term used: "${searchTerm}"

EVALUATION CRITERIA:
1. Relevance: Does the image relate to the blog post's topic?
2. Appropriateness: Is the image professional and suitable for a business blog?
3. Context: Does the image's setting/scenario match the article's context?
4. Quality: Is the image high quality and visually appealing?
5. Avoiding generic: Is it specific enough (not just a random stock photo)?

For a parking/traffic law blog, good images might include:
- Parking meters, street parking, parking signs
- Traffic wardens/enforcement officers
- Legal documents, letters, appeals
- UK streets, London scenes
- Cars in urban settings

Poor images would be:
- Generic office scenes unrelated to topic
- Wrong geographic context (US instead of UK)
- Misleading or confusing imagery
- Low quality or unprofessional photos

Analyze the attached image and determine if it's a good match for this blog post.`;

  try {
    const { output: evaluation } = await generateText({
      model: getTracedModel(models.vision, {
        properties: { feature: 'image_evaluation', title, searchTerm },
      }),
      output: Output.object({ schema: ImageEvaluationSchema }),
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image', image: imageUrl },
          ],
        },
      ],
    });

    return evaluation;
  } catch (error) {
    // If evaluation fails, return a neutral result that allows the image to be used
    console.error('Image evaluation failed:', error);
    return {
      isRelevant: true,
      confidence: 50,
      reasoning: 'Evaluation failed, defaulting to accept image',
      concerns: ['Evaluation error - could not analyze image'],
    };
  }
}

/**
 * Evaluate multiple images and return the best match
 *
 * Evaluates images in parallel and returns the one with highest confidence
 * that meets the minimum threshold, or null if none qualify.
 */
export async function findBestImage(
  images: { url: string; searchTerm: string }[],
  context: { title: string; excerpt: string; category: string },
  minConfidence = 60,
): Promise<{
  selectedIndex: number | null;
  evaluations: ImageEvaluation[];
}> {
  // Evaluate all images in parallel
  const evaluations = await Promise.all(
    images.map((img) =>
      evaluateImageRelevance({
        ...context,
        imageUrl: img.url,
        searchTerm: img.searchTerm,
        minConfidence,
      }),
    ),
  );

  // Find the best qualifying image
  let bestIndex: number | null = null;
  let bestConfidence = 0;

  evaluations.forEach((evaluation, index) => {
    if (
      evaluation.isRelevant &&
      evaluation.confidence >= minConfidence &&
      evaluation.confidence > bestConfidence
    ) {
      bestIndex = index;
      bestConfidence = evaluation.confidence;
    }
  });

  return {
    selectedIndex: bestIndex,
    evaluations,
  };
}
