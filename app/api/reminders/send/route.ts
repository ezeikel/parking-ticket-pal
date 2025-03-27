import { NextResponse } from 'next/server';
import { db } from '@/lib/prisma';
import { sendReminder } from '@/app/actions/reminder';
import { startOfDay, endOfDay } from 'date-fns';

export const dynamic = 'force-dynamic';

export const POST = async () => {
  const now = new Date();
  const start = startOfDay(now);
  const end = endOfDay(now);

  const dueReminders = await db.reminder.findMany({
    where: {
      sendAt: { gte: start, lte: end },
      sentAt: null,
    },
    select: { id: true },
  });

  const results = await Promise.all(
    dueReminders.map(async (reminder) => {
      const result = await sendReminder(reminder.id);
      return { id: reminder.id, ...result };
    }),
  );

  return NextResponse.json({ sent: results.length, details: results });
};
