'use server';

import { render } from '@react-email/render';
import ReminderEmail from '@/emails/ReminderEmail';
import {
  db,
  LetterType,
  ReminderType,
  NotificationType,
  Prisma,
} from '@parking-ticket-pal/db';
import { addDays, isAfter, isSameDay } from 'date-fns';
import { getContraventionDetails } from '@parking-ticket-pal/constants';
import { createServerLogger } from '@/lib/logger';
import { createAndSendNotification } from '@/lib/notifications/create';
import { sendEmail } from '@/lib/email';
import { sendSms } from '@/lib/sms';

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

// ============================================
// Letter type → reminder mapping
// ============================================
//
// These reminders are event-driven: they fire when the user tells us
// they received a specific document by uploading it as a letter.
// The deadline clock starts from the letter's sentAt date.
//
// We never assume what happens offline — if the user doesn't upload
// a letter, no reminder is generated for that stage.

const LETTER_REMINDER_MAP: Partial<
  Record<LetterType, { type: ReminderType; daysFromLetter: number }>
> = {
  // NTO received → 28 days to make formal representations
  NOTICE_TO_OWNER: {
    type: ReminderType.NOTICE_TO_OWNER_RESPONSE,
    daysFromLetter: 28,
  },
  // Challenge rejected by issuer → 28 days to appeal to adjudicator
  CHALLENGE_REJECTED: {
    type: ReminderType.APPEAL_DEADLINE,
    daysFromLetter: 28,
  },
  // Charge certificate → 14 days to pay increased amount
  CHARGE_CERTIFICATE: {
    type: ReminderType.CHARGE_CERTIFICATE_RESPONSE,
    daysFromLetter: 14,
  },
  // Order for recovery → deadline depends on contravention type
  // Parking: 36 days for TE7/TE9 witness statement
  // Bus lane/moving traffic: 21 days for PE2/PE3 statutory declaration
  // We resolve this at generation time using the ticket's contravention code
  ORDER_FOR_RECOVERY: {
    type: ReminderType.FORM_DEADLINE,
    daysFromLetter: 36, // default to parking; overridden for moving traffic below
  },
};

/**
 * Generate deadline reminders when a user uploads an incoming letter.
 *
 * Unlike ticket-creation reminders (which are deterministic from issue date),
 * these are event-driven — the clock starts when the user tells us they
 * received a specific document.
 */
export const generateLetterReminders = async (letter: {
  type: LetterType;
  sentAt: Date;
  ticketId: string;
  contraventionCode?: string | null;
}) => {
  const logger = createServerLogger({
    action: 'generateLetterReminders',
    ticketId: letter.ticketId,
  });

  const mapping = LETTER_REMINDER_MAP[letter.type];
  if (!mapping) return;

  let { daysFromLetter } = mapping;

  // For ORDER_FOR_RECOVERY, use 21 days for moving traffic (bus lanes)
  // instead of the default 36 days for parking
  if (
    letter.type === LetterType.ORDER_FOR_RECOVERY &&
    letter.contraventionCode
  ) {
    const details = getContraventionDetails(letter.contraventionCode);
    if (details.category === 'moving-traffic') {
      daysFromLetter = 21;
    }
  }

  const deadline = addDays(new Date(letter.sentAt), daysFromLetter);
  const now = new Date();

  // Only create reminders if the deadline is still in the future
  if (!isAfter(deadline, now) && !isSameDay(deadline, now)) {
    logger.info('Skipping letter reminder — deadline already passed', {
      ticketId: letter.ticketId,
      letterType: letter.type,
      deadline: deadline.toISOString(),
    });
    return;
  }

  // Check for existing reminders of this type for this ticket to avoid duplicates
  const existing = await db.reminder.findFirst({
    where: {
      ticketId: letter.ticketId,
      type: mapping.type,
      sentAt: null, // only unsent reminders
    },
  });

  if (existing) {
    logger.info('Letter reminder already exists, skipping', {
      ticketId: letter.ticketId,
      reminderType: mapping.type,
      existingReminderId: existing.id,
    });
    return;
  }

  const notificationTypes = Object.values(NotificationType);
  const reminders: Prisma.ReminderCreateManyInput[] = notificationTypes.map(
    (notificationType) => ({
      ticketId: letter.ticketId,
      sendAt: deadline,
      type: mapping.type,
      notificationType,
    }),
  );

  try {
    await db.reminder.createMany({ data: reminders });
    logger.info('Letter reminders created', {
      ticketId: letter.ticketId,
      letterType: letter.type,
      reminderType: mapping.type,
      deadline: deadline.toISOString(),
      daysFromLetter,
      count: reminders.length,
    });
  } catch (error) {
    logger.error(
      'Failed to create letter reminders',
      { ticketId: letter.ticketId, letterType: letter.type },
      error as Error,
    );
  }
};

