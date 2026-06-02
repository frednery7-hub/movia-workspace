import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX  = 'movia_cache_';
const DEFAULT_TTL   = 5 * 60 * 1000; // 5 minutos

interface CacheEntry<T> {
  data:      T;
  expiresAt: number;
}

export class CacheService {

  static async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await AsyncStorage.getItem(`${CACHE_PREFIX}${key}`);
      if (!raw) return null;

      const entry: CacheEntry<T> = JSON.parse(raw);
      if (Date.now() > entry.expiresAt) {
        await AsyncStorage.removeItem(`${CACHE_PREFIX}${key}`);
        return null;
      }

      return entry.data;
    } catch {
      return null;
    }
  }

  static async set<T>(key: string, data: T, ttlMs = DEFAULT_TTL): Promise<void> {
    try {
      const entry: CacheEntry<T> = {
        data,
        expiresAt: Date.now() + ttlMs,
      };
      await AsyncStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(entry));
    } catch {
      // Cache e best-effort — nao bloqueia o fluxo
    }
  }

  static async invalidate(key: string): Promise<void> {
    await AsyncStorage.removeItem(`${CACHE_PREFIX}${key}`);
  }
}