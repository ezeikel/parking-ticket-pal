import { PostHog } from 'posthog-node';

const createPostHogClient = (): PostHog | null => {
  const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;

  if (posthogKey && posthogHost) {
    // for server-side PostHog, construct full URL from the relative path
    const serverHost = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}${posthogHost}`
      : `http://localhost:3000${posthogHost}`;

    return new PostHog(posthogKey, {
      host: serverHost,
      flushAt: 1,
      flushInterval: 0,
    });
  }
  console.warn(
    'PostHog server-side tracking is disabled due to missing environment variables.',
  );
  return null;
};

// create a singleton instance of the PostHog client
// eslint-disable-next-line import/prefer-default-export
export const posthogServer = createPostHogClient();
