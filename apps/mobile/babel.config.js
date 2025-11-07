/** @type {import("@babel/core").ConfigFunction} */
module.exports = (api) => {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    plugins: [
      // Required for react-native-vision-camera frame processors
      ['react-native-worklets-core/plugin'],
      // Required for react-native-reanimated v4 - must be last
      ['react-native-reanimated/plugin'],
    ],
  };
};
