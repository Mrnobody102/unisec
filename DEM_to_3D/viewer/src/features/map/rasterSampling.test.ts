import { describe, expect, it } from 'vitest';
import { sampleDisplayPixel } from './rasterSampling';

const sample = (source: number[], x: number, y: number) => {
  const output = new Uint8ClampedArray(4);
  sampleDisplayPixel(new Uint8ClampedArray(source), 2, 2, x, y, output, 0);
  return [...output];
};
describe('imagery display resampling', () => {
  const pixels = [0, 0, 0, 255, 100, 100, 100, 255, 200, 200, 200, 255, 240, 240, 240, 255];
  it('interpolates display colour instead of snapping to one source pixel', () => {
    expect(sample(pixels, .5, .5)).toEqual([135, 135, 135, 255]);
    expect(sample(pixels, 1, 1)).toEqual([240, 240, 240, 255]);
  });
  it('covers the full half-pixel footprint and leaves outside pixels transparent', () => {
    expect(sample(pixels, -.5, -.5)).toEqual([0, 0, 0, 255]);
    expect(sample(pixels, 1.5, 1.5)).toEqual([240, 240, 240, 255]);
    expect(sample(pixels, 1.6, 0)).toEqual([0, 0, 0, 0]);
    expect(sample(pixels, NaN, 0)).toEqual([0, 0, 0, 0]);
  });
  it('keeps nodata holes and does not blend transparent black into valid colour', () => {
    const masked = [100, 100, 100, 255, 0, 0, 0, 0, 100, 100, 100, 255, 100, 100, 100, 255];
    expect(sample(masked, 1, 0)).toEqual([0, 0, 0, 0]);
    expect(sample(masked, .25, .25)).toEqual([100, 100, 100, 255]);
  });
});
