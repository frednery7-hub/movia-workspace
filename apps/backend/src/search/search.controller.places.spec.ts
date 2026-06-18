import { SearchController } from './search.controller';

describe('SearchController Places', () => {
  function makeController() {
    const addressSearch = { search: jest.fn() };
    const placesAutocomplete = {
      search: jest.fn().mockResolvedValue({ results: [] }),
    };
    const placesDetails = {
      resolve: jest.fn().mockResolvedValue({ place: {}, nearestStation: null }),
    };

    return {
      controller: new SearchController(
        addressSearch as never,
        placesAutocomplete as never,
        placesDetails as never,
      ),
      placesAutocomplete,
      placesDetails,
    };
  }

  it('encaminha autocomplete com query e sessionToken', async () => {
    const { controller, placesAutocomplete } = makeController();

    await controller.searchPlacesAutocomplete({
      q: 'costanera',
      sessionToken: 'session-1',
    });

    expect(placesAutocomplete.search).toHaveBeenCalledWith(
      'costanera',
      'session-1',
    );
  });

  it('encaminha details com placeId e sessionToken', async () => {
    const { controller, placesDetails } = makeController();

    await controller.searchPlaceDetails({
      placeId: 'place-1',
      sessionToken: 'session-1',
    });

    expect(placesDetails.resolve).toHaveBeenCalledWith('place-1', 'session-1');
  });
});
