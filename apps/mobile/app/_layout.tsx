import { useEffect } from 'react';
import { Slot, useNavigationContainerRef } from 'expo-router';
import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Sentry from '@sentry/react-native';
import Providers from "@/providers";

const navigationIntegration = Sentry.reactNavigationIntegration({
  enableTimeToInitialDisplay: Constants.executionEnvironment === ExecutionEnvironment.StoreClient,
});

Sentry.init({
  dsn: 'https://e7a94f57d66133d60cf00d10a65df1d1@o358156.ingest.us.sentry.io/4508390020415488',
  _experiments: {
    replaysSessionSampleRate: 1.0,
    replaysOnErrorSampleRate: 1.0,
  },
  tracesSampleRate: 1.0,
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

  return (
    <Providers>
      <Slot />
    </Providers>
  );
}

export default RootLayout;
