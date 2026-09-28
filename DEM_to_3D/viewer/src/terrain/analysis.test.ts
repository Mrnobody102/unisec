import { describe, expect, it } from 'vitest';
import { detectExtrema, smoothProfile } from './extrema';
import { calculateSegmentSlopes, regressionSlopeAt } from './slope';
import type { ProfileSample } from './profile';

const samples = (values: Array<number | undefined>): ProfileSample[] => values.map((elevation, index) => ({ index, distance: index * 10, projected: { x: index * 10, y: 0 }, elevation }));

describe('profile analysis', () => {
  it('smooths only within valid segments and finds prominent extrema on raw coordinates', () => {
    const profile = samples([0, 10, 30, 10, 0, undefined, 5, 8, 5]);
    const smoothed = smoothProfile(profile, 20);
    expect(smoothed.map((value) => value === undefined ? undefined : Number(value.toFixed(4)))).toEqual([5, 13.3333, 16.6667, 13.3333, 5, undefined, 6.5, 6, 6.5]);
    const extrema = detectExtrema(profile, { smoothingWindowM: 20, minProminenceM: 10, minDistanceM: 20 });
    expect(extrema.map((item) => ({ kind: item.kind, distance: item.distance, elevation: item.elevation }))).toEqual([{ kind: 'peak', distance: 20, elevation: 30 }]);
  });

  it('calculates segment slope and ignores duplicate or nodata distances', () => {
    const profile = samples([100, 120, undefined, 140, 140]);
    profile[1].distance = 0;
    const slopes = calculateSegmentSlopes(profile);
    expect(slopes).toEqual([{ fromIndex: 3, toIndex: 4, distance: 10, deltaElevation: 0, percent: 0, angle: 0 }]);
  });

  it('uses linear regression over a metric window and returns null when unavailable', () => {
    const profile = samples([0, 10, 20, 30, 40]);
    expect(regressionSlopeAt(profile, 20, 20, 'approach')).toEqual({ percent: 100, angle: 45, sampleCount: 3 });
    expect(regressionSlopeAt(profile, 0, 20, 'approach')).toBeNull();
  });

  it('regresses within a valid segment even when the window begins before a nodata gap', () => {
    const profile = samples([0, undefined, 10, 20, 30]);
    expect(regressionSlopeAt(profile, 30, 20, 'approach')).toEqual({ percent: 100, angle: 45, sampleCount: 2 });
  });

  it('does not apply minimum-distance filtering across separate nodata segments', () => {
    const profile = samples([0, 20, 0, undefined, 0, 20, 0]);
    const extrema = detectExtrema(profile, { smoothingWindowM: 1, minProminenceM: 5, minDistanceM: 100 });
    expect(extrema.map((item) => item.index)).toEqual([1, 5]);
  });

  it('returns the raw maximum nearest to a smoothed peak', () => {
    const profile = samples([0, 20, 10, 10, 0]);
    const extrema = detectExtrema(profile, { smoothingWindowM: 20, minProminenceM: 1, minDistanceM: 1 });
    expect(extrema.map((item) => ({ index: item.index, elevation: item.elevation }))).toEqual([{ index: 1, elevation: 20 }]);
  });
});
