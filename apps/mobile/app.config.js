const {
  withAndroidManifest,
  withAppBuildGradle,
} = require("@expo/config-plugins");

const googleMapsApiKeyPlaceholder = "${GOOGLE_MAPS_ANDROID_API_KEY}";
const googleMapsGradleSnippet = `def readDotEnvValue = { String key ->
    def candidates = [
        file("../.env"),
        file("../../.env")
    ]
    for (envFile in candidates) {
        if (!envFile.exists()) continue

        def match = envFile.readLines().find { line ->
            def trimmed = line.trim()
            trimmed && !trimmed.startsWith("#") && trimmed.startsWith("\${key}=")
        }
        if (match) {
            return match.substring(match.indexOf("=") + 1).trim().replaceAll(/^["']|["']$/, "")
        }
    }
    return ""
}

def googleMapsAndroidApiKey =
    System.getenv("EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY")
        ?: System.getenv("EXPO_PUBLIC_GOOGLE_MAPS_API_KEY")
        ?: readDotEnvValue("EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY")
        ?: readDotEnvValue("EXPO_PUBLIC_GOOGLE_MAPS_API_KEY")
        ?: ""`;

const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? "";
const isProductionBuild =
  process.env.NODE_ENV === "production" ||
  process.env.EAS_BUILD_PROFILE === "production" ||
  process.env.MOVIA_RELEASE_BUILD === "1";
const allowCleartext =
  !isProductionBuild &&
  (process.env.MOVIA_ALLOW_CLEARTEXT === "1" || apiUrl.startsWith("http://"));

if (isProductionBuild && apiUrl.startsWith("http://")) {
  throw new Error("FATAL: EXPO_PUBLIC_API_URL deve usar HTTPS em build de producao.");
}

if (isProductionBuild && process.env.MOVIA_ALLOW_CLEARTEXT === "1") {
  throw new Error("FATAL: MOVIA_ALLOW_CLEARTEXT nao pode ser usado em build de producao.");
}

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
      '        manifestPlaceholders["GOOGLE_MAPS_ANDROID_API_KEY"] = googleMapsAndroidApiKey';
    const legacyPlaceholderLine =
      '        manifestPlaceholders["GOOGLE_MAPS_ANDROID_API_KEY"] = System.getenv("EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY") ?: System.getenv("EXPO_PUBLIC_GOOGLE_MAPS_API_KEY") ?: ""';
    let contents = modConfig.modResults.contents;

    if (!contents.includes("def readDotEnvValue = { String key ->")) {
      contents = contents.replace(
        /(def jscFlavor = ['"]org\.webkit:android-jsc:\+['"])/,
        `$1\n\n${googleMapsGradleSnippet}`,
      );
    }

    if (contents.includes(legacyPlaceholderLine)) {
      contents = contents.replace(legacyPlaceholderLine, placeholderLine);
    } else if (!contents.includes(placeholderLine)) {
      contents = contents.replace(
        /(\n\s+versionName ["'][^"']+["'])/,
        `$1\n${placeholderLine}`,
      );
    }

    modConfig.modResults.contents = contents;
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
