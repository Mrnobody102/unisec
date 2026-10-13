import { describe, expect, it } from 'vitest';
import { pointRenderingMode } from './pointRendering';
import { pointScreenGroups } from './pointClusters';

describe('point rendering preference', () => {
  it('defaults to grouping and tolerates old or corrupt saved values', () => {
    for (const value of [null, undefined, '', 'cluster', {}, true])
      expect(pointRenderingMode(value)).toBe('group');
    expect(pointRenderingMode('individual')).toBe('individual');
    expect(pointRenderingMode('group')).toBe('group');
  });

  it('shows every original point without modifying its coordinates in individual mode', () => {
    const points = [
      { id: 'a', x: 100, y: 100 },
      { id: 'b', x: 100, y: 100 },
      { id: 'c', x: 112, y: 105 }
    ];
    const original = structuredClone(points);
    expect(pointScreenGroups(points, 12, 'group')).toHaveLength(1);
    expect(pointScreenGroups(points, 12, 'individual')).toEqual(
      points.map((point) => [point])
    );
    expect(points).toEqual(original);
  });
});
