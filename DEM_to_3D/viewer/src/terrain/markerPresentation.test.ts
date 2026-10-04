import { describe, expect, it } from 'vitest';
import { markerPresentation } from './markerPresentation';

describe('map group semantics', () => {
  const community = { symbol: 'community', selected: false };
  const landslide = { symbol: 'landslide', selected: false };
  it('only counts a single category on 2D', () => {
    expect(markerPresentation([community, community], true)).toBe('cluster');
    expect(markerPresentation([community, landslide], true)).toBe('overlap');
    expect(markerPresentation([community, community], false)).toBe('overlap');
  });
  it('retains the selected object instead of replacing it with a count', () => {
    expect(markerPresentation([landslide, { ...community, selected: true }], true)).toBe('selected-overlap');
    expect(markerPresentation([community], true)).toBe('single');
  });
});
