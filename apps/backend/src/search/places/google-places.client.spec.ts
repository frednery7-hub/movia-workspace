import { GooglePlacesClient } from './google-places.client';

function makeClient(options: Record<string, string | undefined> = {}) {
  const config = {
    get: jest.fn((key: string) => {
      const values: Record<string, string | undefined> = {
        GOOGLE_PLACES_API_KEY: 'places-key',
        PLACES_COUNTRY_CODE: 'CL',
        PLACES_LOCATION_BIAS_LAT: '-33.4489',
        PLACES_LOCATION_BIAS_LNG: '-70.6693',
        PLACES_LOCATION_BIAS_RADIUS_METERS: '35000',
        ...options,
      };
      return values[key];
    }),
  };

  return new GooglePlacesClient(config as never);
}

describe('GooglePlacesClient', () => {
  const originalFetch = global.fetch;
  let fetchMock: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    jest.useFakeTimers();
    fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>;
    global.fetch = fetchMock;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('normaliza autocomplete usando Places API New sem expor chave', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({
        suggestions: [
          {
            placePrediction: {
              placeId: 'place-1',
              text: { text: 'Costanera Center, Providencia' },
              structuredFormat: {
                mainText: { text: 'Costanera Center' },
                secondaryText: { text: 'Av. Andres Bello 2425' },
              },
              types: ['shopping_mall', 'point_of_interest'],
            },
          },
        ],
      }),
    });

    await expect(
      makeClient().autocomplete('costanera', 'session-1'),
    ).resolves.toEqual([
      {
        id: 'google_places:place-1',
        placeId: 'place-1',
        primaryText: 'Costanera Center',
        secondaryText: 'Av. Andres Bello 2425',
        types: ['shopping_mall', 'point_of_interest'],
        matchedSubstrings: [],
        source: 'google_places',
      },
    ]);

    const [, request] = fetchMock.mock.calls[0] as [
      string,
      RequestInit & { body: string; headers: Record<string, string> },
    ];
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      'https://places.googleapis.com/v1/places:autocomplete',
    );
    expect(request.method).toBe('POST');
    expect(request.headers['X-Goog-Api-Key']).toBe('places-key');
    expect(request.headers['X-Goog-FieldMask']).toContain(
      'suggestions.placePrediction.placeId',
    );
    const body = JSON.parse(request.body) as Record<string, unknown>;
    expect(body).toEqual(
      expect.objectContaining({
        input: 'costanera',
        includedRegionCodes: ['cl'],
        sessionToken: 'session-1',
      }),
    );
  });

  it('normaliza details com field mask mínimo', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({
        id: 'place-1',
        displayName: { text: 'Costanera Center' },
        formattedAddress: 'Av. Andres Bello 2425',
        location: { latitude: -33.4172, longitude: -70.6065 },
        types: ['shopping_mall'],
      }),
    });

    await expect(
      makeClient().getDetails('place-1', 'session-1'),
    ).resolves.toEqual({
      placeId: 'place-1',
      name: 'Costanera Center',
      formattedAddress: 'Av. Andres Bello 2425',
      latitude: -33.4172,
      longitude: -70.6065,
      types: ['shopping_mall'],
    });

    const [url, request] = fetchMock.mock.calls[0] as [
      URL,
      { headers: Record<string, string> },
    ];
    expect(url.toString()).toContain(
      'https://places.googleapis.com/v1/places/place-1',
    );
    expect(url.searchParams.get('sessionToken')).toBe('session-1');
    expect(request.headers['X-Goog-FieldMask']).toBe(
      'id,displayName,formattedAddress,location,types',
    );
  });

  it('retorna vazio/null quando a API externa falha', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500 });
    const client = makeClient();

    await expect(client.autocomplete('costanera')).resolves.toEqual([]);
    await expect(client.getDetails('place-1')).resolves.toBeNull();
  });
});
