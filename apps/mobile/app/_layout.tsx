import { useEffect, useState } from 'react';
import { Slot, router } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { IdentityService } from '../src/security/identity.service';
import { ConsentService } from '../src/privacy/consent.service';
import { api } from '../src/config/api';

SplashScreen.preventAutoHideAsync();

const MAX_RETRIES = 3;

interface SessionResponse {
  access_token: string;
  refresh_token: string;
}

async function fetchSessionWithRetry(deviceId: string, language: string, attempt = 1): Promise<SessionResponse> {
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

api.interceptors.response.use(
  res => res,
  async error => {
    if (error.response?.status === 401) {
      try {
        const refreshToken = await IdentityService.getRefreshToken();
        if (refreshToken) {
          const res = await api.post<SessionResponse>('/auth/refresh', { refresh_token: refreshToken });
          await IdentityService.saveAccessToken(res.data.access_token);
          await IdentityService.saveRefreshToken(res.data.refresh_token);
          error.config.headers.Authorization = 'Bearer ' + res.data.access_token;
          return api.request(error.config);
        }
      } catch {
        await IdentityService.destroySession();
      }
    }
    return Promise.reject(error);
  },
);

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);
  const [needsConsent, setNeedsConsent] = useState(false);

  useEffect(() => {
    if (isReady && needsConsent) {
    }
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
        if (!hasConsent) {
          setNeedsConsent(true);
        }
      } catch (error) {
        console.error('Falha na inicializacao segura:', error);
        setBootError('Nao foi possivel conectar ao servidor. Verifique sua conexao.');
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
        <Text style={styles.errorIcon}>warning</Text>
        <Text style={styles.errorTitle}>Erro de conexao</Text>
        <Text style={styles.errorMessage}>{bootError}</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Slot />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f8f6', padding: 32 },
  errorIcon: { fontSize: 48, marginBottom: 16 },
  errorTitle: { fontSize: 20, fontWeight: 'bold', color: '#1a1a2e', marginBottom: 8 },
  errorMessage: { fontSize: 14, color: '#666', textAlign: 'center' },
});
