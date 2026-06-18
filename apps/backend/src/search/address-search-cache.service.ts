import { Injectable } from '@nestjs/common';
import type { AddressSearchResult } from './types/address-search.types';

export const ADDRESS_SEARCH_CACHE_TTL_SECONDS = 604_800;

type CacheEntry = {
  expiresAt: number;
  results: AddressSearchResult[];
};

@Injectable()
export class AddressSearchCacheService {
  private readonly cache = new Map<string, CacheEntry>();

  get(key: string, now = Date.now()): AddressSearchResult[] | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (entry.expiresAt < now) {
      this.cache.delete(key);
      return null;
    }

    return entry.results.map((result) => ({ ...result, source: 'cache' }));
  }

  set(
    key: string,
    results: AddressSearchResult[],
    ttlSeconds = ADDRESS_SEARCH_CACHE_TTL_SECONDS,
    now = Date.now(),
  ): void {
    this.cache.set(key, {
      expiresAt: now + ttlSeconds * 1000,
      results,
    });
  }

  clear(): void {
    this.cache.clear();
  }
}
