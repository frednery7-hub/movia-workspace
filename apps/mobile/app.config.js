const googleMapsApiKey =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY ??
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ??
  '';

const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? '';
const allowCleartext =
  process.env.MOVIA_ALLOW_CLEARTEXT === '1' || apiUrl.startsWith('http://');

module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    usesCleartextTraffic: allowCleartext,
    adaptiveIcon: {
      ...config.android?.adaptiveIcon,
      foregroundImage: './assets/icon.png',
    },
    config: {
      ...config.android?.config,
      googleMaps: {
        ...config.android?.config?.googleMaps,
        apiKey: googleMapsApiKey,
      },
    },
  },
});
