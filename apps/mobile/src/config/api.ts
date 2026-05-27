import axios               from 'axios';
import { IdentityService } from '../security/identity.service';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:3000';

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