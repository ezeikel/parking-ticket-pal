/**
 * AI Module
 *
 * Centralized exports for AI functionality.
 */

export { models, MODEL_IDS, IMAGE_DEFAULTS, type ModelId } from './models';

export {
  // Challenge prompts
  CHALLENGE_WRITER_PROMPT,
  CHALLENGE_LETTER_PROMPT,
  CHALLENGE_EMAIL_PROMPT,
  // OCR prompts
  IMAGE_ANALYSIS_PROMPT,
  // Blog prompts
  BLOG_META_PROMPT,
  BLOG_CONTENT_PROMPT,
  BLOG_IMAGE_SEARCH_PROMPT,
  BLOG_IMAGE_GENERATION_PROMPT,
  // Social media prompts
  SOCIAL_POST_PROMPT,
} from './prompts';
