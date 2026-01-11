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

  // Google Gemini models
  GEMINI_2_FLASH: 'gemini-2.0-flash',
  // Gemini image generation models (use with generateText, not generateImage)
  GEMINI_3_PRO_IMAGE: 'gemini-3-pro-image-preview',
  GEMINI_2_5_FLASH_IMAGE: 'gemini-2.5-flash-image-preview',
} as const;

// Pre-configured model instances
export const models = {
  // Primary text model for complex tasks (vision, structured output, reasoning)
  // Best for: challenge letters, OCR analysis, blog content generation
  text: openai(MODEL_IDS.GPT_4O),

  // Faster/cheaper text model for simpler tasks
  // Best for: simple text extraction, formatting, quick responses
  textFast: openai(MODEL_IDS.GPT_4O_MINI),

  // Ultra-fast vision model for analytics (Gemini 2 Flash)
  // Best for: image analysis, categorization, structured extraction
  // Pricing: Very cost-effective for high-volume tasks
  analytics: google(MODEL_IDS.GEMINI_2_FLASH),

  // Gemini image generation model (uses generateText, not generateImage)
  // Best for: blog featured images when Pexels doesn't have suitable photos
  // Supports reference images as actual inputs for style matching
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
