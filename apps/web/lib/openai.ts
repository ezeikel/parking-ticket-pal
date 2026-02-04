import { OpenAI as PostHogOpenAI } from '@posthog/ai';
import { posthogServer } from '@/lib/posthog-server';

const apiKey = process.env.OPENAI_API_KEY || '';

// Always use PostHog-wrapped OpenAI client
// When posthog client is null, it falls back to standard behavior
// Using PostHogOpenAI consistently avoids TypeScript union type issues
const openai = new PostHogOpenAI({
  apiKey,
  posthog: posthogServer!,
});

export default openai;
