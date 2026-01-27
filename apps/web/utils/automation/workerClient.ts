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

// ============================================
// ISSUER AUTOMATION FUNCTIONS
// ============================================

/**
 * Address type for user addresses
 */
export type Address = {
  line1: string;
  line2?: string;
  city?: string;
  postcode: string;
  country?: string;
};

/**
 * User information for challenge forms
 */
export type UserInfo = {
  id: string;
  name: string;
  email: string;
  phoneNumber?: string;
  address: Address;
};

/**
 * Issuer metadata returned by worker
 */
export type IssuerMetadata = {
  id: string;
  name: string;
  supportsChallenge: boolean;
  supportsVerify: boolean;
  portalUrl: string;
  notes?: string;
};

/**
 * Parameters for running a challenge automation
 */
export type ChallengeParams = {
  issuerId: string;
  pcnNumber: string;
  vehicleReg: string;
  vehicleMake?: string;
  vehicleModel?: string;
  challengeReason: string;
  additionalDetails?: string;
  ticketId: string;
  challengeId?: string;
  user: UserInfo;
  dryRun?: boolean;
};

/**
 * Result from a challenge automation
 */
export type ChallengeResult = {
  success: boolean;
  challengeText?: string;
  screenshotUrls: string[];
  videoUrl?: string;
  referenceNumber?: string;
  error?: string;
  issuerId: string;
  challengeId: string;
  dryRun: boolean;
};

/**
 * Parameters for running a verify automation
 */
export type VerifyParams = {
  issuerId: string;
  pcnNumber: string;
  vehicleReg: string;
  ticketId: string;
  challengeId?: string;
};

/**
 * Result from a verify automation
 */
export type VerifyResult = {
  success: boolean;
  screenshotUrls: string[];
  evidenceUrls?: string[];
  pcnDetails?: Record<string, unknown>;
  error?: string;
  issuerId: string;
};

/**
 * Get list of supported issuers from worker.
 * Returns metadata for each issuer including what operations are supported.
 */
export async function getIssuers(): Promise<IssuerMetadata[]> {
  try {
    const { baseUrl, secret } = getConfig();

    logger.info('Fetching supported issuers from worker');

    const response = await fetch(`${baseUrl}/automation/issuers`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${secret}`,
      },
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: 'Unknown error' }));
      logger.error('Failed to fetch issuers', { error, status: response.status });
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.issuers;
  } catch (error) {
    logger.error(
      'Failed to fetch issuers from worker',
      {},
      error instanceof Error ? error : new Error(String(error)),
    );
    throw error;
  }
}

/**
 * Check if an issuer is supported for automation.
 * Queries the worker to get the current list of supported issuers.
 */
export async function isIssuerSupported(issuerId: string): Promise<boolean> {
  try {
    const issuers = await getIssuers();
    return issuers.some((issuer) => issuer.id === issuerId);
  } catch {
    // If we can't reach the worker, assume not supported
    return false;
  }
}

/**
 * Run a challenge automation on the worker.
 * The worker has Playwright installed locally and can access .gov.uk sites.
 */
export async function runChallenge(
  params: ChallengeParams,
): Promise<ChallengeResult> {
  try {
    const { baseUrl, secret } = getConfig();

    logger.info('Running challenge automation on worker', {
      issuerId: params.issuerId,
      pcnNumber: params.pcnNumber,
      ticketId: params.ticketId,
      dryRun: params.dryRun,
    });

    const response = await fetch(`${baseUrl}/automation/challenge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({
        issuerId: params.issuerId,
        pcnNumber: params.pcnNumber,
        vehicleReg: params.vehicleReg,
        vehicleMake: params.vehicleMake,
        vehicleModel: params.vehicleModel,
        challengeReason: params.challengeReason,
        additionalDetails: params.additionalDetails,
        ticketId: params.ticketId,
        challengeId: params.challengeId,
        user: params.user,
        dryRun: params.dryRun ?? false,
      }),
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: 'Unknown error' }));
      logger.error('Challenge automation failed', {
        issuerId: params.issuerId,
        status: response.status,
        error,
      });

      return {
        success: false,
        error: error.error || error.message || `HTTP ${response.status}`,
        screenshotUrls: error.screenshotUrls || [],
        issuerId: params.issuerId,
        challengeId: params.challengeId || '',
        dryRun: params.dryRun ?? false,
      };
    }

    const result = await response.json();
    logger.info('Challenge automation completed', {
      issuerId: params.issuerId,
      success: result.success,
      challengeId: result.challengeId,
    });

    return result;
  } catch (error) {
    logger.error(
      'Failed to run challenge automation',
      { issuerId: params.issuerId, ticketId: params.ticketId },
      error instanceof Error ? error : new Error(String(error)),
    );

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to connect to automation service',
      screenshotUrls: [],
      issuerId: params.issuerId,
      challengeId: params.challengeId || '',
      dryRun: params.dryRun ?? false,
    };
  }
}

/**
 * Run a verify automation on the worker.
 * Verifies ticket details on the issuer portal and captures evidence.
 */
export async function runVerify(params: VerifyParams): Promise<VerifyResult> {
  try {
    const { baseUrl, secret } = getConfig();

    logger.info('Running verify automation on worker', {
      issuerId: params.issuerId,
      pcnNumber: params.pcnNumber,
      ticketId: params.ticketId,
    });

    const response = await fetch(`${baseUrl}/automation/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({
        issuerId: params.issuerId,
        pcnNumber: params.pcnNumber,
        vehicleReg: params.vehicleReg,
        ticketId: params.ticketId,
        challengeId: params.challengeId,
      }),
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: 'Unknown error' }));
      logger.error('Verify automation failed', {
        issuerId: params.issuerId,
        status: response.status,
        error,
      });

      return {
        success: false,
        error: error.error || error.message || `HTTP ${response.status}`,
        screenshotUrls: error.screenshotUrls || [],
        issuerId: params.issuerId,
      };
    }

    const result = await response.json();
    logger.info('Verify automation completed', {
      issuerId: params.issuerId,
      success: result.success,
    });

    return result;
  } catch (error) {
    logger.error(
      'Failed to run verify automation',
      { issuerId: params.issuerId, ticketId: params.ticketId },
      error instanceof Error ? error : new Error(String(error)),
    );

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to connect to automation service',
      screenshotUrls: [],
      issuerId: params.issuerId,
    };
  }
}
