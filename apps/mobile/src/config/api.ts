import axios               from 'axios';
import { IdentityService } from '../security/identity.service';
import { emitSessionExpired } from '../events/sessionEvents';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:3000';
export const REGION   = process.env.EXPO_PUBLIC_REGION ?? 'CL';
export const TIMEZONE = REGION === 'BR' ? 'America/Sao_Paulo' : 'America/Santiago';
export const CURRENCY = REGION === 'BR' ? 'BRL' : 'CLP';

if (process.env.NODE_ENV === 'production' && !API_URL.startsWith('https://')) {
  throw new Error('FATAL: EXPO_PUBLIC_API_URL deve usar HTTPS em producao.');
}

export const api = axios.create({
  baseURL: `${API_URL}/v1`,
  timeout: 10_000,
});

api.interceptors.request.use(async (config) => {
  const token = await IdentityService.getSessionToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const lang = IdentityService.getCachedLanguage();
  if (lang && config.headers) {
    config.headers['Accept-Language'] = lang;
  }

  return config;
});

/**
 * Interceptor de resposta — trata 401 automaticamente.
 *
 * Fluxo:
 *   1. Requisição falha com 401 (token expirado ou invalidado).
 *   2. Tenta renovar usando o refresh_token armazenado localmente.
 *   3. Se renovação bem-sucedida: salva novos tokens e reexecuta a
 *      requisição original com o novo access_token.
 *   4. Se renovação falhar: destrói sessão local e emite evento global
 *      para que o app redirecione o usuário automaticamente.
 *
 * Proteção contra loop infinito: a chamada de refresh usa axios direto,
 * não a instância `api`, então não passa por este interceptor.
 */
let isRefreshing = false;
let pendingQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function processPendingQueue(error: unknown, token: string | null) {
  pendingQueue.forEach(({ resolve, reject }) => {
    if (error || !token) {
      reject(error);
    } else {
      resolve(token);
    }
  });
  pendingQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error: import('axios').AxiosError) => {
    const originalRequest = error.config as import('axios').InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingQueue.push({ resolve, reject });
      }).then((token) => {
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${token}`;
        }
        return api(originalRequest);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const refreshToken = await IdentityService.getRefreshToken();
      if (!refreshToken) throw new Error('NO_REFRESH_TOKEN');

      const { data } = await axios.post<{ access_token: string; refresh_token: string }>(
        `${API_URL}/v1/auth/refresh`,
        { refresh_token: refreshToken },
        { timeout: 10_000 },
      );

      await IdentityService.saveAccessToken(data.access_token);
      await IdentityService.saveRefreshToken(data.refresh_token);

      processPendingQueue(null, data.access_token);

      if (originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
      }
      return api(originalRequest);
    } catch (refreshError) {
      processPendingQueue(refreshError, null);
      await IdentityService.destroySession();
      emitSessionExpired();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);
