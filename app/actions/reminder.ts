'use server';

import { Resend } from 'resend';
import { render } from '@react-email/render';
import ReminderEmail from '@/components/emails/ReminderEmail';
import { db } from '@/lib/prisma';
import twilio from 'twilio';
import { ReminderType, NotificationType } from '@prisma/client';

const resend = new Resend(process.env.RESEND_API_KEY!);
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!,
);

// eslint-disable-next-line import/prefer-default-export
export const sendReminder = async (reminderId: string) => {
  const reminder = await db.reminder.findUnique({
    where: { id: reminderId },
    include: {
      ticket: {
        include: {
          vehicle: {
            include: {
              user: true,
            },
          },
        },
      },
    },
  });

  if (!reminder) {
    return { error: 'Reminder not found' };
  }

  const { user } = reminder.ticket.vehicle;

  const reminderLabel =
    reminder.type === ReminderType.DISCOUNT_PERIOD ? '14-day' : '28-day';
  const text = `Reminder: Your parking ticket ${reminder.ticket.pcnNumber} for vehicle registration ${reminder.ticket.vehicle.registrationNumber} issued on ${reminder.ticket.issuedAt.toLocaleDateString()} by ${reminder.ticket.issuer} is approaching the ${reminderLabel} deadline. Please check the app.`;

  try {
    // email
    if (
      reminder.notificationType === NotificationType.EMAIL ||
      reminder.notificationType === NotificationType.ALL
    ) {
      const html = await render(
        ReminderEmail({
          name: user.name ?? '',
          reminderType: reminderLabel as '14-day' | '28-day',
          pcnNumber: reminder.ticket.pcnNumber,
          vehicleRegistration: reminder.ticket.vehicle.registrationNumber,
          issueDate: reminder.ticket.issuedAt.toLocaleDateString(),
          issuer: reminder.ticket.issuer,
        }),
      );

      await resend.emails.send({
        from: 'Parking Ticket Pal Reminders <reminders@parkingticketpal.com>',
        to: user.email,
        subject: `🚨 ${reminderLabel} Ticket Reminder`,
        html,
      });
    }

    // text message
    if (
      (reminder.notificationType === NotificationType.SMS ||
        reminder.notificationType === NotificationType.ALL) &&
      user.phoneNumber
    ) {
      await twilioClient.messages.create({
        from: process.env.TWILIO_PHONE_NUMBER!,
        to: user.phoneNumber,
        body: text,
      });
    }

    // mark as sent
    await db.reminder.update({
      where: { id: reminder.id },
      data: { sentAt: new Date() },
    });

    return { success: true };
  } catch (err: unknown) {
    // eslint-disable-next-line no-console
    console.error(err);

    return {
      error: err instanceof Error ? err.message : 'An unknown error occurred',
    };
  }
};
