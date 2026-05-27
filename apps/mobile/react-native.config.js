/**
 * react-native autolinking config.
 *
 * For development builds (EXPO_PUBLIC_ENVIRONMENT=development or unset), we
 * disable iOS autolinking for @react-native-ml-kit/text-recognition. Reason:
 * GoogleMLKit (the underlying iOS pod) ships only iOS-device and
 * iOS-x86_64-simulator slices — no arm64-simulator slice — which makes the
 * whole app unbuildable for Apple-Silicon iOS simulators (iOS 26+).
 *
 * The npm package stays installed so JS resolves the module; the hook in
 * useLiveTicketOCR.ts try/catches the native call and falls back to a __DEV__
 * mock when the native side isn't there. On preview/production/beta builds
 * (built via EAS for real devices) autolinking is left alone and real OCR
 * runs natively.
 */
const isDev =
  (process.env.EXPO_PUBLIC_ENVIRONMENT || "development") === "development";

module.exports = {
  dependencies: isDev
    ? {
        "@react-native-ml-kit/text-recognition": {
          platforms: {
            ios: null,
          },
        },
      }
    : {},
};
