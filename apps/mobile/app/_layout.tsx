import { useEffect, useState }              from 'react';
import { Slot }                              from 'expo-router';
import { View, Text, StyleSheet }           from 'react-native';
import * as SplashScreen                     from 'expo-splash-screen';
import { GestureHandlerRootView }            from 'react-native-gesture-handler';
import { IdentityService }                   from '../src/security/identity.service';
import { api }                               from '../src/config/api';

SplashScreen.preventAutoHideAsync();

const MAX_RETRIES = 3;

async function fetchSessionWithRetry(
  deviceId: string,
  language: string,
  attempt = 1,
): Promise<string> {
  try {
    const response = await api.post('/auth/session', { deviceId, language });
    return response.data.access_token as string;
  } catch (error) {
    if (attempt < MAX_RETRIES) {
      await new Promise(r => setTimeout(r, 1000 * attempt));
      return fetchSessionWithRetry(deviceId, language, attempt + 1);
    }
    throw error;
  }
}

export default function RootLayout() {
  const [isReady, setIsReady]   = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);

  useEffect(() => {
    async function boot() {
      try {
        const deviceId   = await IdentityService.getDeviceIdentifier();
        const deviceLang = await IdentityService.getPreferredLanguage();
        let token        = await IdentityService.getSessionToken();

        if (!token) {
          token = await fetchSessionWithRetry(deviceId, deviceLang);
          await IdentityService.saveSessionToken(token);
        } else {
          // Verifica se o token expirou tentando uma requisicao leve
          try {
            await api.get('/auth/me');
          } catch {
            // Token expirado — destroi e renova
            await IdentityService.destroySession();
            token = await fetchSessionWithRetry(deviceId, deviceLang);
            await IdentityService.saveSessionToken(token);
          }
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
        <Text style={styles.errorIcon}>⚠️</Text>
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
  errorContainer: {
    flex:            1,
    justifyContent:  'center',
    alignItems:      'center',
    backgroundColor: '#f8f8f6',
    padding:         32,
  },
  errorIcon: {
    fontSize:     48,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize:     20,
    fontWeight:   'bold',
    color:        '#1a1a2e',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize:  14,
    color:     '#666',
    textAlign: 'center',
  },
});