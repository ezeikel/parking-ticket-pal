import { NextRequest, NextResponse } from 'next/server';
import { db, IssuerHealthStatus } from '@parking-ticket-pal/db';
import { createServerLogger } from '@/lib/logger';
import { sendEmail } from '@/lib/email';
import {
  runHealthCheck,
  type HealthCheckResponse,
} from '@/utils/automation/workerClient';

const logger = createServerLogger({ action: 'automation-health-check-cron' });

// Allow up to 5 minutes for health checks (they involve browser automation)
export const maxDuration = 300;

/**
 * Health Check Cron Job
 *
 * Runs periodically to check if issuer automations are still working.
 * Called by Vercel cron, stores results in database, and sends alerts when issues detected.
 */
async function handleHealthCheck(request: NextRequest) {
  try {
    // Auth check - Vercel cron sends CRON_SECRET
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    logger.info('Starting automation health check cron');

    // Call worker health check endpoint
    let healthCheckResult: HealthCheckResponse;
    try {
      healthCheckResult = await runHealthCheck();
    } catch (error) {
      logger.error(
        'Health check request failed',
        {},
        error instanceof Error ? error : new Error(String(error)),
      );
      return NextResponse.json(
        { error: 'Health check failed', message: (error as Error).message },
        { status: 500 },
      );
    }

    // Get previous status for each issuer to detect changes
    const issuerIds = healthCheckResult.results.map((r) => r.issuerId);
    const previousChecks = await db.issuerHealthCheck.findMany({
      where: { issuerId: { in: issuerIds } },
      orderBy: { checkedAt: 'desc' },
      distinct: ['issuerId'],
    });

    const previousStatusMap = new Map(
      previousChecks.map((c) => [c.issuerId, c.status]),
    );

    // Store results in database
    const storedResults = await Promise.all(
      healthCheckResult.results.map(async (result) => {
        const previousStatus = previousStatusMap.get(result.issuerId);
        const currentStatus = result.status.toUpperCase() as IssuerHealthStatus;
        const statusChanged =
          previousStatus !== undefined && previousStatus !== currentStatus;

        return db.issuerHealthCheck.create({
          data: {
            issuerId: result.issuerId,
            issuerName: result.issuerName,
            status: currentStatus,
            portalAccessible: result.portalAccessible,
            elementsFound: result.elementsFound,
            elementsMissing: result.elementsMissing,
            captchaDetected: result.captchaDetected,
            errorMessage: result.errorMessage,
            responseTimeMs: result.responseTimeMs,
            previousStatus: previousStatus || null,
            statusChanged,
            checkedAt: new Date(result.checkedAt),
          },
        });
      }),
    );

    // Check for issues that need attention
    const issuesDetected = healthCheckResult.results.filter(
      (r) => r.status === 'degraded' || r.status === 'broken',
    );

    const statusChanges = storedResults.filter((r) => r.statusChanged);

    // Send alert email if there are issues
    if (issuesDetected.length > 0 || statusChanges.length > 0) {
      await sendHealthCheckAlert(healthCheckResult, statusChanges);
    }

    logger.info('Health check cron completed', {
      totalIssuers: healthCheckResult.totalIssuers,
      healthyCount: healthCheckResult.healthyCount,
      degradedCount: healthCheckResult.degradedCount,
      brokenCount: healthCheckResult.brokenCount,
      statusChanges: statusChanges.length,
    });

    return NextResponse.json({
      success: true,
      summary: {
        totalIssuers: healthCheckResult.totalIssuers,
        healthyCount: healthCheckResult.healthyCount,
        degradedCount: healthCheckResult.degradedCount,
        brokenCount: healthCheckResult.brokenCount,
        statusChanges: statusChanges.length,
      },
      results: healthCheckResult.results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error(
      'Health check cron error',
      {},
      error instanceof Error ? error : new Error(String(error)),
    );
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}

async function sendHealthCheckAlert(
  result: HealthCheckResponse,
  statusChanges: Array<{
    issuerId: string;
    status: IssuerHealthStatus;
    previousStatus: IssuerHealthStatus | null;
  }>,
) {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    logger.warn('ADMIN_EMAIL not configured, skipping health check alert');
    return;
  }

  const issuesList = result.results
    .filter((r) => r.status !== 'healthy')
    .map(
      (r) => `- ${r.issuerName} (${r.issuerId}): ${r.status.toUpperCase()}
      Missing elements: ${r.elementsMissing.join(', ') || 'None'}
      Error: ${r.errorMessage || 'None'}`,
    )
    .join('\n');

  const changesList = statusChanges
    .map((c) => `- ${c.issuerId}: ${c.previousStatus} -> ${c.status}`)
    .join('\n');

  const html = `
    <h2>Automation Health Check Report</h2>
    <p><strong>Summary:</strong></p>
    <ul>
      <li>Total Issuers: ${result.totalIssuers}</li>
      <li>Healthy: ${result.healthyCount}</li>
      <li>Degraded: ${result.degradedCount}</li>
      <li>Broken: ${result.brokenCount}</li>
    </ul>
    ${issuesList ? `<h3>Issues Detected:</h3><pre>${issuesList}</pre>` : ''}
    ${changesList ? `<h3>Status Changes:</h3><pre>${changesList}</pre>` : ''}
    <p><em>Checked at: ${result.completedAt}</em></p>
  `;

  try {
    await sendEmail({
      to: adminEmail,
      subject: `[Parking Ticket Pal] Automation Health Check: ${result.brokenCount > 0 ? 'BROKEN' : result.degradedCount > 0 ? 'DEGRADED' : 'OK'}`,
      html,
    });
    logger.info('Health check alert email sent', { to: adminEmail });
  } catch (error) {
    logger.error(
      'Failed to send health check alert email',
      {},
      error instanceof Error ? error : new Error(String(error)),
    );
  }
}

// Support both GET (Vercel cron default) and POST
export const GET = handleHealthCheck;
export const POST = handleHealthCheck;
