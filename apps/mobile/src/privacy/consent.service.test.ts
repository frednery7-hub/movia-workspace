import * as SecureStore from 'expo-secure-store';
import { api } from '../config/api';
import { CONSENT_VERSION, ConsentService } from './consent.service';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock('../config/api', () => ({
  api: { post: jest.fn() },
}));

const mockedSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;
const mockedApi = api as jest.Mocked<typeof api>;

describe('ConsentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedApi.post.mockResolvedValue({ data: {} });
  });

  it('invalida consentimento de uma política anterior', async () => {
    mockedSecureStore.getItemAsync.mockResolvedValue(JSON.stringify({
      version: '1.0',
      acceptedAt: '2025-01-01T00:00:00.000Z',
      locationUse: true,
      analytics: false,
    }));

    await expect(ConsentService.hasValidConsent()).resolves.toBe(false);
  });

  it('aceita somente o registro da política atual', async () => {
    mockedSecureStore.getItemAsync.mockResolvedValue(JSON.stringify({
      version: CONSENT_VERSION,
      acceptedAt: '2026-06-19T00:00:00.000Z',
      locationUse: true,
      analytics: false,
    }));

    await expect(ConsentService.hasValidConsent()).resolves.toBe(true);
  });

  it('persiste versão, data e aceite material da política', async () => {
    await ConsentService.saveConsent(true, false);

    expect(mockedSecureStore.setItemAsync).toHaveBeenCalledTimes(1);
    const stored = JSON.parse(mockedSecureStore.setItemAsync.mock.calls[0][1]);
    expect(stored).toEqual(expect.objectContaining({
      version: CONSENT_VERSION,
      locationUse: true,
      analytics: false,
    }));
    expect(typeof stored.acceptedAt).toBe('string');
  });
});
