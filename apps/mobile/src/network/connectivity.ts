import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

/**
 * connectivity — fonte única de verdade sobre o estado da rede.
 *
 * Distingue três estados:
 *   - online:      conectado e a internet realmente alcançável
 *   - offline:     sem conexão de rede
 *   - unreachable: conectado a uma rede, mas sem acesso à internet
 *                  (ex.: Wi-Fi de metrô com portal cativo, 4G sem dados)
 *
 * O terceiro caso importa muito no metrô: o celular pode estar "conectado"
 * a uma rede Wi-Fi da estação sem ter acesso real à internet.
 */

export type ConnectivityStatus = 'online' | 'offline' | 'unreachable';

export interface ConnectivitySnapshot {
  status: ConnectivityStatus;
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string;
}

function toSnapshot(state: NetInfoState): ConnectivitySnapshot {
  const isConnected = state.isConnected === true;
  const isInternetReachable = state.isInternetReachable;

  let status: ConnectivityStatus;
  if (!isConnected) {
    status = 'offline';
  } else if (isInternetReachable === false) {
    status = 'unreachable';
  } else {
    // isInternetReachable pode ser null enquanto o NetInfo ainda verifica.
    // Nesse caso, tratamos como online — otimista, mas o fallback de cada
    // requisição cobre a falha real se houver.
    status = 'online';
  }

  return {
    status,
    isConnected,
    isInternetReachable,
    type: state.type,
  };
}

export async function getConnectivitySnapshot(): Promise<ConnectivitySnapshot> {
  const state = await NetInfo.fetch();
  return toSnapshot(state);
}

export function subscribeToConnectivity(
  listener: (snapshot: ConnectivitySnapshot) => void,
): () => void {
  return NetInfo.addEventListener(state => {
    listener(toSnapshot(state));
  });
}

/** Conveniência: true apenas quando há internet real alcançável. */
export async function isOnline(): Promise<boolean> {
  const snapshot = await getConnectivitySnapshot();
  return snapshot.status === 'online';
}
