import {
  normalizeOriginLineIds,
  originLineIdsCacheKeyPart,
} from './line-id.util';

describe('normalizeOriginLineIds', () => {
  it('returns undefined for undefined/non-string input', () => {
    expect(normalizeOriginLineIds(undefined)).toBeUndefined();
    expect(normalizeOriginLineIds(123)).toBeUndefined();
  });

  it('sorts and dedupes valid line ids', () => {
    expect(normalizeOriginLineIds('L4,L1,L1,l4')).toEqual(['L1', 'L4']);
  });

  it('filters out invalid line ids', () => {
    expect(normalizeOriginLineIds('L1,L9,foo,L4A')).toEqual(['L1', 'L4A']);
  });

  it('returns undefined when nothing valid remains', () => {
    expect(normalizeOriginLineIds('foo,bar')).toBeUndefined();
  });
});

describe('originLineIdsCacheKeyPart', () => {
  it('returns "none" when empty/undefined', () => {
    expect(originLineIdsCacheKeyPart(undefined)).toBe('none');
    expect(originLineIdsCacheKeyPart([])).toBe('none');
  });

  it('joins sorted ids', () => {
    expect(originLineIdsCacheKeyPart(['L1', 'L4'])).toBe('L1,L4');
  });
});
