'use server';

import { db as prisma } from '@parking-ticket-pal/db';
import type {
  NotificationEventType,
  Platform,
  Prisma,
} from '@parking-ticket-pal/db';
import { createServerLogger } from '@/lib/logger';

const log = createServerLogger({ action: 'notification' });

type NotificationPreferences = {
  inApp: boolean;
  email: boolean;
  sms: boolean;
  push: boolean;
};

// Get user notifications with pagination
export async function getUserNotifications(
  userId: string,
  options: { limit?: number; offset?: number; unreadOnly?: boolean } = {},
) {
  try {
    const { limit = 50, offset = 0, unreadOnly = false } = options;

    const where = {
      userId,
      ...(unreadOnly && { read: false }),
    };

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          ticket: {
            select: {
              id: true,
              pcnNumber: true,
              status: true,
            },
          },
        },
      }),
      prisma.notification.count({
        where: { userId, read: false },
      }),
    ]);

    return {
      success: true,
      notifications,
      unreadCount,
    };
  } catch (error) {
    log.error(
      'Error getting user notifications',
      undefined,
      error instanceof Error ? error : undefined,
    );
    return {
      success: false,
      error: 'Failed to fetch notifications',
    };
  }
}

// Mark notification as read
export async function markNotificationAsRead(
  notificationId: string,
  userId: string,
) {
  try {
    // First check if notification belongs to user
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      return {
        success: false,
        error: 'Notification not found',
      };
    }

    if (notification.userId !== userId) {
      return {
        success: false,
        error: 'Unauthorized',
      };
    }

    // Update notification
    const updatedNotification = await prisma.notification.update({
      where: { id: notificationId },
      data: {
        read: true,
        readAt: new Date(),
      },
    });

    return {
      success: true,
      notification: updatedNotification,
    };
  } catch (error) {
    log.error(
      'Error marking notification as read',
      undefined,
      error instanceof Error ? error : undefined,
    );
    return {
      success: false,
      error: 'Failed to mark notification as read',
    };
  }
}

// Get notification preferences
export async function getNotificationPreferences(userId: string) {
  try {
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

    const preferences =
      (user.notificationPreferences as unknown as NotificationPreferences) || {
        inApp: true,
        email: true,
        sms: true,
        push: true,
      };

    return {
      success: true,
      preferences,
    };
  } catch (error) {
    log.error(
      'Error getting notification preferences',
      undefined,
      error instanceof Error ? error : undefined,
    );
    return {
      success: false,
      error: 'Failed to fetch notification preferences',
    };
  }
}

// Update notification preferences
export async function updateNotificationPreferences(
  userId: string,
  preferences: NotificationPreferences,
) {
  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        notificationPreferences:
          preferences as unknown as Prisma.InputJsonValue,
      },
      select: { notificationPreferences: true },
    });

    return {
      success: true,
      preferences:
        user.notificationPreferences as unknown as NotificationPreferences,
    };
  } catch (error) {
    log.error(
      'Error updating notification preferences',
      undefined,
      error instanceof Error ? error : undefined,
    );
    return {
      success: false,
      error: 'Failed to update notification preferences',
    };
  }
}

// Register push token
export async function registerPushToken(
  userId: string,
  token: string,
  platform: Platform,
  deviceId?: string,
) {
  try {
    // Upsert push token (update if exists, create if not)
    const pushToken = await prisma.pushToken.upsert({
      where: {
        userId_token: {
          userId,
          token,
        },
      },
      update: {
        lastUsed: new Date(),
        platform,
        deviceId,
      },
      create: {
        userId,
        token,
        platform,
        deviceId,
      },
    });

    return {
      success: true,
      pushToken,
    };
  } catch (error) {
    log.error(
      'Error registering push token',
      undefined,
      error instanceof Error ? error : undefined,
    );
    return {
      success: false,
      error: 'Failed to register push token',
    };
  }
}

// Unregister push token
export async function unregisterPushToken(userId: string, token: string) {
  try {
    await prisma.pushToken.deleteMany({
      where: {
        userId,
        token,
      },
    });

    return {
      success: true,
    };
  } catch (error) {
    log.error(
      'Error unregistering push token',
      undefined,
      error instanceof Error ? error : undefined,
    );
    return {
      success: false,
      error: 'Failed to unregister push token',
    };
  }
}

// Create notification (used by cron job and other services)
export async function createNotification(
  userId: string,
  ticketId: string | null,
  type: NotificationEventType,
  title: string,
  body: string,
  data?: Record<string, any>,
) {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        ticketId,
        type,
        title,
        body,
        data: data || {},
      },
    });

    return {
      success: true,
      notification,
    };
  } catch (error) {
    log.error(
      'Error creating notification',
      undefined,
      error instanceof Error ? error : undefined,
    );
    return {
      success: false,
      error: 'Failed to create notification',
    };
  }
}
