const { withAppDelegate } = require("expo/config-plugins");

/**
 * Expo config plugin that initializes Google Maps SDK on iOS.
 *
 * Injects `import GoogleMaps` and `GMSServices.provideAPIKey(...)` into
 * AppDelegate.swift so that native Google Maps views (including
 * StreetViewPanorama from react-native-streetview) work correctly.
 *
 * Usage in app.config.ts:
 *   plugins: [
 *     ["./plugins/withGoogleMapsIos", { apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY }],
 *   ]
 */
function withGoogleMapsIos(config, { apiKey }) {
  if (!apiKey) {
    console.warn("withGoogleMapsIos: apiKey not provided, skipping.");
    return config;
  }

  return withAppDelegate(config, (config) => {
    let contents = config.modResults.contents;

    // 1. Add `import GoogleMaps` if not already present
    if (!contents.includes("import GoogleMaps")) {
      contents = contents.replace(
        /^(import React\n)/m,
        `import GoogleMaps\n$1`
      );
    }

    // 2. Add GMSServices.provideAPIKey before super.application(...)
    if (!contents.includes("GMSServices.provideAPIKey")) {
      contents = contents.replace(
        /return super\.application\(application, didFinishLaunchingWithOptions: launchOptions\)/,
        `GMSServices.provideAPIKey("${apiKey}")\n\n    return super.application(application, didFinishLaunchingWithOptions: launchOptions)`
      );
    }

    config.modResults.contents = contents;
    return config;
  });
}

module.exports = withGoogleMapsIos;
