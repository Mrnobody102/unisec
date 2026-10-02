import { describe, expect, it } from 'vitest';
import { mapScale } from './mapReference';

describe('horizontal map scale', () => {
  it('changes with the ground distance per screen pixel', () => {
    expect(mapScale(12)).toEqual({ meters: 1000, pixels: 1000 / 12 });
    expect(mapScale(3)).toEqual({ meters: 200, pixels: 200 / 3 });
    expect(mapScale(0.06)).toEqual({ meters: 5, pixels: 5 / 0.06 });
  });
  it('suppresses scale when the measurement is invalid', () => {
    expect(mapScale(0)).toBeNull();
    expect(mapScale(Number.NaN)).toBeNull();
    expect(mapScale(-1)).toBeNull();
  });
});
