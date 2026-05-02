const { withGradleProperties } = require("expo/config-plugins");

/**
 * Expo config plugin that sets JVM memory args in gradle.properties.
 * Needed for builds with many native deps (Skia, OpenCV, VisionCamera, worklets).
 */
function withCustomGradleProperties(config) {
  return withGradleProperties(config, (config) => {
    // Remove existing jvmargs if present
    config.modResults = config.modResults.filter(
      (item) => !(item.type === "property" && item.key === "org.gradle.jvmargs")
    );

    // Add JVM args with increased heap and metaspace
    config.modResults.push({
      type: "property",
      key: "org.gradle.jvmargs",
      value: "-Xmx4096m -XX:MaxMetaspaceSize=1024m -XX:+HeapDumpOnOutOfMemoryError -Dfile.encoding=UTF-8",
    });

    return config;
  });
}

module.exports = withCustomGradleProperties;
