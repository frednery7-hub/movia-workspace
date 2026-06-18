const VALID_LINE_ID_PATTERN = /^(L[1-3]|L4A?|L5|L6)$/;

export function normalizeOriginLineIds(raw: unknown): string[] | undefined {
  if (typeof raw !== 'string') return undefined;

  const candidates = raw
    .split(',')
    .map((item) => item.trim().toUpperCase())
    .filter((item) => VALID_LINE_ID_PATTERN.test(item));

  const unique = [...new Set(candidates)].sort();
  return unique.length > 0 ? unique : undefined;
}

export function originLineIdsCacheKeyPart(originLineIds?: string[]): string {
  return originLineIds && originLineIds.length > 0
    ? originLineIds.join(',')
    : 'none';
}
