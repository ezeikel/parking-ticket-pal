import { NextRequest, NextResponse } from 'next/server';
import { db } from '@parking-ticket-pal/db';
import { sendReminder } from '@/app/actions/reminder';
import { startOfDay, endOfDay } from 'date-fns';
import { createServerLogger } from '@/lib/logger';

const logger = createServerLogger({ action: 'cron:reminders-send' });

const handleRequest = async (request: NextRequest) => {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const start = startOfDay(now);
  const end = endOfDay(now);

  logger.debug('Checking for due reminders', {
    now: now.toISOString(),
    start: start.toISOString(),
    end: end.toISOString(),
  });

  // Only send reminders that are due today
  // For EMAIL and PUSH: send for all tiers
  // For SMS: only send for PREMIUM tickets
  const dueReminders = await db.reminder.findMany({
    where: {
      sendAt: { gte: start, lte: end },
      sentAt: null,
      OR: [
        // PUSH and EMAIL notifications for all tiers
        { notificationType: { in: ['PUSH', 'EMAIL'] } },
        // SMS only for paid tiers
        {
          notificationType: 'SMS',
          ticket: {
            tier: 'PREMIUM',
          },
        },
      ],
    },
    select: { id: true },
  });

  logger.info('Found due reminders', { count: dueReminders.length });

  const results = await Promise.all(
    dueReminders.map(async (reminder) => {
      const result = await sendReminder(reminder.id);
      return { id: reminder.id, ...result };
    }),
  );

  return NextResponse.json({ sent: results.length, details: results });
};

export const GET = handleRequest;
export const POST = handleRequest;
