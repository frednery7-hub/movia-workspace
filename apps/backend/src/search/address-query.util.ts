import { createHash } from 'crypto';

export function normalizeAddressQuery(query: string): string {
  return query
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ');
}

export function createAddressQueryHash(normalizedQuery: string): string {
  return createHash('sha256').update(normalizedQuery).digest('hex');
}

export function getSafeAddressQueryLogMeta(query: string) {
  const normalizedQuery = normalizeAddressQuery(query);
  return {
    event: 'address_search',
    queryHash: createAddressQueryHash(normalizedQuery),
    queryLength: query.length,
  };
}
