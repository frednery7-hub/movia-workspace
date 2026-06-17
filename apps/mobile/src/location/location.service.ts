import * as ExpoLocation from 'expo-location';
import {
  getCachedLocation,
  isCachedLocationFresh,
  setCachedLocation,
} from './locationMemoryCache';

export type LocationPermissionStatus = 'granted' | 'denied' | 'undetermined';

export interface LocationResult {
  status:    LocationPermissionStatus;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  speedMps?: number | null;
  fromCache?: boolean;
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

  static async getCurrentLocation(options: { forceRefresh?: boolean; cacheTtlMs?: number } = {}): Promise<LocationResult> {
    const status = await this.getPermissionStatus();

    if (status !== 'granted') {
      return { status };
    }

    const cached = getCachedLocation();
    if (!options.forceRefresh && cached && isCachedLocationFresh(cached, Date.now(), options.cacheTtlMs)) {
      return {
        status:    'granted',
        latitude:  cached.latitude,
        longitude: cached.longitude,
        accuracy:  cached.accuracy ?? undefined,
        speedMps:  cached.speedMps ?? null,
        fromCache: true,
      };
    }

    try {
      const location = await ExpoLocation.getCurrentPositionAsync({
        accuracy: ExpoLocation.Accuracy.Balanced,
      });
      const result = {
        status:    'granted' as const,
        latitude:  location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy:  location.coords.accuracy ?? undefined,
        speedMps:  location.coords.speed ?? null,
      };
      setCachedLocation({
        latitude:  result.latitude,
        longitude: result.longitude,
        accuracy:  result.accuracy ?? null,
        speedMps:  result.speedMps,
        timestamp: Date.now(),
      });

      return result;
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
