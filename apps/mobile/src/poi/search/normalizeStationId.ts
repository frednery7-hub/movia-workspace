import { normalizeSearchText } from './normalizeSearchText';

export function normalizeStationId(value: string): string {
  return normalizeSearchText(value)
    .replace(/^st[\s_-]?/, '')
    .replace(/[^a-z0-9]/g, '');
}
