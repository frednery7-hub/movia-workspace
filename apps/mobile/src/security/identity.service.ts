import * as Crypto      from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { api }          from '../config/api';

const DEVICE_ID_KEY    = 'movia_secure_device_id';
const ACCESS_TOKEN_KEY = 'movia_access_token';
const REFRESH_TOKEN_KEY = 'movia_refresh_token';
const LANGUAGE_KEY     = 'movia_language';
const DEFAULT_LANG     = 'es-CL';

let cachedLanguage: string | null = null;

const isDev = process.env.NODE_ENV !== 'production';
const log   = (...args: unknown[]) => { if (isDev) console.log(...args); };

export class IdentityService {

  static async getDeviceIdentifier(): Promise<string> {
    try {
      let deviceId = await SecureStore.getItemAsync(DEVICE_ID_KEY);
      if (!deviceId) {
        deviceId = Crypto.randomUUID();
        await SecureStore.setItemAsync(DEVICE_ID_KEY, deviceId);
        log('Novo DeviceID seguro gerado e armazenado.');
      }
      return deviceId;
    } catch (error) {
      console.error('Erro critico ao acessar o Secure Store:', error);
      throw new Error('Falha de integridade do dispositivo.');
    }
  }

  // ── Access Token ─────────────────────────────────────────────
  static async saveAccessToken(token: string): Promise<void> {
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
  }

  static async getSessionToken(): Promise<string | null> {
    return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  }

  // ── Refresh Token ─────────────────────────────────────────────
  static async saveRefreshToken(token: string): Promise<void> {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
  }

  static async getRefreshToken(): Promise<string | null> {
    return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  }

  // ── Compatibilidade retroativa ────────────────────────────────
  static async saveSessionToken(token: string): Promise<void> {
    await IdentityService.saveAccessToken(token);
  }

  static async destroySession(): Promise<void> {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  }

  // ── Idioma ───────────────────────────────────────────────────
  static async getPreferredLanguage(): Promise<string> {
    if (cachedLanguage) return cachedLanguage;
    const stored   = await SecureStore.getItemAsync(LANGUAGE_KEY);
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

  // ── Logout completo ──────────────────────────────────────────
  static async fullLogout(): Promise<void> {
    try {
      const refreshToken = await IdentityService.getRefreshToken();
      if (refreshToken) {
        await api.delete('/auth/session', {
          data: { refresh_token: refreshToken },
        });
      }
    } catch {
      // Ignora erro de rede — destroi localmente de qualquer forma
    } finally {
      await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      await SecureStore.deleteItemAsync(DEVICE_ID_KEY);
      cachedLanguage = null;
    }
  }
}