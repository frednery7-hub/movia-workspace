import { NativeModules, Platform } from 'react-native';

export type AudioActivityStatus = {
  isActive: boolean;
  source: 'android-audio-manager' | 'unsupported';
};

type MoviaAudioActivityNativeModule = {
  getAudioActivityStatus?: () => Promise<AudioActivityStatus>;
};

const unsupportedStatus: AudioActivityStatus = {
  isActive: false,
  source: 'unsupported',
};

export async function getDeviceAudioActivityStatus(): Promise<AudioActivityStatus> {
  if (Platform.OS !== 'android') return unsupportedStatus;

  const nativeModule = NativeModules.MoviaAudioActivity as MoviaAudioActivityNativeModule | undefined;
  if (!nativeModule?.getAudioActivityStatus) return unsupportedStatus;

  try {
    const status = await nativeModule.getAudioActivityStatus();
    return {
      isActive: status.isActive === true,
      source: status.source === 'android-audio-manager' ? 'android-audio-manager' : 'unsupported',
    };
  } catch {
    return unsupportedStatus;
  }
}

export async function isDeviceAudioActive(): Promise<boolean> {
  const status = await getDeviceAudioActivityStatus();
  return status.isActive;
}
