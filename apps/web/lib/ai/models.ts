import { openai } from '@ai-sdk/openai';
import { google } from '@ai-sdk/google';

/**
 * AI Model Configuration
 *
 * Centralized model definitions for consistent usage across the application.
 * Change models here to switch providers or model versions globally.
 */

// Model identifiers
export const MODEL_IDS = {
  // OpenAI Text models
  GPT_4O: 'gpt-4o',
  GPT_4O_MINI: 'gpt-4o-mini',

  // OpenAI Image models
  GPT_IMAGE: 'gpt-image-1',
  DALL_E_3: 'dall-e-3',

  // Google Gemini models (updated Jan 2026)
  // Most balanced model - speed, scale, and frontier intelligence
  GEMINI_3_FLASH: 'gemini-3-flash-preview',
  // Most intelligent multimodal model - best for vision/evaluation
  GEMINI_3_PRO: 'gemini-3-pro-preview',
  // Image generation model (use with generateText, not generateImage)
  GEMINI_3_PRO_IMAGE: 'gemini-3-pro-image-preview',
} as const;

// Pre-configured model instances
export const models = {
  // Primary text model for complex tasks (vision, structured output, reasoning)
  // Best for: challenge letters, OCR analysis, blog content generation
  text: openai(MODEL_IDS.GPT_4O),

  // Faster/cheaper text model for simpler tasks
  // Best for: simple text extraction, formatting, quick responses
  textFast: openai(MODEL_IDS.GPT_4O_MINI),

  // Balanced vision model for analytics (Gemini 3 Flash)
  // Best for: image analysis, categorization, structured extraction
  // Pricing: Cost-effective for high-volume tasks with frontier intelligence
  analytics: google(MODEL_IDS.GEMINI_3_FLASH),

  // Most intelligent vision model for evaluation (Gemini 3 Pro)
  // Best for: evaluating image relevance, quality assessment, complex reasoning
  // Use when accuracy matters more than speed
  vision: google(MODEL_IDS.GEMINI_3_PRO),

  // Gemini image generation model (uses generateText, not generateImage)
  // Best for: blog featured images when Pexels doesn't have suitable photos
  geminiImage: google(MODEL_IDS.GEMINI_3_PRO_IMAGE),

  // Legacy image model - for backwards compatibility
  imageLegacy: openai.image(MODEL_IDS.DALL_E_3),
};

// Image generation defaults
export const IMAGE_DEFAULTS = {
  size: '1024x1024' as const,
  quality: 'high' as const,
} as const;

// Type exports
export type ModelId = (typeof MODEL_IDS)[keyof typeof MODEL_IDS];
