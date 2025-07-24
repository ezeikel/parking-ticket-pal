import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: [
    'playwright-extra',
    'puppeteer-extra-plugin-stealth',
    'puppeteer-extra-plugin-recaptcha',
    'posthog-node',
  ],
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb',
    },
  },
  async rewrites() {
    return [
      {
        source: '/relay-hyx5/static/:path*',
        destination: 'https://eu-assets.i.posthog.com/static/:path*',
      },
      {
        source: '/relay-hyx5/:path*',
        destination: 'https://eu.i.posthog.com/:path*',
      },
      {
        source: '/relay-hyx5/flags',
        destination: 'https://eu.i.posthog.com/flags',
      },
    ];
  },
  // this is required to support PostHog trailing slash API requests
  skipTrailingSlashRedirect: true,
};

// sentry configuration options
const sentryOptions = {
  silent: true,
  org: 'chewybytes',
  project: 'parking-ticket-pal-web',
  authToken: process.env.SENTRY_AUTH_TOKEN,
  widenClientFileUpload: true,
  transpileClientSDK: true,
  tunnelRoute: '/monitoring',
  hideSourceMaps: true,
  disableLogger: true,
  automaticVercelMonitors: true,
};

const configWithSentry = withSentryConfig(nextConfig, sentryOptions);

export default configWithSentry;
