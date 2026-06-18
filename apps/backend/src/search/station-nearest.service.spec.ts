import {
  StationNearestService,
  haversineDistanceMeters,
} from './station-nearest.service';

describe('StationNearestService', () => {
  it('calcula distância Haversine em metros', () => {
    const distance = haversineDistanceMeters(
      { latitude: -33.4185, longitude: -70.6059 },
      { latitude: -33.43746, longitude: -70.63416 },
    );

    expect(distance).toBeGreaterThan(3_000);
    expect(distance).toBeLessThan(4_000);
  });

  it('calcula estação mais próxima corretamente', async () => {
    const service = new StationNearestService({
      station: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'st_tobalaba',
            name: 'Tobalaba',
            latitude: -33.4185,
            longitude: -70.6059,
            platforms: [{ lineId: 'L1' }, { lineId: 'L4' }],
          },
          {
            id: 'st_baquedano',
            name: 'Baquedano',
            latitude: -33.43746,
            longitude: -70.63416,
            platforms: [{ lineId: 'L1' }, { lineId: 'L5' }],
          },
        ]),
      },
    } as never);

    await expect(
      service.findNearestStation({
        latitude: -33.419,
        longitude: -70.606,
      }),
    ).resolves.toMatchObject({
      id: 'st_tobalaba',
      name: 'Tobalaba',
      lineIds: ['L1', 'L4'],
    });
  });
});
