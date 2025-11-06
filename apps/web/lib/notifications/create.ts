import type { NotificationEventType } from '@prisma/client';
import { createNotification } from '@/app/actions/notification';
import { sendPushNotification } from './push';
import { db as prisma } from '@/lib/prisma';

interface NotificationPreferences {
  inApp: boolean;
  email: boolean;
  sms: boolean;
  push: boolean;
}

interface CreateAndSendNotificationOptions {
  userId: string;
  ticketId?: string | null;
  type: NotificationEventType;
  title: string;
  body: string;
  data?: Record<string, any>;
  sendPush?: boolean; // Override push sending (useful for testing)
}

/**
 * Create a notification in the database and optionally send push notification
 * Respects user notification preferences
 */
export async function createAndSendNotification(
  options: CreateAndSendNotificationOptions,
): Promise<{ success: boolean; error?: string }> {
  const { userId, ticketId = null, type, title, body, data, sendPush = true } = options;

  try {
    // Get user's notification preferences
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { notificationPreferences: true },
    });

    if (!user) {
      return {
        success: false,
        error: 'User not found',
      };
    }

    const preferences = (user.notificationPreferences as NotificationPreferences) || {
      inApp: true,
      email: true,
      sms: true,
      push: true,
    };

    // Always create in-app notification if in-app notifications are enabled
    if (preferences.inApp) {
      const notificationResult = await createNotification(
        userId,
        ticketId,
        type,
        title,
        body,
        data,
      );

      if (!notificationResult.success) {
        console.error('Failed to create in-app notification:', notificationResult.error);
      }
    }

    // Send push notification if enabled in preferences
    if (sendPush && preferences.push) {
      const pushData = {
        ...data,
        ...(ticketId && { ticketId }),
      };

      const pushResult = await sendPushNotification(userId, title, body, pushData);

      if (!pushResult.success) {
        console.error('Failed to send push notification:', pushResult.error);
        // Don't fail the whole operation if push fails
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error in createAndSendNotification:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Create notifications for multiple users
 */
export async function createAndSendNotificationToUsers(
  userIds: string[],
  options: Omit<CreateAndSendNotificationOptions, 'userId'>,
): Promise<{ success: boolean; error?: string }> {
  try {
    await Promise.allSettled(
      userIds.map((userId) =>
        createAndSendNotification({
          ...options,
          userId,
        }),
      ),
    );

    return { success: true };
  } catch (error) {
    console.error('Error in createAndSendNotificationToUsers:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
