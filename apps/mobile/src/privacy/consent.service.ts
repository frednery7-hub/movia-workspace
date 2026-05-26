import * as SecureStore from 'expo-secure-store';

const CONSENT_KEY         = 'movia_privacy_consent';
const CONSENT_VERSION     = '1.0';

export interface ConsentRecord {
  version:      string;
  acceptedAt:   string;
  locationUse:  boolean;
  analytics:    boolean;
}

export class ConsentService {

  static async hasValidConsent(): Promise<boolean> {
    try {
      const raw = await SecureStore.getItemAsync(CONSENT_KEY);
      if (!raw) return false;
      const record: ConsentRecord = JSON.parse(raw);
      return record.version === CONSENT_VERSION && record.locationUse === true;
    } catch {
      return false;
    }
  }

  static async saveConsent(locationUse: boolean, analytics: boolean): Promise<void> {
    const record: ConsentRecord = {
      version:    CONSENT_VERSION,
      acceptedAt: new Date().toISOString(),
      locationUse,
      analytics,
    };
    await SecureStore.setItemAsync(CONSENT_KEY, JSON.stringify(record));
  }

  static async getConsent(): Promise<ConsentRecord | null> {
    try {
      const raw = await SecureStore.getItemAsync(CONSENT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  static async revokeConsent(): Promise<void> {
    await SecureStore.deleteItemAsync(CONSENT_KEY);
  }
}