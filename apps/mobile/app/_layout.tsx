import { useEffect, useState } from 'react';
import { Slot, useNavigationContainerRef } from 'expo-router';
import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Sentry from '@sentry/react-native';
import { ErrorBoundary } from '@sentry/react-native';
import { Platform, View, Text, Button } from 'react-native';
import { Toaster } from 'sonner-native';
import { requestTrackingPermissionsAsync } from 'expo-tracking-transparency';
import Providers from "@/providers";
import { PostHogNavigationTracker } from "@/components/PostHogNavigationTracker";
import OfflineBanner from "@/components/OfflineBanner";
import { purchaseService } from '@/services/PurchaseService';
import { registerForPushNotifications, setupNotificationListeners } from '@/lib/notifications';
import "../global.css";

const navigationIntegration = Sentry.reactNavigationIntegration({
  enableTimeToInitialDisplay: Constants.executionEnvironment === ExecutionEnvironment.StoreClient,
});


const SENTRY_DSN = process.env.SENTRY_DSN || process.env.EXPO_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn: SENTRY_DSN,
  sendDefaultPii: false,
  tracesSampleRate: __DEV__ ? 1.0 : 0.2,
  profilesSampleRate: __DEV__ ? 1.0 : 0.2,
  replaysSessionSampleRate: __DEV__ ? 1.0 : 0.1,
  replaysOnErrorSampleRate: 1.0,
  integrations: [navigationIntegration, Sentry.mobileReplayIntegration()],
  enableNativeFramesTracking: Constants.executionEnvironment === ExecutionEnvironment.StoreClient,
});

const RootLayout = () => {
  const ref = useNavigationContainerRef();
  const [trackingAllowed, setTrackingAllowed] = useState(false);

  useEffect(() => {
    if (ref) {
      navigationIntegration.registerNavigationContainer(ref);
    }
  }, [ref]);

  useEffect(() => {
    (async () => {
      // Request ATT permission on iOS before initializing tracking SDKs
      if (Platform.OS === 'ios') {
        const { status } = await requestTrackingPermissionsAsync();
        setTrackingAllowed(status === 'granted');
      } else {
        // Android doesn't have ATT — tracking is allowed by default
        setTrackingAllowed(true);
      }

      // Initialize RevenueCat when app starts, before any providers
      purchaseService.initialize();

      // Initialize push notifications
      registerForPushNotifications();
    })();

    // Setup notification listeners
    const cleanupNotificationListeners = setupNotificationListeners();

    return () => {
      cleanupNotificationListeners();
    };
  }, []);

  return (
    <ErrorBoundary
      fallback={({ error, resetError }) => (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>
            Something went wrong
          </Text>
          <Text style={{ textAlign: 'center', marginBottom: 20, color: '#666' }}>
            {(error as Error)?.message || 'An unexpected error occurred'}
          </Text>
          <Button title="Try Again" onPress={resetError} />
        </View>
      )}
    >
      <Providers trackingAllowed={trackingAllowed}>
        <PostHogNavigationTracker />
        <Slot />
        <Toaster position="top-center" />
        <OfflineBanner />
      </Providers>
    </ErrorBoundary>
  );
}

export default Sentry.wrap(RootLayout);
