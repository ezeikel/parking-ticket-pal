import pkg from "./package.json";

export default {
  expo: {
    name: "Parking Ticket Pal",
    slug: "parking-ticket-pal",
    owner: "chewybytes",
    version: pkg.version,
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "parkingticketpal",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/images/splash.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },
    ios: {
      bundleIdentifier: "com.chewybytes.parkingticketpal",
      supportsTablet: true,
      infoPlist: {
        CFBundleURLTypes: [
          {
            CFBundleURLSchemes: [
              "com.googleusercontent.apps.1069305445287-b0q6oltds0955okb9hg2b3pqvm735di4",
            ],
          },
        ],
      }
    },
    android: {
      package: "com.chewybytes.parkingticketpal",
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
          ],
          category: ["BROWSABLE", "DEFAULT"]
        }
      ],
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/favicon.png",
    },
    plugins: [
      "expo-router",
      "expo-dev-client",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff",
        },
      ],
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
  }
}