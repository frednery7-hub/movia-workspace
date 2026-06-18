import {
  createAddressQueryHash,
  getSafeAddressQueryLogMeta,
  normalizeAddressQuery,
} from './address-query.util';

describe('address query utils', () => {
  it('normaliza query removendo acentos e espaços repetidos', () => {
    expect(normalizeAddressQuery('  Av. Providência   1200  ')).toBe(
      'av. providencia 1200',
    );
  });

  it('gera hash estável para query normalizada', () => {
    expect(createAddressQueryHash('av. providencia 1200')).toHaveLength(64);
    expect(createAddressQueryHash('av. providencia 1200')).toBe(
      createAddressQueryHash('av. providencia 1200'),
    );
  });

  it('não retorna endereço bruto no metadata de log', () => {
    const meta = getSafeAddressQueryLogMeta('Av. Providencia 1200');

    expect(JSON.stringify(meta)).not.toContain('Providencia');
    expect(meta).toMatchObject({
      event: 'address_search',
      queryLength: 20,
    });
    expect(meta.queryHash).toHaveLength(64);
  });
});
