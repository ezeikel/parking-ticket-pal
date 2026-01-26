/**
 * Worker API Client
 *
 * HTTP client for communicating with the worker service.
 * Handles requesting code generation for new issuer automations.
 */

import { createServerLogger } from '@/lib/logger';

const logger = createServerLogger({ action: 'worker-client' });

/**
 * Configuration from environment variables
 */
function getConfig() {
  const baseUrl = process.env.WORKER_URL;
  const secret = process.env.WORKER_SECRET;

  if (!baseUrl || !secret) {
    throw new Error(
      'Worker not configured. Set WORKER_URL and WORKER_SECRET environment variables.',
    );
  }

  return { baseUrl, secret };
}

/**
 * Get the webhook URL for automation callbacks
 */
function getWebhookUrl(): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL;
  if (!baseUrl) {
    throw new Error('App URL not configured. Set NEXT_PUBLIC_APP_URL.');
  }

  // Ensure https for production
  const url = baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`;
  return `${url}/api/webhooks/automation`;
}

/**
 * Response from issuer generation request
 */
export type GenerationJobResponse = {
  success: boolean;
  jobId?: string;
  status?: string;
  message?: string;
  error?: string;
};

/**
 * Request automation code generation for an unsupported issuer.
 * The worker uses Stagehand + Claude to analyze the issuer's website,
 * generate TypeScript automation code, and create a PR.
 */
export async function requestIssuerGeneration(params: {
  issuerId: string;
  issuerName: string;
  issuerWebsite?: string;
}): Promise<GenerationJobResponse> {
  try {
    const { baseUrl, secret } = getConfig();
    const webhookUrl = getWebhookUrl();
    const webhookSecret = process.env.WORKER_SECRET!;

    logger.info('Requesting issuer generation', {
      issuerId: params.issuerId,
      issuerName: params.issuerName,
    });

    const response = await fetch(`${baseUrl}/automation/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({
        issuerId: params.issuerId,
        issuerName: params.issuerName,
        issuerWebsite: params.issuerWebsite,
        webhookUrl,
        webhookSecret,
      }),
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: 'Unknown error' }));
      logger.error('Generation request failed', {
        issuerId: params.issuerId,
        status: response.status,
        error,
      });
      return {
        success: false,
        error: error.error || `HTTP ${response.status}`,
      };
    }

    const result = await response.json();
    logger.info('Generation job started', {
      issuerId: params.issuerId,
      jobId: result.jobId,
    });

    return result;
  } catch (error) {
    logger.error(
      'Failed to request issuer generation',
      { issuerId: params.issuerId },
      error instanceof Error ? error : new Error(String(error)),
    );

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to connect to automation service',
    };
  }
}

/**
 * Health check result for a single issuer
 */
export type IssuerHealthResult = {
  issuerId: string;
  issuerName: string;
  status: 'healthy' | 'degraded' | 'broken';
  portalAccessible: boolean;
  elementsFound: string[];
  elementsMissing: string[];
  captchaDetected: boolean;
  errorMessage?: string;
  responseTimeMs: number;
  checkedAt: string;
};

/**
 * Overall health check response from worker
 */
export type HealthCheckResponse = {
  success: boolean;
  totalIssuers: number;
  healthyCount: number;
  degradedCount: number;
  brokenCount: number;
  results: IssuerHealthResult[];
  startedAt: string;
  completedAt: string;
  durationMs: number;
};

/**
 * Run health check on issuer automations.
 * Checks if issuer portals are accessible and expected elements are present.
 */
export async function runHealthCheck(
  issuers?: string[],
): Promise<HealthCheckResponse> {
  const { baseUrl, secret } = getConfig();

  logger.info('Running automation health check', { issuers });

  const response = await fetch(`${baseUrl}/automation/health-check`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify({ issuers }),
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}
