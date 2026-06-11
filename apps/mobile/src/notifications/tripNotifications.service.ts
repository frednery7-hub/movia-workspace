import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

let configured = false;
let activeTripNotificationId: string | null = null;
let activeTripRouteId: string | null = null;

export interface ActiveTripNotificationInput {
  routeId: string;
  title: string;
  body: string;
  lineColor?: string;
  tripStatus?: string;
}

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
      Notifications.setNotificationChannelAsync('active-trip', {
        name: 'Active trip',
        importance: Notifications.AndroidImportance.LOW,
        sound: undefined,
      }).catch(() => undefined);
    }

    Notifications.setNotificationCategoryAsync('active-trip', [
      {
        identifier: 'OPEN_ROUTE',
        buttonTitle: 'Abrir rota',
        options: { opensAppToForeground: true },
      },
      {
        identifier: 'END_TRIP',
        buttonTitle: 'Encerrar acompanhamento',
        options: { opensAppToForeground: true },
      },
    ]).catch(() => undefined);
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

  static async updateActiveTrip(input: ActiveTripNotificationInput): Promise<void> {
    const canNotify = await this.ensurePermission();
    if (!canNotify) return;

    if (activeTripNotificationId && activeTripRouteId === input.routeId) {
      await Notifications.dismissNotificationAsync(activeTripNotificationId).catch(() => undefined);
    }

    activeTripRouteId = input.routeId;
    activeTripNotificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: input.title,
        body: input.body,
        sound: false,
        color: input.lineColor,
        categoryIdentifier: 'active-trip',
        data: {
          routeId: input.routeId,
          tripStatus: input.tripStatus ?? 'active',
        },
      },
      trigger: null,
    });
  }

  static async endActiveTrip(routeId?: string): Promise<void> {
    if (!activeTripNotificationId) return;
    if (routeId && activeTripRouteId && activeTripRouteId !== routeId) return;

    await Notifications.dismissNotificationAsync(activeTripNotificationId).catch(() => undefined);
    activeTripNotificationId = null;
    activeTripRouteId = null;
  }
}
