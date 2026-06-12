import {
  buildActiveTripState,
  markAtTransferSent,
  markDestinationArrivalSent,
  markOneBeforeDestinationSent,
  markOneBeforeTransferSent,
  shouldNotifyAtTransfer,
  shouldNotifyDestinationArrival,
  shouldNotifyOneBeforeDestination,
  shouldNotifyOneBeforeTransfer,
  transitionTripStatus,
  type ActiveTripState,
  type RouteStation,
  type TripStatus,
} from './activeTripState';

function station(
  id: string,
  name: string,
  lineId: RouteStation['lineId'],
): RouteStation {
  return {
    id,
    name,
    lineId,
    latitude: 0,
    longitude: 0,
  };
}

const l1OnlyPath: RouteStation[] = [
  station('st_san_pablo', 'San Pablo', 'L1'),
  station('st_neptuno', 'Neptuno', 'L1'),
  station('st_pajaritos', 'Pajaritos', 'L1'),
];

const transferPath: RouteStation[] = [
  station('st_los_leones', 'Los Leones', 'L1'),
  station('st_tobalaba', 'Tobalaba', 'L1'),
  station('st_tobalaba', 'Tobalaba', 'L4'),
  station('st_cristobal_colon', 'Cristobal Colon', 'L4'),
];

function buildState(
  currentStationIndex: number | null,
  path = transferPath,
  tripStatus: TripStatus = 'active',
): ActiveTripState {
  return buildActiveTripState({
    routeId: 'route-1',
    orderedRoutePath: path,
    currentStationIndex,
    navigationMode: 'normal',
    tripStatus,
  });
}

describe('buildActiveTripState', () => {
  it('lança erro se orderedRoutePath está vazio', () => {
    expect(() => buildState(null, [])).toThrow(
      'buildActiveTripState: orderedRoutePath cannot be empty',
    );
  });

  it('deriva currentStation corretamente a partir do índice', () => {
    expect(buildState(1).currentStation).toMatchObject({
      id: 'st_tobalaba',
      lineId: 'L1',
    });
  });

  it('deriva nextStation corretamente', () => {
    expect(buildState(1).nextStation).toMatchObject({
      id: 'st_tobalaba',
      lineId: 'L4',
    });
  });

  it('deriva nextLine null quando não há baldeação futura', () => {
    expect(buildState(1, l1OnlyPath).nextLine).toBeNull();
  });

  it('deriva nextLine correto quando há baldeação à frente', () => {
    expect(buildState(0).nextLine).toBe('L4');
  });

  it('deriva nextLine null após passar pela baldeação', () => {
    expect(buildState(2).currentLine).toBe('L4');
    expect(buildState(2).nextLine).toBeNull();
  });

  it('transferPoints construídos corretamente da rota ordenada', () => {
    expect(buildState(0).transferPoints).toEqual([
      {
        index: 1,
        stationId: 'st_tobalaba',
        stationName: 'Tobalaba',
        fromLine: 'L1',
        toLine: 'L4',
        directionTerminal: 'Plaza de Puente Alto',
      },
    ]);
  });

  it('directionTerminal correto para cada linha', () => {
    expect(buildState(0).directionTerminal).toBe('Los Dominicos');
    expect(buildState(1).directionTerminal).toBe('Plaza de Puente Alto');
    expect(buildState(2).directionTerminal).toBe('Plaza de Puente Alto');
  });

  it('deriva Ruta Expresa a partir da linha e estação atuais', () => {
    const state = buildActiveTripState({
      routeId: 'route-express',
      orderedRoutePath: [
        station('st_tobalaba', 'Tobalaba', 'L4'),
        station('st_cristobal_colon', 'Cristóbal Colón', 'L4'),
      ],
      currentStationIndex: 1,
      navigationMode: 'normal',
      tripStatus: 'active',
      expressRouteDate: new Date('2026-06-15T08:00:00'),
    });

    expect(state.expressRoute).toEqual({
      type: 'green',
      availability: 'active',
    });
  });
});

describe('transitionTripStatus', () => {
  it('preview -> active permitido', () => {
    expect(transitionTripStatus({ tripStatus: 'preview' }, 'active').tripStatus).toBe('active');
  });

  it('active -> arrived permitido', () => {
    expect(transitionTripStatus({ tripStatus: 'active' }, 'arrived').tripStatus).toBe('arrived');
  });

  it('arrived -> ended permitido', () => {
    expect(transitionTripStatus({ tripStatus: 'arrived' }, 'ended').tripStatus).toBe('ended');
  });

  it('ended -> active não permitido', () => {
    expect(transitionTripStatus({ tripStatus: 'ended' }, 'active').tripStatus).toBe('ended');
  });

  it('active -> preview permitido para troca de rota', () => {
    expect(transitionTripStatus({ tripStatus: 'active' }, 'preview').tripStatus).toBe('preview');
  });
});

describe('shouldNotifyOneBeforeTransfer', () => {
  it('retorna true quando elegível', () => {
    const state = buildState(0);
    expect(shouldNotifyOneBeforeTransfer(state, state.transferPoints[0])).toBe(true);
  });

  it('retorna false se já enviado', () => {
    const state = buildState(0);
    const markedState = markOneBeforeTransferSent(state, 'st_tobalaba');
    expect(shouldNotifyOneBeforeTransfer(markedState, markedState.transferPoints[0])).toBe(false);
  });

  it('retorna false em modo preview', () => {
    const state = buildState(0, transferPath, 'preview');
    expect(shouldNotifyOneBeforeTransfer(state, state.transferPoints[0])).toBe(false);
  });
});

describe('shouldNotifyAtTransfer', () => {
  it('retorna true quando elegível', () => {
    const state = buildState(1);
    expect(shouldNotifyAtTransfer(state, state.transferPoints[0])).toBe(true);
  });

  it('retorna false se já enviado', () => {
    const state = buildState(1);
    const markedState = markAtTransferSent(state, 'st_tobalaba');
    expect(shouldNotifyAtTransfer(markedState, markedState.transferPoints[0])).toBe(false);
  });
});

describe('shouldNotifyOneBeforeDestination', () => {
  it('retorna true quando elegível', () => {
    expect(shouldNotifyOneBeforeDestination(buildState(2))).toBe(true);
  });

  it('retorna false se já enviado', () => {
    const state = markOneBeforeDestinationSent(buildState(2));
    expect(shouldNotifyOneBeforeDestination(state)).toBe(false);
  });
});

describe('shouldNotifyDestinationArrival', () => {
  it('retorna true quando elegível', () => {
    expect(shouldNotifyDestinationArrival(buildState(3))).toBe(true);
  });

  it('retorna false se já enviado', () => {
    const state = markDestinationArrivalSent(buildState(3));
    expect(shouldNotifyDestinationArrival(state)).toBe(false);
  });
});
