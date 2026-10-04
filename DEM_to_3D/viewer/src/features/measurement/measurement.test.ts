import { describe, expect, it } from 'vitest';
import { horizontalArea, horizontalLength, measurementPoint } from './measurement';

describe('operator grid measurements', () => {
  const p = (x: number, y: number) => ({ x: x + 400000, y: y + 2400000, lat: 21.72, lng: 104.03 });
  it('measures horizontal segments and a closed perimeter in metres', () => {
    expect(horizontalLength([p(0, 0), p(300, 400), p(600, 0)])).toBe(1000);
    expect(horizontalLength([p(0, 0), p(100, 0), p(100, 100), p(0, 100)], true)).toBe(400);
  });
  it('measures polygon area independently of winding and rejects crossings', () => {
    const square = [p(0, 0), p(100, 0), p(100, 100), p(0, 100)];
    expect(horizontalArea(square)).toBe(10000);
    expect(horizontalArea([...square].reverse())).toBe(10000);
    expect(horizontalArea([square[0], square[2], square[1], square[3]])).toBeNull();
    expect(horizontalArea([p(0, 0), p(100, 0), p(200, 0)])).toBeNull();
  });
  it('projects actual geographic coordinates and refuses points outside UTM 48N', () => {
    expect(measurementPoint(0, 105)?.x).toBeCloseTo(500000, 3);
    expect(measurementPoint(21.72, 104.03)?.y).toBeGreaterThan(2400000);
    expect(measurementPoint(21, 115)).toBeNull();
    expect(measurementPoint(NaN, 105)).toBeNull();
  });
});
