import { CacheService } from '../config/cache.service';

export const AUDIO_SAFETY_REMINDER_CACHE_KEY = 'audio_safety_reminder';
const AUDIO_SAFETY_REMINDER_TTL_MS = 365 * 24 * 60 * 60 * 1000;

export type SafetyReminderState = {
  audioSafetyReminderShown: boolean;
  audioSafetyReminderShownAt?: string;
};

export function shouldShowAudioSafetyReminder(state: SafetyReminderState | null): boolean {
  return state?.audioSafetyReminderShown !== true;
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
