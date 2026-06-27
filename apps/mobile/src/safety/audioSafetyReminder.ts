import { CacheService } from '../config/cache.service';
import { getDeviceAudioActivityStatus } from './deviceAudioActivity';

export const AUDIO_SAFETY_REMINDER_CACHE_KEY = 'audio_safety_reminder';
const AUDIO_SAFETY_REMINDER_TTL_MS = 365 * 24 * 60 * 60 * 1000;

export type SafetyReminderState = {
  audioSafetyReminderShown: boolean;
  audioSafetyReminderShownAt?: string;
};

export function hasAudioSafetyReminderBeenShownRecently(state: SafetyReminderState | null): boolean {
  return state?.audioSafetyReminderShown === true;
}

export function shouldShowAudioSafetyReminderForState(state: SafetyReminderState | null): boolean {
  return state?.audioSafetyReminderShown !== true;
}

export async function shouldShowAudioSafetyReminder(): Promise<boolean> {
  const status = await getDeviceAudioActivityStatus();
  if (!status.isActive) return false;

  const state = await getAudioSafetyReminderState();
  return !hasAudioSafetyReminderBeenShownRecently(state);
}

export function createAudioSafetyReminderShownState(now = new Date()): SafetyReminderState {
  return {
    audioSafetyReminderShown: true,
    audioSafetyReminderShownAt: now.toISOString(),
  };
}

export async function getAudioSafetyReminderState(): Promise<SafetyReminderState | null> {
  return CacheService.get<SafetyReminderState>(AUDIO_SAFETY_REMINDER_CACHE_KEY);
}

export async function markAudioSafetyReminderShown(now = new Date()): Promise<SafetyReminderState> {
  const state = createAudioSafetyReminderShownState(now);
  await CacheService.set(AUDIO_SAFETY_REMINDER_CACHE_KEY, state, AUDIO_SAFETY_REMINDER_TTL_MS);
  return state;
}
