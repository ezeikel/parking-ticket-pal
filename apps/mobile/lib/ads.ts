import { Platform } from 'react-native';
import { TestIds } from 'react-native-google-mobile-ads';

type Sided = { ios: string; android: string };

type UnitMap = {
  banners: {
    tickets: Sided;
    settings: Sided;
    vehicles: Sided;
    'ticket-detail': Sided;
  };
  interstitial: Sided;
};

const UNITS: UnitMap = {
  banners: {
    tickets: {
      ios: 'ca-app-pub-7677365102925875/8504641161',
      android: 'ca-app-pub-7677365102925875/1346290159',
    },
    settings: {
      ios: 'ca-app-pub-7677365102925875/6999987803',
      android: 'ca-app-pub-7677365102925875/2659371826',
    },
    vehicles: {
      ios: 'ca-app-pub-7677365102925875/5814786925',
      android: 'ca-app-pub-7677365102925875/4940688951',
    },
    'ticket-detail': {
      ios: 'ca-app-pub-7677365102925875/1444408793',
      android: 'ca-app-pub-7677365102925875/2640573419',
    },
  },
  interstitial: {
    ios: 'ca-app-pub-7677365102925875/9131327129',
    android: 'ca-app-pub-7677365102925875/9033208484',
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
