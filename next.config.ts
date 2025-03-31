import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: [
    'playwright-extra',
    'puppeteer-extra-plugin-stealth',
    'puppeteer-extra-plugin-recaptcha',
  ],
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb',
    },
  },
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
