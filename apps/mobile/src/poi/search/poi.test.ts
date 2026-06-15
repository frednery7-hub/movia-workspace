import { POIS } from '../data/pois';
import { getPoisForLine } from './getPoisForLine';
import { getPoisForStation } from './getPoisForStation';
import { resolvePoiDestination } from './resolvePoiDestination';
import { searchPois } from './searchPois';

function findPoi(id: string) {
  const poi = POIS.find(result => result.id === id);
  if (!poi) throw new Error(`POI not found: ${id}`);
  return poi;
}

describe('POI offline search', () => {
  it('searchPois("costaneira") encontra Costanera Center', () => {
    expect(searchPois('costaneira')[0]?.id).toBe('costanera-center');
  });

  it('Costanera Center resolve destino Tobalaba', () => {
    const resolved = resolvePoiDestination(findPoi('costanera-center'));

    expect(resolved.routeDestinationStationName).toBe('Tobalaba');
    expect(resolved.routeDestinationStationId).toBe('tobalaba');
  });

  it('Mall Plaza Vespucio aparece para L4, L4A e L5', () => {
    expect(getPoisForLine('L4').some(poi => poi.id === 'mall-plaza-vespucio')).toBe(true);
    expect(getPoisForLine('L4A').some(poi => poi.id === 'mall-plaza-vespucio')).toBe(true);
    expect(getPoisForLine('L5').some(poi => poi.id === 'mall-plaza-vespucio')).toBe(true);
  });

  it('Parque Quinta Normal aparece em Quinta Normal', () => {
    expect(getPoisForStation('quinta-normal').some(poi => poi.id === 'parque-quinta-normal')).toBe(true);
  });

  it('Catedral aparece em Plaza de Armas', () => {
    expect(getPoisForStation('plaza-de-armas').some(poi => poi.id === 'catedral-metropolitana-santiago')).toBe(true);
  });

  it('Aeroporto SCL resolve Pajaritos como primária', () => {
    const resolved = resolvePoiDestination(findPoi('aeroporto-internacional-scl'));

    expect(resolved.routeDestinationStationName).toBe('Pajaritos');
  });

  it('getPoisForLine("L1") retorna Costanera, La Moneda, Los Dominicos e Aeroporto', () => {
    const poiIds = getPoisForLine('L1').map(poi => poi.id);

    expect(poiIds).toEqual(expect.arrayContaining([
      'costanera-center',
      'palacio-la-moneda',
      'centro-artesanal-los-dominicos',
      'aeroporto-internacional-scl',
    ]));
  });

  it('getPoisForStation("tobalaba") retorna Costanera Center', () => {
    expect(getPoisForStation('tobalaba').map(poi => poi.id)).toContain('costanera-center');
  });

  it('busca ignora acentos: bahai encontra Bahá\'í', () => {
    expect(searchPois('bahai')[0]?.id).toBe('templo-bahai-sudamerica');
  });

  it('busca ignora apóstrofo: ohiggins encontra O\'Higgins', () => {
    expect(searchPois('ohiggins')[0]?.id).toBe('parque-ohiggins');
  });
});
