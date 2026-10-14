import { describe, expect, it } from 'vitest';
import { defaultMapMode } from './defaultMapMode';

const desktop = { search: '', matches: () => false, webgl: () => true };

describe('defaultMapMode', () => {
  it('opens in 3D on a capable desktop', () => {
    expect(defaultMapMode(desktop)).toBe('3d');
  });
  it('opens in 2D without WebGL, on data saver, slow links and phones', () => {
    expect(defaultMapMode({ ...desktop, webgl: () => false })).toBe('2d');
    expect(defaultMapMode({ ...desktop, connection: { saveData: true } })).toBe('2d');
    expect(defaultMapMode({ ...desktop, connection: { effectiveType: '3g' } })).toBe('2d');
    expect(defaultMapMode({ ...desktop, matches: (query) => query.includes('pointer: coarse') })).toBe('2d');
  });
  it('honours an explicit map parameter', () => {
    expect(defaultMapMode({ ...desktop, search: '?map=2d' })).toBe('2d');
    expect(defaultMapMode({ ...desktop, search: '?map=3d', webgl: () => false })).toBe('3d');
  });
});