// ============================================
// Reminder type → human-readable labels
// ============================================

const REMINDER_LABELS: Record<ReminderType, { label: string; action: string }> =
  {
    DISCOUNT_PERIOD: {
      label: '14-day discount',
      action: 'Pay at 50% discount or submit an informal challenge',
    },
    FULL_CHARGE: {
      label: '28-day payment',
      action: 'Pay the full amount or the penalty will escalate',
    },
    NOTICE_TO_OWNER_RESPONSE: {
      label: 'Formal representation',
      action: 'Make formal representations or the penalty will increase',
    },
    APPEAL_DEADLINE: {
      label: 'Tribunal appeal',
      action: 'Appeal to the independent adjudicator before the deadline',
    },
    CHARGE_CERTIFICATE_RESPONSE: {
      label: 'Charge certificate payment',
      action:
        'Pay the increased amount or the debt will be registered at court',
    },
    FORM_DEADLINE: {
      label: 'Witness statement',
      action:
        'File a TE9/PE3 witness statement before the deadline or bailiffs may be instructed',
    },
    OUT_OF_TIME_NOTICE: {
      label: 'Out of time',
      action: 'Your ticket has passed all standard appeal deadlines',
    },
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

  const { label: reminderLabel, action: reminderAction } = REMINDER_LABELS[
    reminder.type
  ] || {
    label: 'deadline',
    action: 'Check your ticket in the app',
  };

  const notificationTitle = `${reminderLabel} deadline approaching`;
  const notificationBody = `Your parking ticket ${reminder.ticket.pcnNumber} for ${reminder.ticket.vehicle.registrationNumber}: ${reminderAction}.`;

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
    if (reminder.notificationType === NotificationType.EMAIL && user.email) {
      const emailHtml = await render(
        ReminderEmail({
          name: user.name ?? '',
          reminderType: reminderLabel,
          pcnNumber: reminder.ticket.pcnNumber,
          vehicleRegistration: reminder.ticket.vehicle.registrationNumber,
          issueDate: reminder.ticket.issuedAt.toLocaleDateString(),
          issuer: reminder.ticket.issuer,
        }),
      );

      const emailText = await render(
        ReminderEmail({
          name: user.name ?? '',
          reminderType: reminderLabel,
          pcnNumber: reminder.ticket.pcnNumber,
          vehicleRegistration: reminder.ticket.vehicle.registrationNumber,
          issueDate: reminder.ticket.issuedAt.toLocaleDateString(),
          issuer: reminder.ticket.issuer,
        }),
        { plainText: true },
      );

      await sendEmail({
        to: user.email,
        subject: `${reminderLabel} deadline approaching — ${reminder.ticket.pcnNumber}`,
        html: emailHtml,
        text: emailText,
      });
    }

    // sms
    if (reminder.notificationType === NotificationType.SMS) {
      if (user.phoneNumber) {
        const text = `Reminder: Your parking ticket ${reminder.ticket.pcnNumber} for vehicle registration ${reminder.ticket.vehicle.registrationNumber} issued on ${reminder.ticket.issuedAt.toLocaleDateString()} by ${reminder.ticket.issuer} is approaching the ${reminderLabel} deadline. Please check the app.`;

        const smsResult = await sendSms({
          to: user.phoneNumber,
          body: text,
        });

        if (!smsResult.success) {
          throw new Error(`SMS failed: ${smsResult.error}`);
        }
      } else {
        logger.warn('Skipping SMS reminder - user has no phone number', {
          reminderId,
          userId: user.id,
        });
      }
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
