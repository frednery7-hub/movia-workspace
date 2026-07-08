const {
  withAndroidManifest,
  withAppBuildGradle,
  withDangerousMod,
  withMainApplication,
} = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const googleMapsApiKeyPlaceholder = "${GOOGLE_MAPS_ANDROID_API_KEY}";
const androidPackagePath = ["app", "movia", "mobile"];
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

const audioActivityModuleSource = `package app.movia.mobile

import android.content.Context
import android.media.AudioManager
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class AudioActivityModule(
  reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {
  override fun getName(): String = "MoviaAudioActivity"

  @ReactMethod
  fun getAudioActivityStatus(promise: Promise) {
    val audioManager = reactApplicationContext.getSystemService(Context.AUDIO_SERVICE) as? AudioManager
    val status = Arguments.createMap()

    if (audioManager == null) {
      status.putBoolean("isActive", false)
      status.putString("source", "unsupported")
      promise.resolve(status)
      return
    }

    status.putBoolean("isActive", audioManager.isMusicActive)
    status.putString("source", "android-audio-manager")
    promise.resolve(status)
  }
}
`;

const audioActivityPackageSource = `package app.movia.mobile

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class AudioActivityPackage : ReactPackage {
  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
    return listOf(AudioActivityModule(reactContext))
  }

  override fun createViewManagers(
    reactContext: ReactApplicationContext,
  ): List<ViewManager<*, *>> {
    return emptyList()
  }
}
`;

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

    // Injeta configuração de assinatura de release
    if (!modConfig.modResults.contents.includes("MOVIA_UPLOAD_STORE_FILE")) {
      const releaseSnippet = [
        '        release {',
        "            def storeFilePath = project.hasProperty('MOVIA_UPLOAD_STORE_FILE') ? project.property('MOVIA_UPLOAD_STORE_FILE') : System.getenv('MOVIA_UPLOAD_STORE_FILE')",
        '            if (storeFilePath) {',
        '                storeFile file(storeFilePath)',
        "                storePassword project.hasProperty('MOVIA_UPLOAD_STORE_PASSWORD') ? project.property('MOVIA_UPLOAD_STORE_PASSWORD') : System.getenv('MOVIA_UPLOAD_STORE_PASSWORD')",
        "                keyAlias project.hasProperty('MOVIA_UPLOAD_KEY_ALIAS') ? project.property('MOVIA_UPLOAD_KEY_ALIAS') : System.getenv('MOVIA_UPLOAD_KEY_ALIAS')",
        "                keyPassword project.hasProperty('MOVIA_UPLOAD_KEY_PASSWORD') ? project.property('MOVIA_UPLOAD_KEY_PASSWORD') : System.getenv('MOVIA_UPLOAD_KEY_PASSWORD')",
        '            }',
        '        }',
        ''
      ].join('\n');
      let c = modConfig.modResults.contents;
      c = c.replace(
        /(signingConfigs\s*\{[\s\S]*?keyPassword\s+'android'\s*\}\s*)(\})/,
        '$1' + releaseSnippet + '$2'
      );
      c = c.replace(
        /(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?signingConfig\s+signingConfigs\.)debug/,
        '$1release'
      );
      modConfig.modResults.contents = c;
    }

    return modConfig;
  });
};

const withAudioActivityModule = (config) => {
  config = withDangerousMod(config, [
    "android",
    (modConfig) => {
      const packageDir = path.join(
        modConfig.modRequest.platformProjectRoot,
        "app",
        "src",
        "main",
        "java",
        ...androidPackagePath,
      );
      fs.mkdirSync(packageDir, { recursive: true });
      fs.writeFileSync(path.join(packageDir, "AudioActivityModule.kt"), audioActivityModuleSource);
      fs.writeFileSync(path.join(packageDir, "AudioActivityPackage.kt"), audioActivityPackageSource);
      return modConfig;
    },
  ]);

  return withMainApplication(config, (modConfig) => {
    let contents = modConfig.modResults.contents;
    if (!contents.includes("AudioActivityPackage()")) {
      contents = contents.replace(
        "            // packages.add(new MyReactNativePackage());",
        "            // packages.add(new MyReactNativePackage());\n            packages.add(AudioActivityPackage())",
      );
    }
    modConfig.modResults.contents = contents;
    return modConfig;
  });
};

module.exports = ({ config }) =>
  withAudioActivityModule(withGoogleMapsManifestPlaceholder({
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
  }));
