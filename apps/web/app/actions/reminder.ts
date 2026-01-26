'use server';

import { Resend } from 'resend';
import { render } from '@react-email/render';
import ReminderEmail from '@/components/emails/ReminderEmail';
import { db } from '@parking-ticket-pal/db';
import twilio from 'twilio';
import { ReminderType, NotificationType, Prisma } from '@parking-ticket-pal/db';
import { addDays, isAfter, isSameDay } from 'date-fns';
import { createServerLogger } from '@/lib/logger';
import { createAndSendNotification } from '@/lib/notifications/create';

const resend = new Resend(process.env.RESEND_API_KEY!);
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!,
);

export const generateReminders = async (ticket: {
  id: string;
  issuedAt: Date;
  userId?: string; // for checking user preferences/subscription
}) => {
  const logger = createServerLogger({
    action: 'generateReminders',
    ticketId: ticket.id,
  });
  const baseDate = new Date(ticket.issuedAt);
  const now = new Date();

  // check if reminder dates are in the future or today
  const is14DaysInFuture =
    isAfter(addDays(baseDate, 14), now) ||
    isSameDay(addDays(baseDate, 14), now);
  const is28DaysInFuture =
    isAfter(addDays(baseDate, 28), now) ||
    isSameDay(addDays(baseDate, 28), now);

  const reminders: Prisma.ReminderCreateManyInput[] = [];
  const notificationTypes = Object.values(NotificationType);

  // create separate EMAIL and SMS reminders for each type
  if (is14DaysInFuture) {
    notificationTypes.forEach((notificationType) => {
      reminders.push({
        ticketId: ticket.id,
        sendAt: addDays(baseDate, 14),
        type: ReminderType.DISCOUNT_PERIOD,
        notificationType,
      });
    });
  }

  if (is28DaysInFuture) {
    notificationTypes.forEach((notificationType) => {
      reminders.push({
        ticketId: ticket.id,
        sendAt: addDays(baseDate, 28),
        type: ReminderType.FULL_CHARGE,
        notificationType,
      });
    });
  }

  if (reminders.length > 0) {
    try {
      await db.reminder.createMany({
        data: reminders,
      });
      logger.info('Reminders created successfully', {
        reminderCount: reminders.length,
        ticketId: ticket.id,
      });
    } catch (error) {
      logger.error(
        'Failed to create reminders',
        {
          ticketId: ticket.id,
        },
        error as Error,
      );
    }
  }
};

export const sendReminder = async (reminderId: string) => {
  const logger = createServerLogger({ action: 'sendReminder', reminderId });

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

  logger.debug('Retrieved reminder', {
    reminderId: reminder?.id,
    ticketId: reminder?.ticketId,
  });

  if (!reminder) {
    return { error: 'Reminder not found' };
  }

  const { user } = reminder.ticket.vehicle;

  const reminderLabel =
    reminder.type === ReminderType.DISCOUNT_PERIOD ? '14-day' : '28-day';

  const notificationTitle = `${reminderLabel} Ticket Reminder`;
  const notificationBody = `Your parking ticket ${reminder.ticket.pcnNumber} for ${reminder.ticket.vehicle.registrationNumber} is approaching the ${reminderLabel} deadline.`;

  try {
    // Create in-app notification and send push (respects user preferences)
    if (reminder.notificationType === NotificationType.PUSH) {
      await createAndSendNotification({
        userId: user.id,
        ticketId: reminder.ticket.id,
        type: 'TICKET_DEADLINE_REMINDER',
        title: notificationTitle,
        body: notificationBody,
        data: {
          reminderType: reminderLabel,
          pcnNumber: reminder.ticket.pcnNumber,
        },
      });
    }

    // email
    if (reminder.notificationType === NotificationType.EMAIL) {
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
        from: `Parking Ticket Pal <${process.env.DEFAULT_FROM_EMAIL}>`,
        to: user.email,
        subject: `🚨 ${reminderLabel} Ticket Reminder`,
        html,
      });
    }

    // sms
    if (
      reminder.notificationType === NotificationType.SMS &&
      user.phoneNumber
    ) {
      const text = `Reminder: Your parking ticket ${reminder.ticket.pcnNumber} for vehicle registration ${reminder.ticket.vehicle.registrationNumber} issued on ${reminder.ticket.issuedAt.toLocaleDateString()} by ${reminder.ticket.issuer} is approaching the ${reminderLabel} deadline. Please check the app.`;

      await twilioClient.messages.create({
        from: process.env.TWILIO_PHONE_NUMBER!,
        to: user.phoneNumber,
        body: text,
      });
    } else {
      // TODO: skip SMS reminders if user has no phone number (don't treat as error)
      logger.warn('Skipping SMS reminder - user has no phone number', {
        reminderId,
        userId: reminder.ticket.vehicle?.user.id,
      });
    }

    // mark as sent
    await db.reminder.update({
      where: { id: reminder.id },
      data: { sentAt: new Date() },
    });

    return { success: true };
  } catch (err: unknown) {
    logger.error('Failed to send reminder', { reminderId }, err as Error);

    return {
      error: err instanceof Error ? err.message : 'An unknown error occurred',
    };
  }
};
