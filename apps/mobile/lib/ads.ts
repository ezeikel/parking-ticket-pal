import { Platform } from 'react-native';
import { TestIds } from 'react-native-google-mobile-ads';

type Sided = { ios: string; android: string };

type UnitMap = {
  banners: {
    tickets: Sided;
    settings: Sided;
    'ticket-detail': Sided;
  };
  interstitial: Sided;
};

// TODO: Replace these with your actual AdMob ad unit IDs from Google AdMob Console
const UNITS: UnitMap = {
  banners: {
    tickets: {
      ios: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX', // TODO: Add your iOS banner ad unit ID for tickets screen
      android: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX', // TODO: Add your Android banner ad unit ID for tickets screen
    },
    settings: {
      ios: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX', // TODO: Add your iOS banner ad unit ID for settings screen
      android: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX', // TODO: Add your Android banner ad unit ID for settings screen
    },
    'ticket-detail': {
      ios: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX', // TODO: Add your iOS banner ad unit ID for ticket detail screen
      android: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX', // TODO: Add your Android banner ad unit ID for ticket detail screen
    },
  },
  interstitial: {
    ios: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX', // TODO: Add your iOS interstitial ad unit ID
    android: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX', // TODO: Add your Android interstitial ad unit ID
  },
};

// Helper function - uses test IDs in dev mode for testing
const pick = (prodId: string, testId: string) => (__DEV__ ? testId : prodId);

export const bannerUnitId = (placement: keyof UnitMap['banners']) =>
  Platform.select({
    ios: pick(UNITS.banners[placement].ios, TestIds.BANNER),
    android: pick(UNITS.banners[placement].android, TestIds.BANNER),
  }) ?? TestIds.BANNER;

export const interstitialUnitId =
  Platform.select({
    ios: pick(UNITS.interstitial.ios, TestIds.INTERSTITIAL),
    android: pick(UNITS.interstitial.android, TestIds.INTERSTITIAL),
  }) ?? TestIds.INTERSTITIAL;
