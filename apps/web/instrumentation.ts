import * as Sentry from '@sentry/nextjs';
import {
  BatchLogRecordProcessor,
  LoggerProvider,
} from '@opentelemetry/sdk-logs';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { logs } from '@opentelemetry/api-logs';
import { resourceFromAttributes } from '@opentelemetry/resources';

const POSTHOG_TOKEN = process.env.NEXT_PUBLIC_POSTHOG_KEY;

export const loggerProvider = new LoggerProvider({
  resource: resourceFromAttributes({
    'service.name': 'ptp-web',
    'deployment.environment':
      process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
  }),
  processors: POSTHOG_TOKEN
    ? [
        new BatchLogRecordProcessor(
          new OTLPLogExporter({
            url: 'https://eu.i.posthog.com/i/v1/logs',
            headers: {
              Authorization: `Bearer ${POSTHOG_TOKEN}`,
              'Content-Type': 'application/json',
            },
          }),
        ),
      ]
    : [],
});

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
    logs.setGlobalLoggerProvider(loggerProvider);
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

export const onRequestError: typeof Sentry.captureRequestError = (
  error,
  request,
  context,
) => {
  // Skip Next.js notFound() errors — these are intentional 404s, not bugs.
  // Also skip empty "Error" from 'use cache' revalidation (no message, internal runtime stack).
  if (error instanceof Error) {
    if (error.message === 'NEXT_NOT_FOUND') return;
    if (
      error.message === '' &&
      error.stack?.includes('app-page-turbo.runtime.prod')
    ) {
      return;
    }
  }

  Sentry.captureRequestError(error, request, context);
};
