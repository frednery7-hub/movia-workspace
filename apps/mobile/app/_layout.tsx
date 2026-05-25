import { useEffect, useState }             from 'react';
import { Slot }                             from 'expo-router';
import * as SplashScreen                    from 'expo-splash-screen';
import { GestureHandlerRootView }           from 'react-native-gesture-handler';
import { IdentityService }                  from '../src/security/identity.service';
import { api }                              from '../src/config/api';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function boot() {
      try {
        const deviceId = await IdentityService.getDeviceIdentifier();
        let token      = await IdentityService.getSessionToken();

        if (!token) {
          console.log('Iniciando handshake com o servidor...');
          const response = await api.post('/auth/session', { deviceId });
          token = response.data.access_token;
          await IdentityService.saveSessionToken(token!);
          console.log('Passaporte JWT adquirido com sucesso.');
        } else {
          console.log('Sessao JWT restaurada.');
        }
      } catch (error) {
        console.error('Falha na inicializacao segura:', error);
      } finally {
        setIsReady(true);
        await SplashScreen.hideAsync();
      }
    }

    boot();
  }, []);

  if (!isReady) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Slot />
    </GestureHandlerRootView>
  );
}