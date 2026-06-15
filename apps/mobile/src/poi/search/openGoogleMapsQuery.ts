import { Linking, Platform } from 'react-native';

export function openGoogleMapsQuery(query: string) {
  const encodedQuery = encodeURIComponent(query);
  const nativeUrl =
    Platform.OS === 'ios'
      ? `comgooglemaps://?q=${encodedQuery}`
      : `geo:0,0?q=${encodedQuery}`;
  const webFallback =
    `https://www.google.com/maps/search/?api=1&query=${encodedQuery}`;

  Linking.canOpenURL(nativeUrl)
    .then(supported => Linking.openURL(supported ? nativeUrl : webFallback))
    .catch(() => Linking.openURL(webFallback));
}
