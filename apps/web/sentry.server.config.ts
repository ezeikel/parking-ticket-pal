import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn: SENTRY_DSN,
  sendDefaultPii: false,
  tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.2,
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
  beforeSend(event) {
    // Filter out Next.js 'use cache' revalidation errors — these are opaque
    // "Error" exceptions with empty messages from handleRevalidate. The pages
    // still serve from cache, so these are noise (15K+ events).
    const exception = event.exception?.values?.[0];
    if (
      exception?.type === 'Error' &&
      (!exception.value || exception.value === '') &&
      exception.stacktrace?.frames?.some(
        (f) =>
          f.filename?.includes('app-page-turbo.runtime.prod') ||
          f.filename?.includes('app-page.runtime.prod'),
      )
    ) {
      return null;
    }
    return event;
  },
});
