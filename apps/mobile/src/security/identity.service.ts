import * as Crypto      from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

const DEVICE_ID_KEY  = 'movia_secure_device_id';
const JWT_TOKEN_KEY  = 'movia_jwt_token';
const LANGUAGE_KEY   = 'movia_language';
const DEFAULT_LANG   = 'es-CL';

let cachedLanguage: string | null = null;

export class IdentityService {

  static async getDeviceIdentifier(): Promise<string> {
    try {
      let deviceId = await SecureStore.getItemAsync(DEVICE_ID_KEY);
      if (!deviceId) {
        deviceId = Crypto.randomUUID();
        await SecureStore.setItemAsync(DEVICE_ID_KEY, deviceId);
        console.log('Novo DeviceID seguro gerado e armazenado.');
      }
      return deviceId;
    } catch (error) {
      console.error('Erro critico ao acessar o Secure Store:', error);
      throw new Error('Falha de integridade do dispositivo.');
    }
  }

  static async saveSessionToken(token: string): Promise<void> {
    await SecureStore.setItemAsync(JWT_TOKEN_KEY, token);
  }

  static async getSessionToken(): Promise<string | null> {
    return await SecureStore.getItemAsync(JWT_TOKEN_KEY);
  }

  static async destroySession(): Promise<void> {
    await SecureStore.deleteItemAsync(JWT_TOKEN_KEY);
  }

  static async getPreferredLanguage(): Promise<string> {
    if (cachedLanguage) return cachedLanguage;
    const stored = await SecureStore.getItemAsync(LANGUAGE_KEY);
    cachedLanguage = stored ?? DEFAULT_LANG;
    return cachedLanguage;
  }

  static async setPreferredLanguage(lang: string): Promise<void> {
    cachedLanguage = lang;
    await SecureStore.setItemAsync(LANGUAGE_KEY, lang);
  }

  static getCachedLanguage(): string {
    return cachedLanguage ?? DEFAULT_LANG;
  }
}