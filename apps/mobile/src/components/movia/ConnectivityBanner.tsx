import { Feather } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';

import { useConnectivity } from '../../network/useConnectivity';
import { t as translate, type SupportedLocale } from '../../i18n';

interface Props {
  locale: SupportedLocale;
  top: number;
}

/**
 * ConnectivityBanner — informa o usuário quando o app está offline
 * e quando a conexão volta.
 *
 * Três estados visuais:
 *   - offline:     banner âmbar, permanente enquanto sem rede
 *   - unreachable: banner âmbar, texto diferente (rede sem internet)
 *   - reconnected: banner verde, some sozinho após 3s
 *
 * Não bloqueia a interface — é informativo. O app continua utilizável
 * com dados em cache.
 */
export function ConnectivityBanner({ locale, top }: Props) {
  const { status, isOffline, justReconnected } = useConnectivity();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-8)).current;

  const visible = isOffline || justReconnected;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: visible ? 1 : 0,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: visible ? 0 : -8,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, opacity, translateY]);

  if (!visible) return null;

  const isReconnected = justReconnected && !isOffline;

  const config = isReconnected
    ? {
        backgroundColor: 'rgba(6,95,70,0.94)',
        icon: 'wifi' as const,
        text: translate('connectivity.reconnected', locale),
      }
    : status === 'unreachable'
      ? {
          backgroundColor: 'rgba(146,64,14,0.94)',
          icon: 'wifi-off' as const,
          text: translate('connectivity.unreachable', locale),
        }
      : {
          backgroundColor: 'rgba(146,64,14,0.94)',
          icon: 'wifi-off' as const,
          text: translate('connectivity.offline', locale),
        };

  return (
    <Animated.View
      style={[
        styles.banner,
        {
          top,
          backgroundColor: config.backgroundColor,
          opacity,
          transform: [{ translateY }],
        },
      ]}
      accessibilityLiveRegion="polite"
    >
      <Feather name={config.icon} size={15} color="#fff" />
      <Text style={styles.text} numberOfLines={2}>
        {config.text}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    left: 16,
    right: 16,
    minHeight: 44,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 18,
    zIndex: 18,
  },
  text: {
    flex: 1,
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
});
