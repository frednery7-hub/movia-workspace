import { CacheService } from '../config/cache.service';
import { getDeviceAudioActivityStatus } from './deviceAudioActivity';
import {
  createAudioSafetyReminderShownState,
  shouldShowAudioSafetyReminderForState,
  shouldShowAudioSafetyReminder,
} from './audioSafetyReminder';

jest.mock('./deviceAudioActivity', () => ({
  getDeviceAudioActivityStatus: jest.fn(),
}));

jest.mock('../config/cache.service', () => ({
  CacheService: {
    get: jest.fn(),
    set: jest.fn(),
  },
}));

const mockGetDeviceAudioActivityStatus = jest.mocked(getDeviceAudioActivityStatus);
const mockCacheGet = jest.mocked(CacheService.get);

describe('audioSafetyReminder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('mostra o lembrete por estado quando ainda nao foi exibido', () => {
    expect(shouldShowAudioSafetyReminderForState(null)).toBe(true);
    expect(shouldShowAudioSafetyReminderForState({ audioSafetyReminderShown: false })).toBe(true);
  });

  it('nao mostra o lembrete por estado quando ja foi exibido', () => {
    expect(shouldShowAudioSafetyReminderForState({
      audioSafetyReminderShown: true,
      audioSafetyReminderShownAt: '2026-06-26T12:00:00.000Z',
    })).toBe(false);
  });

  it('marca o lembrete como exibido com timestamp', () => {
    const state = createAudioSafetyReminderShownState(new Date('2026-06-26T12:00:00.000Z'));

    expect(state).toEqual({
      audioSafetyReminderShown: true,
      audioSafetyReminderShownAt: '2026-06-26T12:00:00.000Z',
    });
  });

  it('mostra o lembrete quando o Android indica audio ativo e ainda nao foi exibido', async () => {
    mockGetDeviceAudioActivityStatus.mockResolvedValue({
      isActive: true,
      source: 'android-audio-manager',
    });
    mockCacheGet.mockResolvedValue(null);

    await expect(shouldShowAudioSafetyReminder()).resolves.toBe(true);
  });

  it('nao mostra nada quando nao ha audio ativo', async () => {
    mockGetDeviceAudioActivityStatus.mockResolvedValue({
      isActive: false,
      source: 'android-audio-manager',
    });

    await expect(shouldShowAudioSafetyReminder()).resolves.toBe(false);
    expect(mockCacheGet).not.toHaveBeenCalled();
  });

  it('nao mostra o lembrete quando audio esta ativo mas ja foi deduplicado', async () => {
    mockGetDeviceAudioActivityStatus.mockResolvedValue({
      isActive: true,
      source: 'android-audio-manager',
    });
    mockCacheGet.mockResolvedValue({
      audioSafetyReminderShown: true,
      audioSafetyReminderShownAt: '2026-06-26T12:00:00.000Z',
    });

    await expect(shouldShowAudioSafetyReminder()).resolves.toBe(false);
  });
});
