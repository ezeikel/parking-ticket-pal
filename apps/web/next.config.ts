import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  cacheComponents: true,
  cacheLife: {
    // Ticket data - rarely changes after creation
    ticket: {
      stale: 60 * 60, // 1 hour
      revalidate: 60 * 60 * 24, // 24 hours
      expire: 60 * 60 * 24 * 30, // 30 days
    },
    // User-specific data
    'user-data': {
      stale: 60 * 5, // 5 minutes
      revalidate: 60 * 60, // 1 hour
      expire: 60 * 60 * 24, // 24 hours
    },
    // Blog/static content
    blog: {
      stale: 60 * 60, // 1 hour
      revalidate: 60 * 60 * 24, // 24 hours
      expire: 60 * 60 * 24 * 30, // 30 days
    },
    // Vehicle lookup data
    vehicle: {
      stale: 60 * 60 * 24, // 24 hours
      revalidate: 60 * 60 * 24 * 7, // 7 days
      expire: 60 * 60 * 24 * 90, // 90 days
    },
    // Issuer/contravention codes (rarely change)
    'reference-data': {
      stale: 60 * 60 * 24, // 24 hours
      revalidate: 60 * 60 * 24 * 7, // 7 days
      expire: 60 * 60 * 24 * 90, // 90 days
    },
  },
  serverExternalPackages: [
    'playwright-extra',
    'puppeteer-extra-plugin-stealth',
    'puppeteer-extra-plugin-recaptcha',
    'posthog-node',
    'gray-matter',
    'kind-of',
  ],
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb',
    },
    externalDir: true,
  },
  transpilePackages: ['next-mdx-remote'],
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
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'media.istockphoto.com',
      },
      {
        protocol: 'https',
        hostname: '**.public.blob.vercel-storage.com',
        pathname: '**',
      },
    ],
  },
};

// sentry configuration options
const sentryOptions = {
  silent: !process.env.CI,
  org: 'chewybytes',
  project: 'parking-ticket-pal-web',
  authToken: process.env.SENTRY_AUTH_TOKEN,
  widenClientFileUpload: true,
  transpileClientSDK: true,
  tunnelRoute: '/monitoring',
  debug: process.env.NODE_ENV !== 'production',
  hideSourceMaps: true,
  disableLogger: true,
  automaticVercelMonitors: true,
  reactComponentAnnotation: {
    enabled: true,
  },
};

const configWithSentry = withSentryConfig(nextConfig, sentryOptions);

export default configWithSentry;
