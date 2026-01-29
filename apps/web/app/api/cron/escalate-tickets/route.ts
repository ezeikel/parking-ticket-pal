import { NextResponse } from 'next/server';
import {
  db,
  TicketStatus,
  NotificationEventType,
} from '@parking-ticket-pal/db';
import { createServerLogger } from '@/lib/logger';
import { subDays } from 'date-fns';
import { createAndSendNotification } from '@/lib/notifications/create';

const logger = createServerLogger({ action: 'cron-escalate-tickets' });

/**
 * Cron job to automatically escalate ticket statuses
 *
 * This endpoint should be called daily (via Vercel Cron or external scheduler)
 *
 * POST /api/cron/escalate-tickets
 *
 * Actions:
 * 1. Find tickets with ISSUED_DISCOUNT_PERIOD status where issuedAt > 14 days ago
 * 2. Update their status to ISSUED_FULL_CHARGE
 * 3. Log the changes for auditing
 */
export async function POST(request: Request) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const cutoffDate = subDays(new Date(), 14);

    // Find tickets that should be escalated from discount to full charge
    const overdueDiscountTickets = await db.ticket.findMany({
      where: {
        status: TicketStatus.ISSUED_DISCOUNT_PERIOD,
        issuedAt: {
          lt: cutoffDate,
        },
      },
      select: {
        id: true,
        pcnNumber: true,
        issuedAt: true,
        initialAmount: true,
        vehicle: {
          select: {
            userId: true,
          },
        },
      },
    });

    logger.info('Found tickets to escalate from discount period', {
      count: overdueDiscountTickets.length,
      cutoffDate: cutoffDate.toISOString(),
    });

    // Process tickets in parallel using Promise.allSettled
    const results = await Promise.allSettled(
      overdueDiscountTickets.map(async (ticket) => {
        // Update ticket status
        await db.ticket.update({
          where: { id: ticket.id },
          data: {
            status: TicketStatus.ISSUED_FULL_CHARGE,
            statusUpdatedAt: new Date(),
            statusUpdatedBy: 'CRON_ESCALATION',
          },
        });

        logger.info('Ticket escalated to full charge', {
          ticketId: ticket.id,
          pcnNumber: ticket.pcnNumber,
          issuedAt: ticket.issuedAt,
          daysSinceIssued: Math.floor(
            (Date.now() - ticket.issuedAt.getTime()) / (1000 * 60 * 60 * 24),
          ),
        });

        // Send notification to user about status escalation
        const fullAmountFormatted = `£${(ticket.initialAmount / 100).toFixed(2)}`;
        const discountAmountFormatted = `£${(ticket.initialAmount / 200).toFixed(2)}`;

        await createAndSendNotification({
          userId: ticket.vehicle.userId,
          ticketId: ticket.id,
          type: NotificationEventType.TICKET_STATUS_UPDATE,
          title: 'Discount Period Ended',
          body: `Your ticket discount period has ended. The amount due has increased from ${discountAmountFormatted} to ${fullAmountFormatted}.`,
          data: {
            previousStatus: 'ISSUED_DISCOUNT_PERIOD',
            newStatus: 'ISSUED_FULL_CHARGE',
            previousAmount: ticket.initialAmount / 2,
            newAmount: ticket.initialAmount,
            source: 'cron_escalation',
          },
        });

        return ticket.id;
      }),
    );

    // Separate successes and failures
    const escalated: string[] = [];
    const errors: { ticketId: string; error: string }[] = [];

    results.forEach((result, index) => {
      const ticket = overdueDiscountTickets[index];
      if (result.status === 'fulfilled') {
        escalated.push(result.value);
      } else {
        const errorMessage = result.reason?.message || 'Unknown error';
        errors.push({ ticketId: ticket.id, error: errorMessage });
        logger.error(
          'Failed to escalate ticket',
          { ticketId: ticket.id },
          result.reason instanceof Error
            ? result.reason
            : new Error(errorMessage),
        );
      }
    });

    return NextResponse.json({
      success: true,
      processed: overdueDiscountTickets.length,
      escalated: escalated.length,
      errors: errors.length,
      details: {
        escalatedIds: escalated,
        errorDetails: errors,
      },
    });
  } catch (error) {
    logger.error(
      'Cron escalate-tickets failed',
      {},
      error instanceof Error ? error : new Error(String(error)),
    );

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

/**
 * GET endpoint for health check / manual trigger
 */
export async function GET(request: Request) {
  // Allow GET for testing/health check but still verify auth
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      {
        endpoint: '/api/cron/escalate-tickets',
        description:
          'Escalates tickets from discount period to full charge after 14 days',
        status: 'ready',
        note: 'Use POST to trigger escalation',
      },
      { status: 200 },
    );
  }

  // If authed, return count of tickets pending escalation
  const cutoffDate = subDays(new Date(), 14);
  const count = await db.ticket.count({
    where: {
      status: TicketStatus.ISSUED_DISCOUNT_PERIOD,
      issuedAt: { lt: cutoffDate },
    },
  });

  return NextResponse.json({
    endpoint: '/api/cron/escalate-tickets',
    description:
      'Escalates tickets from discount period to full charge after 14 days',
    status: 'ready',
    pendingEscalation: count,
    cutoffDate: cutoffDate.toISOString(),
  });
}
