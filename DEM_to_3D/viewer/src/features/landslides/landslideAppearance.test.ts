import { describe, expect, it } from 'vitest';
import { landslideAreaStyle } from './landslideAreas';
import { defaultLandslideFillOpacity, landslideFillOpacity } from './landslideAppearance';

describe('landslide fill appearance', () => {
  it('allows transparent fill and clamps invalid preferences', () => {
    expect(landslideFillOpacity(0)).toBe(0);
    expect(landslideFillOpacity(-1)).toBe(0);
    expect(landslideFillOpacity(2)).toBe(1);
    expect(landslideFillOpacity(NaN)).toBe(defaultLandslideFillOpacity);
  });
  it('keeps opacity stable when selecting a polygon, including zero fill', () => {
    for (const state of ['potential','occurred'] as const) {
      const area = {state,review:'unreviewed' as const};
      for (const opacity of [undefined,0,.6,1]) {
        const plain = landslideAreaStyle(area,false,opacity), selected = landslideAreaStyle(area,true,opacity);
        expect(plain.fillOpacity).toBe(opacity ?? .22);
        expect(selected.fillOpacity).toBe(plain.fillOpacity);
        expect(selected.weight).toBeGreaterThan(plain.weight);
      }
    }
  });
});
