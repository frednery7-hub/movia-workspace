import { createHash } from 'crypto';
import { Injectable } from '@nestjs/common';
import type {
  PlaceAutocompleteResult,
  PlaceDetailsResponse,
} from './types/place-search-result.type';

export const PLACES_AUTOCOMPLETE_CACHE_TTL_SECONDS = 300;
export const PLACES_DETAILS_CACHE_TTL_SECONDS = 604_800;

type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

@Injectable()
export class PlacesCacheService {
  private readonly autocompleteCache = new Map<
    string,
    CacheEntry<PlaceAutocompleteResult[]>
  >();
  private readonly detailsCache = new Map<
    string,
    CacheEntry<PlaceDetailsResponse>
  >();

  getAutocomplete(
    key: string,
    now = Date.now(),
  ): PlaceAutocompleteResult[] | null {
    return this.get(this.autocompleteCache, key, now);
  }

  setAutocomplete(
    key: string,
    results: PlaceAutocompleteResult[],
    ttlSeconds = PLACES_AUTOCOMPLETE_CACHE_TTL_SECONDS,
    now = Date.now(),
  ): void {
    this.set(this.autocompleteCache, key, results, ttlSeconds, now);
  }

  getDetails(key: string, now = Date.now()): PlaceDetailsResponse | null {
    return this.get(this.detailsCache, key, now);
  }

  setDetails(
    key: string,
    details: PlaceDetailsResponse,
    ttlSeconds = PLACES_DETAILS_CACHE_TTL_SECONDS,
    now = Date.now(),
  ): void {
    this.set(this.detailsCache, key, details, ttlSeconds, now);
  }

  clear(): void {
    this.autocompleteCache.clear();
    this.detailsCache.clear();
  }

  private get<T>(
    cache: Map<string, CacheEntry<T>>,
    key: string,
    now: number,
  ): T | null {
    const entry = cache.get(key);
    if (!entry) return null;

    if (entry.expiresAt < now) {
      cache.delete(key);
      return null;
    }

    return entry.value;
  }

  private set<T>(
    cache: Map<string, CacheEntry<T>>,
    key: string,
    value: T,
    ttlSeconds: number,
    now: number,
  ): void {
    cache.set(key, {
      expiresAt: now + ttlSeconds * 1000,
      value,
    });
  }
}

export function normalizePlaceQuery(query: string): string {
  return query
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ');
}

export function createPlacesCacheKey(parts: string[]): string {
  return createHash('sha256').update(parts.join(':')).digest('hex');
}
