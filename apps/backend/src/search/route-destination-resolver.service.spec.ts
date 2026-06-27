import { NotFoundException } from '@nestjs/common';
import { RouteDestinationResolver } from './route-destination-resolver.service';

describe('RouteDestinationResolver', () => {
  const prisma = {
    station: {
      findUnique: jest.fn(),
    },
  };
  const geocoding = {
    searchAddress: jest.fn(),
  };
  const places = {
    getDetails: jest.fn(),
  };
  const nearestStation = {
    findNearestStation: jest.fn(),
  };

  function buildResolver() {
    return new RouteDestinationResolver(
      prisma as never,
      geocoding as never,
      places as never,
      nearestStation as never,
    );
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('normaliza destination type station sem geocodificar', async () => {
    prisma.station.findUnique.mockResolvedValue({
      id: 'st_tobalaba',
      name: 'Tobalaba',
      platforms: [{ lineId: 'L1' }, { lineId: 'L4' }],
    });

    await expect(
      buildResolver().resolve({ type: 'station', stationId: 'st_tobalaba' }),
    ).resolves.toEqual({
      requestedDestination: {
        type: 'station',
        label: 'Tobalaba',
      },
      routeDestinationStation: {
        id: 'st_tobalaba',
        name: 'Tobalaba',
        lineIds: ['L1', 'L4'],
        distanceMeters: 0,
      },
    });
    expect(geocoding.searchAddress).not.toHaveBeenCalled();
  });

  it('normaliza destination type address para estação mais próxima', async () => {
    geocoding.searchAddress.mockResolvedValue([
      {
        label: 'Apoquindo 4501',
        formattedAddress: 'Av. Apoquindo 4501, Las Condes',
        latitude: -33.414,
        longitude: -70.582,
      },
    ]);
    nearestStation.findNearestStation.mockResolvedValue({
      id: 'st_escuela_militar',
      name: 'Escuela Militar',
      lineIds: ['L1'],
      distanceMeters: 70,
    });

    await expect(
      buildResolver().resolve({ type: 'address', query: 'Apoquindo 4501' }),
    ).resolves.toMatchObject({
      requestedDestination: {
        type: 'address',
        label: 'Apoquindo 4501',
        formattedAddress: 'Av. Apoquindo 4501, Las Condes',
      },
      routeDestinationStation: {
        id: 'st_escuela_militar',
        name: 'Escuela Militar',
      },
    });
  });

  it('normaliza destination type place para estação mais próxima', async () => {
    places.getDetails.mockResolvedValue({
      placeId: 'place-1',
      name: 'Costanera Center',
      formattedAddress: 'Costanera Center, Providencia',
      latitude: -33.4167,
      longitude: -70.6067,
      types: ['shopping_mall'],
    });
    nearestStation.findNearestStation.mockResolvedValue({
      id: 'st_tobalaba',
      name: 'Tobalaba',
      lineIds: ['L1', 'L4'],
      distanceMeters: 250,
    });

    await expect(
      buildResolver().resolve({ type: 'place', placeId: 'place-1' }),
    ).resolves.toMatchObject({
      requestedDestination: {
        type: 'place',
        label: 'Costanera Center',
        placeId: 'place-1',
      },
      routeDestinationStation: {
        id: 'st_tobalaba',
        name: 'Tobalaba',
      },
    });
  });

  it('normaliza destination type coordinates para estação mais próxima', async () => {
    nearestStation.findNearestStation.mockResolvedValue({
      id: 'st_cerro_blanco',
      name: 'Cerro Blanco',
      lineIds: ['L2'],
      distanceMeters: 310,
    });

    await expect(
      buildResolver().resolve({
        type: 'coordinates',
        latitude: -33.42,
        longitude: -70.64,
        label: 'Cerro San Cristobal',
      }),
    ).resolves.toMatchObject({
      requestedDestination: {
        type: 'coordinates',
        label: 'Cerro San Cristobal',
      },
      routeDestinationStation: {
        id: 'st_cerro_blanco',
      },
    });
  });

  it('lança quando endereço não tem candidato para resolver estação', async () => {
    geocoding.searchAddress.mockResolvedValue([]);

    await expect(
      buildResolver().resolve({ type: 'address', query: 'sem resultado' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
