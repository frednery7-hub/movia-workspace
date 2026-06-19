import * as SecureStore from 'expo-secure-store';
import { api }          from '../config/api';

const CONSENT_KEY = 'movia_privacy_consent';
export const CONSENT_VERSION = '2.0';

export interface ConsentRecord {
  version: string;
  acceptedAt: string;
  locationUse: boolean;
  analytics: boolean;
}

export class ConsentService {
  static async hasValidConsent(): Promise<boolean> {
    try {
      const raw = await SecureStore.getItemAsync(CONSENT_KEY);
      if (!raw) return false;
      const record: ConsentRecord = JSON.parse(raw) as ConsentRecord;
      return record.version === CONSENT_VERSION && record.locationUse === true;
    } catch {
      return false;
    }
  }

  static async saveConsent(locationUse: boolean, analytics: boolean): Promise<void> {
    const record: ConsentRecord = {
      version: CONSENT_VERSION,
      acceptedAt: new Date().toISOString(),
      locationUse,
      analytics,
    };
    await SecureStore.setItemAsync(CONSENT_KEY, JSON.stringify(record));

    // Sync com backend — accountability LGPD/Ley 21.719
    try {
      await api.post('/privacy/consent', { version: CONSENT_VERSION, locationUse, analytics });
    } catch {
      // Falha silenciosa — consentimento local já salvo
    }
  }

  /**
   * Recursos que dependem de tratamento ativo de dados (localização,
   * notificações, Places/Geocoding) só ficam disponíveis quando a pessoa
   * aceitou a versão MAIS RECENTE da política — não a versão anterior.
   */
  static async canUseLocation(): Promise<boolean> {
    const consent = await this.getConsent();
    return Boolean(
      consent &&
      consent.version === CONSENT_VERSION &&
      consent.locationUse,
    );
  }

  static async canUseNotifications(): Promise<boolean> {
    const consent = await this.getConsent();
    return Boolean(consent && consent.version === CONSENT_VERSION);
  }

  static async canUsePlaces(): Promise<boolean> {
    const consent = await this.getConsent();
    return Boolean(consent && consent.version === CONSENT_VERSION);
  }

  static async getConsent(): Promise<ConsentRecord | null> {
    try {
      const raw = await SecureStore.getItemAsync(CONSENT_KEY);
      return raw ? (JSON.parse(raw) as ConsentRecord) : null;
    } catch {
      return null;
    }
  }

  static async revokeConsent(): Promise<void> {
    await SecureStore.deleteItemAsync(CONSENT_KEY);

    // Sync revogação com backend
    try {
      await api.delete('/privacy/consent');
    } catch {
      // Falha silenciosa — consentimento local já revogado
    }
  }
}
