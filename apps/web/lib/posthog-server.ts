import { PostHog } from 'posthog-node';

const createPostHogClient = (): PostHog | null => {
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
};

// create a singleton instance of the PostHog client
// eslint-disable-next-line import-x/prefer-default-export
export const posthogServer = createPostHogClient();
