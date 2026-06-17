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

  private static async ensurePermission(): Promise<boolean> {
    this.configure();

    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      const request = await Notifications.requestPermissionsAsync();
      status = request.status;
    }

    return status === 'granted';
  }

  static async notifyNextStation(title: string, body: string): Promise<void> {
    const canNotify = await this.ensurePermission();
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
