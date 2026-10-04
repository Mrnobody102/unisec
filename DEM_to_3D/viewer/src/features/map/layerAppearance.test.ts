import { describe, expect, it } from 'vitest';
import { clampOpacity, showRoad } from './layerAppearance';

describe('map presentation filters', () => {
  it('always retains the selected route and all blocked or uncertain roads', () => {
    expect(showRoad('open', false, 'affected')).toBe(false);
    expect(showRoad('open', true, 'affected')).toBe(true);
    expect(showRoad('blocked', false, 'affected')).toBe(true);
    expect(showRoad('uncertain', false, 'affected')).toBe(true);
  });
  it('keeps faded context visible and rejects non-finite input', () => {
    expect(clampOpacity(0)).toBe(0.3);
    expect(clampOpacity(2)).toBe(1);
    expect(clampOpacity(NaN)).toBe(1);
  });
});
