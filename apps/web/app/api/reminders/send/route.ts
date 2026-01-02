import { NextResponse } from 'next/server';
import { db } from '@/lib/prisma';
import { sendReminder } from '@/app/actions/reminder';
import { startOfDay, endOfDay } from 'date-fns';

export const dynamic = 'force-dynamic';

const handleRequest = async () => {
  const now = new Date();
  const start = startOfDay(now);
  const end = endOfDay(now);

  // DEBUG:
  console.log('now', now);
  console.log('start', start);
  console.log('end', end);

  // Only send reminders that are due today
  // For EMAIL and SMS: only send for tickets that are STANDARD or PREMIUM
  // For PUSH: send for all tiers (free users get in-app + push)
  const dueReminders = await db.reminder.findMany({
    where: {
      sendAt: { gte: start, lte: end },
      sentAt: null,
      OR: [
        // PUSH notifications for all tiers
        { notificationType: 'PUSH' },
        // EMAIL/SMS only for paid tiers
        {
          notificationType: { in: ['EMAIL', 'SMS'] },
          ticket: {
            tier: { in: ['STANDARD', 'PREMIUM'] },
          },
        },
      ],
    },
    select: { id: true },
  });

  // DEBUG:
  console.log('dueReminders', dueReminders);

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
