import { PostHog } from 'posthog-node';

/**
 * Create a PostHog Node SDK client configured for server-side use.
 *
 * PostHog recommends creating a client per request in serverless environments
 * and calling `shutdown()` when done so events flush before the function freezes.
 *
 * For the logger (which needs a long-lived client), use `getPostHogServer()` instead.
 */
export function createPostHogClient(): PostHog | null {
  const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;

  if (posthogKey) {
    // Server-side: send directly to PostHog EU, not through the reverse proxy.
    // The proxy (NEXT_PUBLIC_POSTHOG_HOST) is for client-side ad-blocker avoidance
    // and doesn't work server-side (deployment URLs have Vercel Authentication).
    return new PostHog(posthogKey, {
      host: 'https://eu.i.posthog.com',
      flushAt: 1,
      flushInterval: 0,
    });
  }
  // eslint-disable-next-line no-console
  console.warn(
    'PostHog server-side tracking is disabled due to missing NEXT_PUBLIC_POSTHOG_KEY.',
  );
  return null;
}

// Lazy singleton — created on first access so the env var is available at runtime
let posthogServerInstance: PostHog | null | undefined;

/**
 * Get a shared PostHog server client (lazy singleton).
 * Prefer `createPostHogClient()` + `shutdown()` in route handlers for reliable flushing.
 */
export function getPostHogServer(): PostHog | null {
  if (posthogServerInstance === undefined) {
    posthogServerInstance = createPostHogClient();
  }
  return posthogServerInstance;
}

// Keep the named export for backward compatibility with existing imports.
// NOTE: This evaluates at module load time. In serverless environments,
// prefer `getPostHogServer()` or `createPostHogClient()` for reliability.
export const posthogServer = createPostHogClient();
