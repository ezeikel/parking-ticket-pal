import { ExpoConfig, ConfigContext } from 'expo/config';
import pkg from "./package.json";

export default ({ config }: ConfigContext): ExpoConfig => {
  const facebookAppId = process.env.EXPO_PUBLIC_FACEBOOK_APP_ID || '';
  const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.split('.')[0] || '';

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
        "NSPhotoLibraryUsageDescription": "This app allows you to upload existing photos of parking tickets and related documents from your library."
      },
      associatedDomains: [
        "applinks:parkingticketpal.com",
        "applinks:www.parkingticketpal.com"
      ],
      entitlements: {
        "com.apple.developer.applesignin": ["Default"],
      }
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
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/favicon.png",
    },
    plugins: [
      "expo-router",
    [
      'expo-splash-screen',
      {
        image: './assets/images/splash-icon.png',
        imageWidth: 200,
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
          "photosPermission": "The app needs access to your photos to test document scanning in development."
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
          "./assets/fonts/Inter18pt-Regular.ttf",
          "./assets/fonts/Inter18pt-Bold.ttf",
          "./assets/fonts/Inter18pt-Italic.ttf",
          "./assets/fonts/Lato-Regular.ttf", 
          "./assets/fonts/Lato-Bold.ttf",
          "./assets/fonts/Lato-Italic.ttf",
          "./assets/fonts/RobotoSlab-Regular.ttf",
          "./assets/fonts/UKNumberPlate.ttf"
        ],
      },
    ],
    "expo-localization"
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