import { openai } from '@ai-sdk/openai';
import { google } from '@ai-sdk/google';
import { anthropic } from '@ai-sdk/anthropic';
import type { LanguageModelV2, LanguageModelV3 } from '@ai-sdk/provider';
import { withTracing } from '@posthog/ai';
import { posthogServer } from '@/lib/posthog-server';

// PostHog withTracing accepts LanguageModelV2 | LanguageModelV3
// Vercel AI SDK latest models implement LanguageModelV3
type TracedLanguageModel = LanguageModelV2 | LanguageModelV3;

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

  // Anthropic Claude models
  CLAUDE_SONNET_4_5: 'claude-sonnet-4-5-20250929',
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

  // Creative writing model (Claude Sonnet 4.5)
  // Best for: engaging scripts, storytelling, creative content generation
  creative: anthropic(MODEL_IDS.CLAUDE_SONNET_4_5),
};

// Image generation defaults
export const IMAGE_DEFAULTS = {
  size: '1024x1024' as const,
  quality: 'high' as const,
} as const;

// Type exports
export type ModelId = (typeof MODEL_IDS)[keyof typeof MODEL_IDS];

/**
 * Options for PostHog LLM tracing
 */
export type TracingOptions = {
  /** User ID for attribution in PostHog */
  userId?: string;
  /** Unique trace ID to group related LLM calls */
  traceId?: string;
  /** Custom properties to attach to the generation event */
  properties?: Record<string, unknown>;
};

/**
 * Wrap a Vercel AI SDK model with PostHog tracing for LLM analytics.
 * Automatically captures token usage, costs, latency, and more.
 *
 * @param model - The Vercel AI SDK model to wrap
 * @param options - Tracing options including userId, traceId, and custom properties
 * @returns The wrapped model with PostHog tracing enabled
 *
 * @example
 * const tracedModel = getTracedModel(models.text, {
 *   userId: 'user_123',
 *   properties: { feature: 'challenge_letter' }
 * });
 */
export const getTracedModel = <T extends TracedLanguageModel>(
  model: T,
  options: TracingOptions = {},
): T => {
  // Return unwrapped model if PostHog is not configured
  if (!posthogServer) {
    return model;
  }

  return withTracing(model, posthogServer, {
    posthogDistinctId: options.userId || 'system',
    posthogTraceId: options.traceId,
    posthogProperties: options.properties,
  }) as T;
};
