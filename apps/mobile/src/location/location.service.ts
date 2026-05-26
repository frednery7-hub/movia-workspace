import * as ExpoLocation from 'expo-location';

export type LocationPermissionStatus = 'granted' | 'denied' | 'undetermined';

export interface LocationResult {
  status:    LocationPermissionStatus;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
}

export class LocationService {

  static async requestPermission(): Promise<LocationPermissionStatus> {
    const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
    return status as LocationPermissionStatus;
  }

  static async getPermissionStatus(): Promise<LocationPermissionStatus> {
    const { status } = await ExpoLocation.getForegroundPermissionsAsync();
    return status as LocationPermissionStatus;
  }

  static async getCurrentLocation(): Promise<LocationResult> {
    const status = await this.getPermissionStatus();

    if (status !== 'granted') {
      return { status };
    }

    try {
      const location = await ExpoLocation.getCurrentPositionAsync({
        accuracy: ExpoLocation.Accuracy.Balanced,
      });

      return {
        status:    'granted',
        latitude:  location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy:  location.coords.accuracy ?? undefined,
      };
    } catch {
      return { status: 'denied' };
    }
  }

  /**
   * Fallback: centro de Santiago quando localizacao negada.
   * Permite navegar sem GPS — usuario digita origem manualmente.
   */
  static getSantiagoFallback(): LocationResult {
    return {
      status:    'denied',
      latitude:  -33.4372,
      longitude: -70.6344,
      accuracy:  undefined,
    };
  }
}