import { useEffect, useState } from 'react';
import {
  ConnectivitySnapshot,
  getConnectivitySnapshot,
  subscribeToConnectivity,
} from './connectivity';

const INITIAL: ConnectivitySnapshot = {
  status: 'online',
  isConnected: true,
  isInternetReachable: null,
  type: 'unknown',
};

/**
 * useConnectivity — expõe o estado da rede e sinaliza transições.
 *
 * `justReconnected` fica true por alguns segundos após voltar de
 * offline/unreachable para online, para que a UI possa mostrar um
 * banner de reconexão e então escondê-lo.
 */
export function useConnectivity() {
  const [snapshot, setSnapshot] = useState<ConnectivitySnapshot>(INITIAL);
  const [justReconnected, setJustReconnected] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    getConnectivitySnapshot().then(initial => {
      if (!cancelled) setSnapshot(initial);
    });

    const unsubscribe = subscribeToConnectivity(next => {
      if (cancelled) return;

      setSnapshot(previous => {
        const wasOffline = previous.status !== 'online';
        const isNowOnline = next.status === 'online';

        if (wasOffline && isNowOnline) {
          setJustReconnected(true);
          if (reconnectTimer) clearTimeout(reconnectTimer);
          reconnectTimer = setTimeout(() => setJustReconnected(false), 3000);
        }

        return next;
      });
    });

    return () => {
      cancelled = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      unsubscribe();
    };
  }, []);

  return {
    ...snapshot,
    isOffline: snapshot.status !== 'online',
    justReconnected,
  };
}
