import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

const DEVICE_ID_KEY = 'movia_secure_device_id';
const JWT_TOKEN_KEY = 'movia_jwt_token';

export class IdentityService {
  /**
   * 🛡️ Substitui a falha do btoa(navigator.userAgent).
   * Gera um UUID v4 criptograficamente seguro na primeira vez que o app abre
   * e o guarda na carteira blindada do sistema operacional (Keychain/Keystore).
   */
  static async getDeviceIdentifier(): Promise<string> {
    try {
      let deviceId = await SecureStore.getItemAsync(DEVICE_ID_KEY);
      
      if (!deviceId) {
        // Gera um identificador único real que não depende de hardware rastreável (MAC/IMEI)
        deviceId = Crypto.randomUUID();
        await SecureStore.setItemAsync(DEVICE_ID_KEY, deviceId);
        console.log('🔒 Novo DeviceID seguro gerado e armazenado.');
      }
      
      return deviceId;
    } catch (error) {
      console.error('❌ Erro crítico ao acessar o Secure Store:', error);
      throw new Error('Falha de integridade do dispositivo.');
    }
  }

  /**
   * 🛡️ Armazena o token de sessão com criptografia nativa.
   * O token nunca deve ficar "solto" no AsyncStorage.
   */
  static async saveSessionToken(token: string): Promise<void> {
    await SecureStore.setItemAsync(JWT_TOKEN_KEY, token);
  }

  /**
   * 🛡️ Recupera o token de sessão.
   */
  static async getSessionToken(): Promise<string | null> {
    return await SecureStore.getItemAsync(JWT_TOKEN_KEY);
  }

  /**
   * 🛡️ PANIC BUTTON / LOGOUT
   * Destrói a identidade da sessão instantaneamente.
   */
  static async destroySession(): Promise<void> {
    await SecureStore.deleteItemAsync(JWT_TOKEN_KEY);
    // Nota: Nós NÃO deletamos o DEVICE_ID_KEY para não acionar alertas de "novo dispositivo" no backend sem necessidade.
  }
}