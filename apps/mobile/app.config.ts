import { ExpoConfig, ConfigContext } from 'expo/config';
import pkg from "./package.json";

export default ({ config }: ConfigContext): ExpoConfig => {
  const facebookAppId = process.env.EXPO_PUBLIC_FACEBOOK_APP_ID || '';
  // reverse the Google iOS Client ID (from xxx.apps.googleusercontent.com to com.googleusercontent.apps.xxx)
  const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
    ? process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID.split('.').reverse().join('.')
    : '';

  return {
    ...config,
    name: "Parking Ticket Pal",
    slug: "parking-ticket-pal",
    owner: "chewybytes",
    version: pkg.version,
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "parkingticketpal",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    ios: {
      bundleIdentifier: "com.chewybytes.parkingticketpal.app",
      supportsTablet: true,
      usesAppleSignIn: true,
      infoPlist: {
        CFBundleURLTypes: [
          {
            CFBundleURLSchemes: [
              googleIosClientId,
              `fb${facebookAppId}`,
            ],
          },
        ],
        "FacebookAppID": facebookAppId,
        "FacebookDisplayName": "Parking Ticket Pal",
        "ITSAppUsesNonExemptEncryption": false,
        "NSCameraUsageDescription": "This app uses your camera to scan parking tickets and related documents.",
        "NSPhotoLibraryUsageDescription": "This app allows you to upload existing photos of parking tickets and related documents from your library.",
        "NSUserTrackingUsageDescription": "This identifier helps us understand how you use the app to improve your experience and show relevant ads."
      },
      associatedDomains: [
        "applinks:parkingticketpal.com",
        "applinks:www.parkingticketpal.com"
      ],
      entitlements: {
        "com.apple.developer.applesignin": ["Default"],
      },
      privacyManifests: {
        NSPrivacyTracking: true,
        NSPrivacyTrackingDomains: [
          "eu.i.posthog.com",
        ],
        NSPrivacyCollectedDataTypes: [
          {
            NSPrivacyCollectedDataType: "NSPrivacyCollectedDataTypeEmailAddress",
            NSPrivacyCollectedDataTypeLinked: true,
            NSPrivacyCollectedDataTypeTracking: false,
            NSPrivacyCollectedDataTypePurposes: [
              "NSPrivacyCollectedDataTypePurposeAppFunctionality",
            ],
          },
          {
            NSPrivacyCollectedDataType: "NSPrivacyCollectedDataTypeName",
            NSPrivacyCollectedDataTypeLinked: true,
            NSPrivacyCollectedDataTypeTracking: false,
            NSPrivacyCollectedDataTypePurposes: [
              "NSPrivacyCollectedDataTypePurposeAppFunctionality",
            ],
          },
          {
            NSPrivacyCollectedDataType: "NSPrivacyCollectedDataTypeDeviceID",
            NSPrivacyCollectedDataTypeLinked: false,
            NSPrivacyCollectedDataTypeTracking: true,
            NSPrivacyCollectedDataTypePurposes: [
              "NSPrivacyCollectedDataTypePurposeAnalytics",
              "NSPrivacyCollectedDataTypePurposeThirdPartyAdvertising",
            ],
          },
          {
            NSPrivacyCollectedDataType: "NSPrivacyCollectedDataTypeCrashData",
            NSPrivacyCollectedDataTypeLinked: false,
            NSPrivacyCollectedDataTypeTracking: false,
            NSPrivacyCollectedDataTypePurposes: [
              "NSPrivacyCollectedDataTypePurposeAppFunctionality",
            ],
          },
          {
            NSPrivacyCollectedDataType: "NSPrivacyCollectedDataTypeProductInteraction",
            NSPrivacyCollectedDataTypeLinked: true,
            NSPrivacyCollectedDataTypeTracking: false,
            NSPrivacyCollectedDataTypePurposes: [
              "NSPrivacyCollectedDataTypePurposeAnalytics",
            ],
          },
          {
            NSPrivacyCollectedDataType: "NSPrivacyCollectedDataTypePurchaseHistory",
            NSPrivacyCollectedDataTypeLinked: true,
            NSPrivacyCollectedDataTypeTracking: false,
            NSPrivacyCollectedDataTypePurposes: [
              "NSPrivacyCollectedDataTypePurposeAppFunctionality",
            ],
          },
        ],
        NSPrivacyAccessedAPITypes: [
          {
            NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryFileTimestamp",
            NSPrivacyAccessedAPITypeReasons: ["C617.1", "0A2A.1", "3B52.1"],
          },
          {
            NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryUserDefaults",
            NSPrivacyAccessedAPITypeReasons: ["CA92.1", "C56D.1"],
          },
          {
            NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategorySystemBootTime",
            NSPrivacyAccessedAPITypeReasons: ["35F9.1"],
          },
          {
            NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryDiskSpace",
            NSPrivacyAccessedAPITypeReasons: ["E174.1", "85F4.1"],
          },
        ],
      },
    },
    android: {
      package: "com.chewybytes.parkingticketpal.app",
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#ffffff",
      },
      intentFilters: [
        {
          action: "VIEW",
          autoVerify: true,
          data: [
            {
              scheme: "https",
              host: "parkingticketpal.com",
              pathPrefix: "/",
            },
            {
              scheme: "https",
              host: "www.parkingticketpal.com",
              pathPrefix: "/",
            },
          ],
          category: ["BROWSABLE", "DEFAULT"]
        },
        {
          action: "VIEW",
          data: [
            {
              scheme: "parkingticketpal",
            },
          ],
          category: ["BROWSABLE", "DEFAULT"]
        }
      ],
      edgeToEdgeEnabled: true,
      config: {
        googleMaps: {
          apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
        },
      },
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/favicon.png",
    },
    plugins: [
      "expo-router",
      "expo-tracking-transparency",
    [
      'expo-splash-screen',
      {
        image: './assets/images/splash-icon.png',
        imageWidth: 400,
        resizeMode: 'contain',
        backgroundColor: '#1ABC9C',
      },
    ],
      "expo-dev-client",
      [
        "react-native-document-scanner-plugin",
        {
          "cameraPermission": "We need camera access, so you can scan documents"
        }
      ],
      "expo-secure-store",
      [
        "@sentry/react-native/expo",
        {
          "url": "https://sentry.io/",
          "project": "parking-ticket-pal-app",
          "organization": "chewybytes"
        }
      ],
      [
        "expo-image-picker",
        {
          "photosPermission": "This app allows you to upload existing photos of parking tickets and related documents from your library."
        }
      ],
      [
        "expo-build-properties",
        {
          ios: {
            useFrameworks: "static",
            deploymentTarget: "15.5.0",
          },
        },
      ],
    "expo-web-browser",
    [
      'expo-font', {
        fonts: [
          "./assets/fonts/PlusJakartaSans-Regular.ttf",
          "./assets/fonts/PlusJakartaSans-Medium.ttf",
          "./assets/fonts/PlusJakartaSans-SemiBold.ttf",
          "./assets/fonts/PlusJakartaSans-Bold.ttf",
          "./assets/fonts/PlusJakartaSans-ExtraBold.ttf",
          "./assets/fonts/PlusJakartaSans-Italic.ttf",
          "./assets/fonts/Inter18pt-Regular.ttf",
          "./assets/fonts/Inter18pt-Bold.ttf",
          "./assets/fonts/Inter18pt-Italic.ttf",
          "./assets/fonts/Lato-Regular.ttf",
          "./assets/fonts/Lato-Bold.ttf",
          "./assets/fonts/Lato-Italic.ttf",
          "./assets/fonts/UKNumberPlate.ttf"
        ],
      },
    ],
    "expo-image",
    "expo-localization",
    [
      "react-native-fbsdk-next",
      {
        appID: `${process.env.EXPO_PUBLIC_FACEBOOK_APP_ID}`,
        displayName: "Parking Ticket Pal",
        clientToken: `${process.env.EXPO_PUBLIC_FACEBOOK_CLIENT_TOKEN}`,
        scheme: "parkingticketpal",
      }
    ],
    [
      "react-native-google-mobile-ads",
      {
        androidAppId: process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID,
        iosAppId: process.env.EXPO_PUBLIC_ADMOB_IOS_APP_ID,
      }
    ]
  ],
    experiments: {
      typedRoutes: true,
    },
    updates: {
      url: "https://u.expo.dev/93b42738-f8ca-4780-b1a7-eb966c8beb4a",
    },
    runtimeVersion: {
      policy: "appVersion",
    },
    extra: {
      eas: {
        projectId: "460d1230-65d0-4a24-a805-44f84fb7c862",
      },
    },
  };
};