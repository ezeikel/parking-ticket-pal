/* eslint-disable no-restricted-syntax, no-continue, no-await-in-loop, no-plusplus */
import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';
import { db as prisma } from '@parking-ticket-pal/db';
import { createServerLogger } from '@/lib/logger';

const log = createServerLogger({ action: 'push-notification' });

// Create a new Expo SDK client
const expo = new Expo({
  accessToken: process.env.EXPO_ACCESS_TOKEN,
  // useFcmV1: true, // Enable FCM v1 (optional, recommended for new projects)
});

type PushNotificationData = {
  ticketId?: string;
  [key: string]: any;
};

/**
 * Send push notification to a specific user
 */
export async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  data?: PushNotificationData,
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get user's push tokens
    const pushTokens = await prisma.pushToken.findMany({
      where: { userId },
    });

    if (pushTokens.length === 0) {
      log.info('No push tokens found for user', { userId });
      return { success: true }; // Not an error, user just doesn't have tokens
    }

    // Filter out invalid tokens and create messages
    const messages: ExpoPushMessage[] = [];

    for (const { token } of pushTokens) {
      // Check if token is valid Expo push token
      if (!Expo.isExpoPushToken(token)) {
        log.error('Invalid Expo push token', { token });
        continue;
      }

      messages.push({
        to: token,
        sound: 'default',
        title,
        body,
        data: data || {},
        priority: 'high',
      });
    }

    if (messages.length === 0) {
      return {
        success: false,
        error: 'No valid push tokens',
      };
    }

    // Send notifications in chunks
    const chunks = expo.chunkPushNotifications(messages);
    const tickets: ExpoPushTicket[] = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        log.error(
          'Error sending push notification chunk',
          undefined,
          error instanceof Error ? error : undefined,
        );
      }
    }

    // Handle tickets and remove invalid tokens
    for (let i = 0; i < tickets.length; i++) {
      const ticket = tickets[i];

      if (ticket.status === 'error') {
        log.error('Push notification error', { message: ticket.message });

        // Remove invalid tokens
        if (
          ticket.details?.error === 'DeviceNotRegistered' ||
          ticket.details?.error === 'InvalidCredentials'
        ) {
          const invalidToken = messages[i].to as string;
          await prisma.pushToken.deleteMany({
            where: { token: invalidToken },
          });
          log.info('Removed invalid push token', { token: invalidToken });
        }
      }
    }

    return { success: true };
  } catch (error) {
    log.error(
      'Error sending push notification',
      undefined,
      error instanceof Error ? error : undefined,
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send push notification to multiple users
 */
export async function sendPushNotificationToUsers(
  userIds: string[],
  title: string,
  body: string,
  data?: PushNotificationData,
): Promise<{ success: boolean; error?: string }> {
  try {
    const results = await Promise.allSettled(
      userIds.map((userId) => sendPushNotification(userId, title, body, data)),
    );

    const failures = results.filter((r) => r.status === 'rejected');

    if (failures.length > 0) {
      log.error('Push notifications failed to send', {
        failureCount: failures.length,
      });
    }

    return { success: true };
  } catch (error) {
    log.error(
      'Error sending push notifications to users',
      undefined,
      error instanceof Error ? error : undefined,
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
