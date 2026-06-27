import {
  createAudioSafetyReminderShownState,
  shouldShowAudioSafetyReminder,
} from './audioSafetyReminder';

describe('audioSafetyReminder', () => {
  it('mostra o lembrete quando ainda nao foi exibido', () => {
    expect(shouldShowAudioSafetyReminder(null)).toBe(true);
    expect(shouldShowAudioSafetyReminder({ audioSafetyReminderShown: false })).toBe(true);
  });

  it('nao mostra o lembrete quando ja foi exibido', () => {
    expect(shouldShowAudioSafetyReminder({
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
});
