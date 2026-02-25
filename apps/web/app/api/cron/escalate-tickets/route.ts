import { NextResponse } from 'next/server';
import {
  db,
  TicketStatus,
  IssuerType,
  NotificationEventType,
} from '@parking-ticket-pal/db';
import { createServerLogger } from '@/lib/logger';
import { subDays } from 'date-fns';
import { createAndSendNotification } from '@/lib/notifications/create';
import { track } from '@/utils/analytics-server';
import { TRACKING_EVENTS } from '@/constants/events';

const logger = createServerLogger({ action: 'cron-escalate-tickets' });

/**
 * Cron job to automatically escalate ticket statuses
 *
 * This endpoint should be called daily (via Vercel Cron or external scheduler)
 *
 * POST /api/cron/escalate-tickets
 *
 * Actions:
 * 1. ISSUED_DISCOUNT_PERIOD → ISSUED_FULL_CHARGE (14 days from issuedAt)
 * 2. ISSUED_FULL_CHARGE → NOTICE_TO_OWNER (28 days from statusUpdatedAt, council only)
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

        const daysSinceIssued = Math.floor(
          (Date.now() - ticket.issuedAt.getTime()) / (1000 * 60 * 60 * 24),
        );

        logger.info('Ticket escalated to full charge', {
          ticketId: ticket.id,
          pcnNumber: ticket.pcnNumber,
          issuedAt: ticket.issuedAt,
          daysSinceIssued,
        });

        const challengeCount = await db.challenge.count({
          where: { ticketId: ticket.id },
        });

        await track(TRACKING_EVENTS.TICKET_DEADLINE_APPROACHING, {
          ticket_id: ticket.id,
          days_remaining: 0,
          has_challenged: challengeCount > 0,
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

    // Separate successes and failures for discount → full charge
    const escalatedToFullCharge: string[] = [];
    const discountErrors: { ticketId: string; error: string }[] = [];

    results.forEach((result, index) => {
      const ticket = overdueDiscountTickets[index];
      if (result.status === 'fulfilled') {
        escalatedToFullCharge.push(result.value);
      } else {
        const errorMessage = result.reason?.message || 'Unknown error';
        discountErrors.push({ ticketId: ticket.id, error: errorMessage });
        logger.error(
          'Failed to escalate ticket',
          { ticketId: ticket.id },
          result.reason instanceof Error
            ? result.reason
            : new Error(errorMessage),
        );
      }
    });

    // ============================================================
    // ESCALATION 2: ISSUED_FULL_CHARGE → NOTICE_TO_OWNER (28 days)
    // Only for council tickets with statusUpdatedAt set
    // ============================================================
    const ntoEscalationCutoff = subDays(new Date(), 28);

    const fullChargeTickets = await db.ticket.findMany({
      where: {
        status: TicketStatus.ISSUED_FULL_CHARGE,
        issuerType: IssuerType.COUNCIL,
        statusUpdatedAt: {
          not: null,
          lt: ntoEscalationCutoff,
        },
      },
      select: {
        id: true,
        pcnNumber: true,
        statusUpdatedAt: true,
        initialAmount: true,
        vehicle: {
          select: {
            userId: true,
          },
        },
      },
    });

    logger.info('Found tickets to escalate from full charge to NtO', {
      count: fullChargeTickets.length,
      cutoffDate: ntoEscalationCutoff.toISOString(),
    });

    const ntoResults = await Promise.allSettled(
      fullChargeTickets.map(async (ticket) => {
        await db.ticket.update({
          where: { id: ticket.id },
          data: {
            status: TicketStatus.NOTICE_TO_OWNER,
            statusUpdatedAt: new Date(),
            statusUpdatedBy: 'CRON_ESCALATION',
          },
        });

        logger.info('Ticket escalated to Notice to Owner', {
          ticketId: ticket.id,
          pcnNumber: ticket.pcnNumber,
          statusUpdatedAt: ticket.statusUpdatedAt,
          daysSinceFullCharge: ticket.statusUpdatedAt
            ? Math.floor(
                (Date.now() - ticket.statusUpdatedAt.getTime()) /
                  (1000 * 60 * 60 * 24),
              )
            : null,
        });

        const ntoChallengeCount = await db.challenge.count({
          where: { ticketId: ticket.id },
        });

        await track(TRACKING_EVENTS.TICKET_DEADLINE_APPROACHING, {
          ticket_id: ticket.id,
          days_remaining: 0,
          has_challenged: ntoChallengeCount > 0,
        });

        // Send notification to user about NtO stage
        await createAndSendNotification({
          userId: ticket.vehicle.userId,
          ticketId: ticket.id,
          type: NotificationEventType.TICKET_STATUS_UPDATE,
          title: 'Notice to Owner Stage',
          body: `Your ticket has progressed to the Notice to Owner (NtO) stage. You have 28 days to make formal representations.`,
          data: {
            previousStatus: 'ISSUED_FULL_CHARGE',
            newStatus: 'NOTICE_TO_OWNER',
            source: 'cron_escalation',
          },
        });

        return ticket.id;
      }),
    );

    // Separate successes and failures for full charge → NtO
    const escalatedToNto: string[] = [];
    const ntoErrors: { ticketId: string; error: string }[] = [];

    ntoResults.forEach((result, index) => {
      const ticket = fullChargeTickets[index];
      if (result.status === 'fulfilled') {
        escalatedToNto.push(result.value);
      } else {
        const errorMessage = result.reason?.message || 'Unknown error';
        ntoErrors.push({ ticketId: ticket.id, error: errorMessage });
        logger.error(
          'Failed to escalate ticket to NtO',
          { ticketId: ticket.id },
          result.reason instanceof Error
            ? result.reason
            : new Error(errorMessage),
        );
      }
    });

    return NextResponse.json({
      success: true,
      discountToFullCharge: {
        processed: overdueDiscountTickets.length,
        escalated: escalatedToFullCharge.length,
        errors: discountErrors.length,
        escalatedIds: escalatedToFullCharge,
        errorDetails: discountErrors,
      },
      fullChargeToNto: {
        processed: fullChargeTickets.length,
        escalated: escalatedToNto.length,
        errors: ntoErrors.length,
        escalatedIds: escalatedToNto,
        errorDetails: ntoErrors,
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
          'Escalates tickets: discount→full charge (14d), full charge→NtO (28d, council only)',
        status: 'ready',
        note: 'Use POST to trigger escalation',
      },
      { status: 200 },
    );
  }

  // If authed, return count of tickets pending escalation
  const discountCutoff = subDays(new Date(), 14);
  const ntoCutoff = subDays(new Date(), 28);

  const [discountCount, ntoCount] = await Promise.all([
    db.ticket.count({
      where: {
        status: TicketStatus.ISSUED_DISCOUNT_PERIOD,
        issuedAt: { lt: discountCutoff },
      },
    }),
    db.ticket.count({
      where: {
        status: TicketStatus.ISSUED_FULL_CHARGE,
        issuerType: IssuerType.COUNCIL,
        statusUpdatedAt: {
          not: null,
          lt: ntoCutoff,
        },
      },
    }),
  ]);

  return NextResponse.json({
    endpoint: '/api/cron/escalate-tickets',
    description:
      'Escalates tickets: discount→full charge (14d), full charge→NtO (28d, council only)',
    status: 'ready',
    pending: {
      discountToFullCharge: discountCount,
      fullChargeToNto: ntoCount,
    },
    cutoffs: {
      discountPeriod: discountCutoff.toISOString(),
      ntoEscalation: ntoCutoff.toISOString(),
    },
  });
}
