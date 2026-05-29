const { withDangerousMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

/**
 * Expo config plugin that links ONLY the Google Mobile Ads SDK as a static
 * framework, instead of forcing the whole app to use_frameworks! :static.
 *
 * Why: react-native-google-mobile-ads needs its iOS pod to be a static
 * framework, which historically was achieved with expo-build-properties'
 * `ios.useFrameworks: "static"`. But under Expo SDK 56 / RN 0.85, global
 * static frameworks break header visibility for other pods that import
 * React headers (Skia's third_party/base64.h, @expo/dom-webview's RCTConvert,
 * etc.) — the app fails to compile. Chunky Crayon, on the identical SDK 56 +
 * Skia stack, builds cleanly precisely because it does NOT use global static
 * frameworks (it has no admob).
 *
 * The admob library documents `$RNGoogleMobileAdsAsStaticFramework = true` as
 * the targeted alternative: it makes only the GoogleMobileAds pod static while
 * everything else keeps the default dynamic-framework linkage. This plugin
 * injects that Ruby global at the top of the generated Podfile.
 *
 * Usage in app.config.ts:
 *   plugins: ["./plugins/withAdMobStaticFramework"]
 *
 * Pair with REMOVING `ios.useFrameworks: "static"` from expo-build-properties.
 */
const MARKER = "$RNGoogleMobileAdsAsStaticFramework";

function withAdMobStaticFramework(config) {
  return withDangerousMod(config, [
    "ios",
    (cfg) => {
      const podfilePath = path.join(
        cfg.modRequest.platformProjectRoot,
        "Podfile",
      );
      if (!fs.existsSync(podfilePath)) {
        return cfg;
      }

      let contents = fs.readFileSync(podfilePath, "utf8");
      if (contents.includes(MARKER)) {
        // Already injected (idempotent across repeated prebuilds).
        return cfg;
      }

      // Prepend the global so it's set before any target/pod is evaluated.
      // The Expo Podfile starts with `require File.join(...)` lines; placing
      // our global at the very top is safe and is what the admob docs show.
      contents = `${MARKER} = true\n\n${contents}`;
      fs.writeFileSync(podfilePath, contents);
      return cfg;
    },
  ]);
}

module.exports = withAdMobStaticFramework;
