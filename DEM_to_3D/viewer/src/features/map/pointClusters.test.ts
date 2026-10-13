import { describe, expect, it } from 'vitest';
import {
  clusterScreenPoints,
  clusterRadiusAtZoom,
  colorShares,
  convexHull,
  groundDistance,
  groundSpread,
  SAME_SITE_METERS
} from './pointClusters';

describe('clusterScreenPoints', () => {
  it('merges markers within the pixel radius and keeps distant ones apart', () => {
    const points = [
      { id: 'a', x: 100, y: 100 },
      { id: 'b', x: 110, y: 104 },
      { id: 'c', x: 96, y: 112 },
      { id: 'd', x: 400, y: 400 }
    ];
    const groups = clusterScreenPoints(points, 40).map((group) =>
      group.map((p) => p.id)
    );
    expect(groups).toEqual([['a', 'b', 'c'], ['d']]);
  });

  it('finds neighbours across grid cell borders', () => {
    const groups = clusterScreenPoints(
      [
        { x: 39, y: 39 },
        { x: 41, y: 41 }
      ],
      40
    );
    expect(groups).toHaveLength(1);
  });

  it('is deterministic for the same input order', () => {
    const points = Array.from({ length: 50 }, (_, i) => ({
      x: (i * 37) % 300,
      y: (i * 53) % 300
    }));
    expect(clusterScreenPoints(points)).toEqual(clusterScreenPoints(points));
    expect(clusterScreenPoints(points).flat()).toHaveLength(points.length);
  });
});

describe('scale-aware point presentation', () => {
  it('reveals neighbouring coordinates as the map zooms in', () => {
    const points = [
      { x: 100, y: 100 },
      { x: 118, y: 100 }
    ];
    expect(clusterScreenPoints(points, clusterRadiusAtZoom(10))).toHaveLength(
      1
    );
    expect(clusterScreenPoints(points, clusterRadiusAtZoom(17))).toHaveLength(
      2
    );
  });

  it('keeps coincident records selectable at every scale', () => {
    const points = [
      { x: 100, y: 100 },
      { x: 100, y: 100 }
    ];
    for (const zoom of [5, 13, 16, 19]) {
      expect(
        clusterScreenPoints(points, clusterRadiusAtZoom(zoom))
      ).toHaveLength(1);
    }
  });
});

describe('ground measures', () => {
  it('measures metres on the ground', () => {
    // 0.0001° of latitude ≈ 11.1 m.
    expect(
      groundDistance({ lat: 21, lng: 104 }, { lat: 21.0001, lng: 104 })
    ).toBeCloseTo(11.1, 0);
  });

  it('treats photos a few metres apart as one site', () => {
    const site = [
      { lat: 21.78291, lng: 104.05355 },
      { lat: 21.78293, lng: 104.05357 },
      { lat: 21.78292, lng: 104.05352 }
    ];
    expect(groundSpread(site)).toBeLessThan(SAME_SITE_METERS);
    expect(
      groundSpread([...site, { lat: 21.7835, lng: 104.0535 }])
    ).toBeGreaterThan(SAME_SITE_METERS);
    expect(groundSpread([site[0]])).toBe(0);
  });
});

describe('convexHull', () => {
  it('drops interior points', () => {
    const hull = convexHull([
      { lat: 0, lng: 0 },
      { lat: 0, lng: 2 },
      { lat: 2, lng: 2 },
      { lat: 2, lng: 0 },
      { lat: 1, lng: 1 }
    ]);
    expect(hull).toHaveLength(4);
    expect(hull).not.toContainEqual({ lat: 1, lng: 1 });
  });
});

describe('colorShares', () => {
  it('orders colours by share', () => {
    expect(colorShares(['#a', '#b', '#b', '#b'])).toEqual([
      { color: '#b', share: 0.75 },
      { color: '#a', share: 0.25 }
    ]);
  });
});
