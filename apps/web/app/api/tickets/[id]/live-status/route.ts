import { NextResponse } from 'next/server';
import { db, TicketStatus, VerificationStatus } from '@parking-ticket-pal/db';
import { auth } from '@/auth';
import { createServerLogger } from '@/lib/logger';
import { pollStatusCheck, type LiveStatusResult } from '@/utils/automation/workerClient';
import { revalidatePath } from 'next/cache';

const logger = createServerLogger({ action: 'live-status-poll' });

/**
 * Poll for live status check result
 *
 * GET /api/tickets/[id]/live-status
 *
 * Returns the current status of the live status check job.
 * If the job is complete, updates the verification record and returns the result.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: ticketId } = await params;

    // Get the ticket and verification
    const ticket = await db.ticket.findUnique({
      where: { id: ticketId },
      include: {
        vehicle: {
          include: {
            user: true,
          },
        },
        verification: true,
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Verify ownership
    if (ticket.vehicle.user.id !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if there's a pending verification with a jobId
    const verification = ticket.verification;
    if (!verification) {
      return NextResponse.json({
        status: 'no_job',
        message: 'No status check in progress',
      });
    }

    const metadata = verification.metadata as {
      jobId?: string;
      portalStatus?: string;
      mappedStatus?: string;
      outstandingAmount?: number;
      canChallenge?: boolean;
      canPay?: boolean;
      screenshotUrl?: string;
      checkedAt?: string;
      error?: string;
      errorMessage?: string;
    } | null;

    // If already verified or failed, return cached result
    if (verification.status === VerificationStatus.VERIFIED) {
      return NextResponse.json({
        status: 'completed',
        result: metadata,
      });
    }

    if (verification.status === VerificationStatus.FAILED) {
      return NextResponse.json({
        status: 'failed',
        result: metadata,
      });
    }

    // If pending, poll the worker
    // UNVERIFIED with a jobId means we have a pending job
    if (verification.status === VerificationStatus.UNVERIFIED && metadata?.jobId) {
      try {
        const pollResult = await pollStatusCheck(metadata.jobId);

        if (pollResult.status === 'running') {
          return NextResponse.json({
            status: 'running',
            progress: pollResult.progress,
          });
        }

        // Job completed - update verification record
        const result = pollResult.result as LiveStatusResult | undefined;

        if (pollResult.status === 'completed' && result?.success) {
          // Update verification with result
          await db.verification.update({
            where: { ticketId },
            data: {
              status: VerificationStatus.VERIFIED,
              verifiedAt: new Date(),
              metadata: {
                portalStatus: result.portalStatus,
                mappedStatus: result.mappedStatus,
                outstandingAmount: result.outstandingAmount,
                canChallenge: result.canChallenge,
                canPay: result.canPay,
                paymentDeadline: result.paymentDeadline,
                screenshotUrl: result.screenshotUrl,
                checkedAt: result.checkedAt,
              },
            },
          });

          // Check if we should update the ticket status
          if (result.mappedStatus && result.mappedStatus !== ticket.status) {
            const newStatus = result.mappedStatus as TicketStatus;

            const terminalStatuses: TicketStatus[] = [
              TicketStatus.PAID,
              TicketStatus.CANCELLED,
              TicketStatus.REPRESENTATION_ACCEPTED,
              TicketStatus.CHARGE_CERTIFICATE,
              TicketStatus.ENFORCEMENT_BAILIFF_STAGE,
            ];

            if (terminalStatuses.includes(newStatus)) {
              await db.ticket.update({
                where: { id: ticketId },
                data: {
                  status: newStatus,
                  statusUpdatedAt: new Date(),
                  statusUpdatedBy: 'LIVE_STATUS_CHECK',
                },
              });

              logger.info('Ticket status updated from live check', {
                ticketId,
                previousStatus: ticket.status,
                newStatus,
              });
            }
          }

          revalidatePath('/tickets/[id]', 'page');

          return NextResponse.json({
            status: 'completed',
            result: {
              portalStatus: result.portalStatus,
              mappedStatus: result.mappedStatus,
              outstandingAmount: result.outstandingAmount,
              canChallenge: result.canChallenge,
              canPay: result.canPay,
              screenshotUrl: result.screenshotUrl,
              checkedAt: result.checkedAt,
            },
          });
        }

        // Job failed
        await db.verification.update({
          where: { ticketId },
          data: {
            status: VerificationStatus.FAILED,
            verifiedAt: new Date(),
            metadata: {
              error: result?.error || 'Unknown error',
              errorMessage: result?.errorMessage,
              screenshotUrl: result?.screenshotUrl,
              checkedAt: result?.checkedAt || new Date().toISOString(),
              portalStatus: result?.portalStatus || '',
              outstandingAmount: result?.outstandingAmount || 0,
              canChallenge: false,
              canPay: false,
            },
          },
        });

        revalidatePath('/tickets/[id]', 'page');

        return NextResponse.json({
          status: 'failed',
          result: {
            error: result?.error || 'Unknown error',
            errorMessage: result?.errorMessage,
            screenshotUrl: result?.screenshotUrl,
          },
        });
      } catch (pollError) {
        logger.error(
          'Error polling status check',
          { ticketId, jobId: metadata.jobId },
          pollError instanceof Error ? pollError : new Error(String(pollError)),
        );

        return NextResponse.json({
          status: 'running',
          error: 'Failed to poll status',
        });
      }
    }

    // Unknown state
    return NextResponse.json({
      status: 'unknown',
      verificationStatus: verification.status,
    });
  } catch (error) {
    logger.error(
      'Error in live-status poll',
      {},
      error instanceof Error ? error : new Error(String(error)),
    );

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
