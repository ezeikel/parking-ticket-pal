import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import { registerPushToken, unregisterPushToken as unregisterPushTokenAPI } from '@/api';
import { logger } from '@/lib/logger';

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Request notification permissions from the user
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  if (!Device.isDevice) {
    logger.info('Must use physical device for push notifications', { action: 'notifications' });
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    logger.info('Push notification permission not granted', { action: 'notifications', status: finalStatus });
    return false;
  }

  return true;
}

/**
 * Get Expo push token and register it with the backend
 */
export async function registerForPushNotifications(): Promise<string | null> {
  try {
    // Check if it's a physical device
    if (!Device.isDevice) {
      logger.info('Must use physical device for push notifications', { action: 'notifications' });
      return null;
    }

    // Request permissions
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      return null;
    }

    // Get the token
    const token = (
      await Notifications.getExpoPushTokenAsync({
        projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
      })
    ).data;

    logger.debug('Expo push token obtained', { action: 'notifications', token });

    // Register token with backend
    const platform = Platform.OS === 'ios' ? 'IOS' : 'ANDROID';
    const deviceId = Device.deviceName || undefined;

    await registerPushToken(token, platform, deviceId);

    // Configure notification channel for Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    return token;
  } catch (error) {
    logger.error('Error registering for push notifications', { action: 'notifications' }, error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

/**
 * Unregister push token (call on logout)
 */
export async function unregisterPushToken(): Promise<void> {
  try {
    const token = (
      await Notifications.getExpoPushTokenAsync({
        projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
      })
    ).data;

    await unregisterPushTokenAPI(token);
  } catch (error) {
    logger.error('Error unregistering push token', { action: 'notifications' }, error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Setup notification listeners (foreground, background, tap handling)
 */
export function setupNotificationListeners() {
  // Handle notifications received while app is in foreground
  const foregroundSubscription = Notifications.addNotificationReceivedListener(
    (notification) => {
      logger.debug('Notification received in foreground', { action: 'notifications', notificationId: notification.request.identifier });
    },
  );

  // Handle notification tap (when user taps notification)
  const responseSubscription = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      const data = response.notification.request.content.data;
      handleNotificationTap(data);
    },
  );

  // Return cleanup function
  return () => {
    foregroundSubscription.remove();
    responseSubscription.remove();
  };
}

/**
 * Handle navigation when user taps a notification
 */
function handleNotificationTap(data: any) {
  logger.debug('Notification tapped', { action: 'notifications', ticketId: data.ticketId });

  if (data.ticketId) {
    // Navigate to ticket detail screen
    router.push(`/(authenticated)/ticket/${data.ticketId}`);
  }
}

/**
 * Get current notification badge count
 */
export async function getBadgeCount(): Promise<number> {
  return await Notifications.getBadgeCountAsync();
}

/**
 * Set notification badge count
 */
export async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}

/**
 * Clear all notifications
 */
export async function clearAllNotifications(): Promise<void> {
  await Notifications.dismissAllNotificationsAsync();
}
