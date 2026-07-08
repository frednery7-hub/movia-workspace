import NetInfo from '@react-native-community/netinfo';
import {
  getConnectivitySnapshot,
  isOnline,
  subscribeToConnectivity,
} from './connectivity';

jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(),
  addEventListener: jest.fn(),
}));

const mockFetch = jest.mocked(NetInfo.fetch);
const mockAddEventListener = jest.mocked(NetInfo.addEventListener);

function makeState(overrides: Record<string, unknown> = {}) {
  return {
    type: 'wifi',
    isConnected: true,
    isInternetReachable: true,
    details: {},
    ...overrides,
  } as never;
}

describe('connectivity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reporta online quando conectado e internet alcançável', async () => {
    mockFetch.mockResolvedValue(makeState());

    const snapshot = await getConnectivitySnapshot();

    expect(snapshot.status).toBe('online');
    expect(snapshot.isConnected).toBe(true);
    expect(snapshot.type).toBe('wifi');
  });

  it('reporta offline quando não há conexão', async () => {
    mockFetch.mockResolvedValue(
      makeState({ isConnected: false, isInternetReachable: false, type: 'none' }),
    );

    const snapshot = await getConnectivitySnapshot();

    expect(snapshot.status).toBe('offline');
    expect(snapshot.isConnected).toBe(false);
  });

  it('reporta unreachable quando conectado mas sem internet (ex: Wi-Fi de estação)', async () => {
    mockFetch.mockResolvedValue(
      makeState({ isConnected: true, isInternetReachable: false }),
    );

    const snapshot = await getConnectivitySnapshot();

    expect(snapshot.status).toBe('unreachable');
    expect(snapshot.isConnected).toBe(true);
    expect(snapshot.isInternetReachable).toBe(false);
  });

  it('trata isInternetReachable null como online (otimista, fallback cobre falha real)', async () => {
    mockFetch.mockResolvedValue(
      makeState({ isConnected: true, isInternetReachable: null }),
    );

    const snapshot = await getConnectivitySnapshot();

    expect(snapshot.status).toBe('online');
  });

  it('isOnline retorna true apenas quando status é online', async () => {
    mockFetch.mockResolvedValue(makeState());
    await expect(isOnline()).resolves.toBe(true);

    mockFetch.mockResolvedValue(
      makeState({ isConnected: true, isInternetReachable: false }),
    );
    await expect(isOnline()).resolves.toBe(false);

    mockFetch.mockResolvedValue(
      makeState({ isConnected: false, isInternetReachable: false }),
    );
    await expect(isOnline()).resolves.toBe(false);
  });

  it('subscribeToConnectivity repassa snapshots normalizados ao listener', () => {
    const listener = jest.fn();
    const unsubscribe = jest.fn();
    mockAddEventListener.mockImplementation((cb) => {
      cb(makeState({ isConnected: false, isInternetReachable: false, type: 'none' }));
      return unsubscribe;
    });

    const result = subscribeToConnectivity(listener);

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'offline', isConnected: false }),
    );
    expect(result).toBe(unsubscribe);
  });
});
