import { useEffect, useState } from 'react';
import { Slot, router } from 'expo-router';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { IdentityService } from '../src/security/identity.service';
import { ConsentService } from '../src/privacy/consent.service';
import { QueryProvider } from '../src/providers/QueryProvider';
import { api } from '../src/config/api';

SplashScreen.preventAutoHideAsync();

const MAX_RETRIES = 3;

interface SessionResponse {
  access_token: string;
  refresh_token: string;
}

async function fetchSessionWithRetry(
  deviceId: string,
  language: string,
  attempt = 1,
): Promise<SessionResponse> {
  try {
    const response = await api.post<SessionResponse>('/auth/session', { deviceId, language });
    return response.data;
  } catch (error) {
    if (attempt < MAX_RETRIES) {
      await new Promise(r => setTimeout(r, 1000 * attempt));
      return fetchSessionWithRetry(deviceId, language, attempt + 1);
    }
    throw error;
  }
}

// ID guardado para evitar acumulação em Fast Refresh
let _refreshInterceptorId: number | null = null;
if (_refreshInterceptorId !== null) {
  api.interceptors.response.eject(_refreshInterceptorId);
}
_refreshInterceptorId = api.interceptors.response.use(
  res => res,
  async error => {
    const config = error.config as typeof error.config & { _retry?: boolean };
    // Evita loop infinito e não retenta o próprio /auth/refresh
    if (
      error.response?.status === 401 &&
      !config._retry &&
      !config.url?.includes('/auth/refresh')
    ) {
      config._retry = true;
      try {
        const refreshToken = await IdentityService.getRefreshToken();
        if (refreshToken) {
          const res = await api.post<SessionResponse>('/auth/refresh', {
            refresh_token: refreshToken,
          });
          await IdentityService.saveAccessToken(res.data.access_token);
          await IdentityService.saveRefreshToken(res.data.refresh_token);
          config.headers = config.headers ?? {};
          config.headers.Authorization = 'Bearer ' + res.data.access_token;
          return api.request(config);
        }
      } catch {
        await IdentityService.destroySession();
      }
    }
    return Promise.reject(error);
  },
);

export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <View style={styles.errorContainer} accessibilityRole="alert">
      <Text style={styles.errorIcon}>⚠️</Text>
      <Text style={styles.errorTitle}>Algo salió mal</Text>
      <Text style={styles.errorMessage}>{error.message}</Text>
      <TouchableOpacity style={styles.retryBtn} onPress={retry}>
        <Text style={styles.retryText}>Intentar nuevamente</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);
  const [needsConsent, setNeedsConsent] = useState(false);

  useEffect(() => {
    if (isReady && needsConsent) router.replace('/consent');
  }, [isReady, needsConsent]);

  useEffect(() => {
    async function boot() {
      try {
        const deviceId = await IdentityService.getDeviceIdentifier();
        const deviceLang = await IdentityService.getPreferredLanguage();
        const accessToken = await IdentityService.getSessionToken();

        if (!accessToken) {
          const session = await fetchSessionWithRetry(deviceId, deviceLang);
          await IdentityService.saveAccessToken(session.access_token);
          await IdentityService.saveRefreshToken(session.refresh_token);
        } else {
          try {
            await api.get('/auth/me');
          } catch {
            await IdentityService.destroySession();
            const session = await fetchSessionWithRetry(deviceId, deviceLang);
            await IdentityService.saveAccessToken(session.access_token);
            await IdentityService.saveRefreshToken(session.refresh_token);
          }
        }

        const hasConsent = await ConsentService.hasValidConsent();
        if (!hasConsent) setNeedsConsent(true);
      } catch (error) {
        console.error('Falha na inicializacao segura:', error);
        setBootError('No se pudo conectar al servidor. Verifica tu conexión.');
      } finally {
        setIsReady(true);
        await SplashScreen.hideAsync();
      }
    }
    boot();
  }, []);

  if (!isReady) return null;

  if (bootError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>Error de conexión</Text>
        <Text style={styles.errorMessage}>{bootError}</Text>
      </View>
    );
  }

  return (
    <QueryProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Slot />
      </GestureHandlerRootView>
    </QueryProvider>
  );
}

const styles = StyleSheet.create({
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f8f6', padding: 32 },
  errorIcon: { fontSize: 48, marginBottom: 16 },
  errorTitle: { fontSize: 20, fontWeight: 'bold', color: '#1a1a2e', marginBottom: 8 },
  errorMessage: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 24 },
  retryBtn: { backgroundColor: '#E31837', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  retryText: { color: '#fff', fontWeight: '500', fontSize: 15 },
});
