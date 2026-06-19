import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

let configured = false;

export class TripNotificationService {
  static configure(): void {
    if (configured) return;
    configured = true;

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });

    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('trip-alerts', {
        name: 'Trip alerts',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
      }).catch(() => undefined);
    }
  }

  static async getPermissionStatus(): Promise<'granted' | 'denied' | 'undetermined'> {
    const { status } = await Notifications.getPermissionsAsync();
    return status as 'granted' | 'denied' | 'undetermined';
  }

  static async requestPermission(): Promise<boolean> {
    this.configure();
    const request = await Notifications.requestPermissionsAsync();
    return request.status === 'granted';
  }

  static async notifyNextStation(title: string, body: string): Promise<void> {
    this.configure();
    const canNotify = await this.getPermissionStatus() === 'granted';
    if (!canNotify) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: 'default',
      },
      trigger: null,
    });
  }

  static async endActiveTrip(routeId?: string): Promise<void> {
    void routeId;
  }
}
