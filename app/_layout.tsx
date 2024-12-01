import { Slot } from 'expo-router';
import Providers from "@/providers";
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: 'https://e7a94f57d66133d60cf00d10a65df1d1@o358156.ingest.us.sentry.io/4508390020415488',

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // enableSpotlight: __DEV__,
});

const RootLayout = () => {
  return (
    <Providers>
      <Slot />
    </Providers>
  );
}

export default RootLayout;
