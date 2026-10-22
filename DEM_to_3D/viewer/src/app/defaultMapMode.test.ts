import { describe, expect, it } from 'vitest';
import { defaultMapMode } from './defaultMapMode';

const desktop = { search: '', webgl: () => true };

describe('defaultMapMode', () => {
  it('opens in 3D on a capable device', () => {
    expect(defaultMapMode(desktop)).toBe('3d');
  });
  it('falls back to 2D when WebGL is unavailable or blocked', () => {
    expect(defaultMapMode({ ...desktop, webgl: () => false })).toBe('2d');
    expect(defaultMapMode({ ...desktop, webgl: () => { throw new Error('blocked'); } })).toBe('2d');
  });
  it('honours an explicit map parameter', () => {
    expect(defaultMapMode({ ...desktop, search: '?map=2d' })).toBe('2d');
    expect(defaultMapMode({ ...desktop, search: '?map=3d', webgl: () => false })).toBe('3d');
  });
});
