import { useEffect, useState, createContext, useContext } from 'react';
import { Slot, router } from 'expo-router';
import { StatusBar, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { IdentityService } from '../src/security/identity.service';
import { LocaleProvider } from '../src/context/LocaleContext';
import type { SupportedLocale } from '../src/context/LocaleContext';
import { ConsentService } from '../src/privacy/consent.service';
import { QueryProvider } from '../src/providers/QueryProvider';
import { api } from '../src/config/api';
import { ThemeProvider, useAppTheme } from '../src/theme/ThemeContext';

SplashScreen.preventAutoHideAsync();

type Language = 'ES' | 'PT' | 'EN';
const localeMap: Record<Language, SupportedLocale> = {
  ES: 'es-CL', PT: 'pt-BR', EN: 'en-US',
};

interface LanguageContextValue {
  language: Language;
  setLanguage: (l: Language) => void;
}
export const LanguageContext = createContext<LanguageContextValue>({
  language: 'ES',
  setLanguage: () => {},
});
export function useLanguage() { return useContext(LanguageContext); }



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
const _g = globalThis as typeof globalThis & { __moviRefreshId?: number };
if (_g.__moviRefreshId !== undefined) {
  api.interceptors.response.eject(_g.__moviRefreshId);
}
_g.__moviRefreshId = api.interceptors.response.use(
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
  const theme = useAppTheme();

  return (
    <View style={[styles.errorContainer, { backgroundColor: theme.colors.background }]} accessibilityRole="alert">
      <Text style={styles.errorIcon}>⚠️</Text>
      <Text style={[styles.errorTitle, { color: theme.colors.textPrimary }]}>Algo salió mal</Text>
      <Text style={[styles.errorMessage, { color: theme.colors.textSecondary }]}>{error.message}</Text>
      <TouchableOpacity style={styles.retryBtn} onPress={retry}>
        <Text style={styles.retryText}>Intentar nuevamente</Text>
      </TouchableOpacity>
    </View>
  );
}

function RootLayoutContent() {
  const theme = useAppTheme();
  const [isReady, setIsReady] = useState(false);
  const [language, setLanguageState] = useState<Language>('ES');
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

        const savedLang = await IdentityService.getPreferredLanguage();
        if (savedLang?.toLowerCase().startsWith('pt')) setLanguageState('PT');
        else if (savedLang?.toLowerCase().startsWith('en')) setLanguageState('EN');
        else setLanguageState('ES');

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
      <View style={[styles.errorContainer, { backgroundColor: theme.colors.background }]}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={[styles.errorTitle, { color: theme.colors.textPrimary }]}>Error de conexión</Text>
        <Text style={[styles.errorMessage, { color: theme.colors.textSecondary }]}>{bootError}</Text>
      </View>
    );
  }


  function setLanguage(l: Language) {
    setLanguageState(l);
    const map: Record<Language, string> = { ES: 'es-CL', PT: 'pt-BR', EN: 'en-US' };
    IdentityService.setPreferredLanguage(map[l]);
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      <LocaleProvider locale={localeMap[language]}>
        <QueryProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <StatusBar
              barStyle={theme.isDark ? 'light-content' : 'dark-content'}
              backgroundColor={theme.colors.background}
            />
            <Slot />
          </GestureHandlerRootView>
        </QueryProvider>
      </LocaleProvider>
    </LanguageContext.Provider>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <RootLayoutContent />
    </ThemeProvider>
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
