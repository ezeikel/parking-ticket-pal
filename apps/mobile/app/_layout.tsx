import { useEffect } from 'react';
import { Slot, useNavigationContainerRef } from 'expo-router';
import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Sentry from '@sentry/react-native';
import { ErrorBoundary } from '@sentry/react-native';
import { View, Text, Button } from 'react-native';
import Providers from "@/providers";
import { PostHogNavigationTracker } from "@/components/PostHogNavigationTracker";
import { purchaseService } from '@/services/PurchaseService';
import { registerForPushNotifications, setupNotificationListeners } from '@/lib/notifications';
import "../global.css";

const navigationIntegration = Sentry.reactNavigationIntegration({
  enableTimeToInitialDisplay: Constants.executionEnvironment === ExecutionEnvironment.StoreClient,
});


const SENTRY_DSN = process.env.SENTRY_DSN || process.env.EXPO_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn: SENTRY_DSN,
  sendDefaultPii: true,
  tracesSampleRate: 1.0,
  // TODO: enable once upgraded to v7
  // enableLogs: true,
  profilesSampleRate: 1.0,
  replaysSessionSampleRate: 1.0,
  replaysOnErrorSampleRate: 1.0,
  integrations: [navigationIntegration, Sentry.mobileReplayIntegration()],
  enableNativeFramesTracking: Constants.executionEnvironment === ExecutionEnvironment.StoreClient,
});

const RootLayout = () => {
  const ref = useNavigationContainerRef();

  useEffect(() => {
    if (ref) {
      navigationIntegration.registerNavigationContainer(ref);
    }
  }, [ref]);

  useEffect(() => {
    // Initialize RevenueCat when app starts, before any providers
    purchaseService.initialize();

    // Initialize push notifications
    registerForPushNotifications();

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
      <Providers>
        <PostHogNavigationTracker />
        <Slot />
      </Providers>
    </ErrorBoundary>
  );
}

export default Sentry.wrap(RootLayout);
