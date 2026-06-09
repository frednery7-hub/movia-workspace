const {
  withAndroidManifest,
  withAppBuildGradle,
} = require("@expo/config-plugins");

const googleMapsApiKeyPlaceholder = "${GOOGLE_MAPS_ANDROID_API_KEY}";

const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? "";
const allowCleartext =
  process.env.MOVIA_ALLOW_CLEARTEXT === "1" || apiUrl.startsWith("http://");

const withGoogleMapsManifestPlaceholder = (config) => {
  config = withAndroidManifest(config, (modConfig) => {
    const application = modConfig.modResults.manifest.application?.[0];
    if (!application) {
      return modConfig;
    }

    const metaData = application["meta-data"] ?? [];
    const googleMapsMetaData = metaData.find(
      (item) => item.$?.["android:name"] === "com.google.android.geo.API_KEY",
    );

    if (googleMapsMetaData) {
      googleMapsMetaData.$["android:value"] = googleMapsApiKeyPlaceholder;
    } else {
      metaData.push({
        $: {
          "android:name": "com.google.android.geo.API_KEY",
          "android:value": googleMapsApiKeyPlaceholder,
        },
      });
      application["meta-data"] = metaData;
    }

    return modConfig;
  });

  return withAppBuildGradle(config, (modConfig) => {
    const placeholderLine =
      '        manifestPlaceholders["GOOGLE_MAPS_ANDROID_API_KEY"] = System.getenv("EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY") ?: System.getenv("EXPO_PUBLIC_GOOGLE_MAPS_API_KEY") ?: ""';

    if (!modConfig.modResults.contents.includes(placeholderLine)) {
      modConfig.modResults.contents = modConfig.modResults.contents.replace(
        /(\n\s+versionName ["'][^"']+["'])/,
        `$1\n${placeholderLine}`,
      );
    }

    return modConfig;
  });
};

module.exports = ({ config }) =>
  withGoogleMapsManifestPlaceholder({
    ...config,
    android: {
      ...config.android,
      usesCleartextTraffic: allowCleartext,
      adaptiveIcon: {
        ...config.android?.adaptiveIcon,
        foregroundImage: "./assets/adaptive-icon.png",
      },
      config: {
        ...config.android?.config,
        googleMaps: {
          ...config.android?.config?.googleMaps,
          apiKey: googleMapsApiKeyPlaceholder,
        },
      },
    },
  });
