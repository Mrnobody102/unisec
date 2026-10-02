import { describe, expect, it } from 'vitest';
import { layoutMarkerGroups, overlaps } from './markerLayout';

describe('map symbol layout', () => {
  it('retains every nearby object in a selectable group anchored at the selected point', () => {
    const points = [
      { id: 'hazard', x: 100, y: 100, priority: 10 },
      { id: 'community', x: 118, y: 110, priority: 100 },
      { id: 'other', x: 220, y: 150, priority: 50 }
    ];
    const groups = layoutMarkerGroups(points, 400, 300, []);
    expect(groups).toHaveLength(2);
    expect(groups[0].anchor).toEqual(points[1]);
    expect(groups.flatMap(g => g.members.map(p => p.id)).sort()).toEqual(['community', 'hazard', 'other']);
    expect(overlaps(groups[0].rect, groups[1].rect)).toBe(false);
  });
  it('does not cover a map control, including a neighbour behind that control', () => {
    const control = { x: 0, y: 0, width: 80, height: 150 };
    const groups = layoutMarkerGroups([
      { id: 'selected', x: 76, y: 100, priority: 100 },
      { id: 'hazard', x: 110, y: 100, priority: 10 },
      { id: 'occluded', x: 30, y: 30, priority: 10 }
    ], 320, 240, [control]);
    expect(groups).toHaveLength(1);
    expect(groups[0].anchor.id).toBe('hazard');
    expect(groups[0].members.map(p => p.id).sort()).toEqual(['hazard', 'selected']);
    expect(overlaps(groups[0].rect, control, 6)).toBe(false);
  });
  it('has deterministic, non-overlapping groups as the map zooms', () => {
    const points = Array.from({ length: 20 }, (_, i) => ({ id: `point-${i}`, x: 50 + i * 12, y: 100, priority: 10 }));
    const near = layoutMarkerGroups(points, 400, 300, []);
    expect(near).toHaveLength(1);
    expect(near[0].members).toHaveLength(20);
    const far = layoutMarkerGroups(points.map(p => ({ ...p, x: p.x * 5 })), 1800, 300, []);
    expect(far).toHaveLength(20);
    expect(layoutMarkerGroups([...points].reverse(), 400, 300, [])).toEqual(near);
    expect(layoutMarkerGroups([{ id: 'bad', x: NaN, y: 30, priority: 100 }], 400, 300, [])).toEqual([]);
  });
});
