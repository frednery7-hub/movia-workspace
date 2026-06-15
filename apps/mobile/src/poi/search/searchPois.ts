import { POIS } from '../data/pois';
import type { PointOfInterest } from '../types';
import { normalizeSearchText } from './normalizeSearchText';

function getPoiSearchScore(poi: PointOfInterest, normalizedQuery: string): number | null {
  const normalizedName = normalizeSearchText(poi.name);
  const normalizedAliases = poi.aliases.map(normalizeSearchText);
  const normalizedStations = poi.recommendedStations.map(station =>
    normalizeSearchText(station.stationName),
  );
  const boost = poi.searchBoost ?? 0;

  if (normalizedName === normalizedQuery) return 500 + boost;
  if (normalizedAliases.some(alias => alias === normalizedQuery)) return 430 + boost;
  if (normalizedName.startsWith(normalizedQuery)) return 340 + boost;
  if (normalizedAliases.some(alias => alias.startsWith(normalizedQuery))) return 300 + boost;
  if (normalizedStations.some(station => station === normalizedQuery)) return 250 + boost;
  if (normalizedName.includes(normalizedQuery)) return 180 + boost;
  if (normalizedAliases.some(alias => alias.includes(normalizedQuery))) return 160 + boost;
  if (normalizedStations.some(station => station.includes(normalizedQuery))) return 90 + boost;

  return null;
}

export function searchPois(query: string): PointOfInterest[] {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return [];

  return POIS
    .map(poi => ({
      poi,
      score: getPoiSearchScore(poi, normalizedQuery),
    }))
    .filter((result): result is { poi: PointOfInterest; score: number } => result.score !== null)
    .sort((a, b) => b.score - a.score || a.poi.name.localeCompare(b.poi.name))
    .map(result => result.poi);
}
