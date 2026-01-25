/**
 * Hetzner Automation API Client
 *
 * HTTP client for communicating with the Hetzner-hosted automation service.
 * Handles learning new issuer flows and running automation recipes.
 */

import { createServerLogger } from '@/lib/logger';

const logger = createServerLogger({ action: 'hetzner-client' });

/**
 * Configuration from environment variables
 */
function getConfig() {
  const baseUrl = process.env.HETZNER_AUTOMATION_URL;
  const secret = process.env.HETZNER_AUTOMATION_SECRET;

  if (!baseUrl || !secret) {
    throw new Error(
      'Hetzner automation not configured. Set HETZNER_AUTOMATION_URL and HETZNER_AUTOMATION_SECRET.'
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
 * Context data for filling in form placeholders
 */
export type AutomationContext = {
  pcnNumber: string;
  vehicleReg: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  postcode: string;
  challengeReason: string;
  challengeText?: string;
};

/**
 * Recipe step structure
 */
export type RecipeStep = {
  order: number;
  action: string;
  selector?: string;
  value?: string;
  description: string;
  screenshotUrl?: string;
  waitFor?: string;
  optional?: boolean;
  fieldType?: string;
  placeholder?: string;
};

/**
 * Response from starting a learn job
 */
export type LearnJobResponse = {
  success: boolean;
  jobId?: string;
  status?: string;
  message?: string;
  error?: string;
};

/**
 * Response from starting a run job
 */
export type RunJobResponse = {
  success: boolean;
  jobId?: string;
  status?: string;
  message?: string;
  error?: string;
};

/**
 * Start learning a new issuer's challenge flow
 */
export async function startLearnJob(params: {
  automationId: string;
  issuerName: string;
  issuerWebsite?: string;
  pcnNumber: string;
  vehicleReg: string;
}): Promise<LearnJobResponse> {
  try {
    const { baseUrl, secret } = getConfig();
    const webhookUrl = getWebhookUrl();
    const webhookSecret = process.env.HETZNER_AUTOMATION_SECRET!;

    logger.info('Starting learn job', {
      automationId: params.automationId,
      issuerName: params.issuerName,
    });

    const response = await fetch(`${baseUrl}/automation/learn`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({
        automationId: params.automationId,
        issuerName: params.issuerName,
        issuerWebsite: params.issuerWebsite,
        pcnNumber: params.pcnNumber,
        vehicleReg: params.vehicleReg,
        webhookUrl,
        webhookSecret,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      logger.error('Learn job failed to start', {
        automationId: params.automationId,
        status: response.status,
        error,
      });
      return {
        success: false,
        error: error.error || `HTTP ${response.status}`,
      };
    }

    const result = await response.json();
    logger.info('Learn job started', {
      automationId: params.automationId,
      jobId: result.jobId,
    });

    return result;
  } catch (error) {
    logger.error(
      'Failed to start learn job',
      { automationId: params.automationId },
      error instanceof Error ? error : new Error(String(error))
    );

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to connect to automation service',
    };
  }
}

/**
 * Start running an automation recipe
 */
export async function startRunJob(params: {
  automationId: string;
  challengeId: string;
  steps: RecipeStep[];
  context: AutomationContext;
  dryRun?: boolean;
}): Promise<RunJobResponse> {
  try {
    const { baseUrl, secret } = getConfig();
    const webhookUrl = getWebhookUrl();
    const webhookSecret = process.env.HETZNER_AUTOMATION_SECRET!;

    logger.info('Starting run job', {
      automationId: params.automationId,
      challengeId: params.challengeId,
      dryRun: params.dryRun,
    });

    const response = await fetch(`${baseUrl}/automation/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({
        automationId: params.automationId,
        challengeId: params.challengeId,
        steps: params.steps,
        context: params.context,
        dryRun: params.dryRun,
        webhookUrl,
        webhookSecret,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      logger.error('Run job failed to start', {
        automationId: params.automationId,
        challengeId: params.challengeId,
        status: response.status,
        error,
      });
      return {
        success: false,
        error: error.error || `HTTP ${response.status}`,
      };
    }

    const result = await response.json();
    logger.info('Run job started', {
      automationId: params.automationId,
      challengeId: params.challengeId,
      jobId: result.jobId,
    });

    return result;
  } catch (error) {
    logger.error(
      'Failed to start run job',
      {
        automationId: params.automationId,
        challengeId: params.challengeId,
      },
      error instanceof Error ? error : new Error(String(error))
    );

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to connect to automation service',
    };
  }
}

/**
 * Get the status of a job
 */
export async function getJobStatus(jobId: string): Promise<{
  success: boolean;
  status?: string;
  error?: string;
}> {
  try {
    const { baseUrl, secret } = getConfig();

    const response = await fetch(`${baseUrl}/automation/status/${jobId}`, {
      headers: {
        Authorization: `Bearer ${secret}`,
      },
    });

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}`,
      };
    }

    const result = await response.json();
    return {
      success: true,
      status: result.status,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get job status',
    };
  }
}

/**
 * Cancel a running job
 */
export async function cancelJob(jobId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { baseUrl, secret } = getConfig();

    const response = await fetch(`${baseUrl}/automation/cancel/${jobId}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secret}`,
      },
    });

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}`,
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to cancel job',
    };
  }
}
