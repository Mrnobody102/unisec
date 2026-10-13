import { describe, expect, it } from 'vitest';
import type { RoadSegment } from '../../types/dear';
import { nearestRoadAnchor, selectedRoadJourney } from './selectedRoadJourney';
const road = (
  id: string,
  points: { x: number; y: number }[],
  status: RoadSegment['status'] = 'open'
): RoadSegment => ({
  id,
  points,
  status,
  cls: 'track',
  len: 1,
  name: [id, id]
});
const p = (x: number, y = 0) => ({ x, y });
describe('arbitrary selected positions on a prepared road network', () => {
  it('uses the selected part of a bent road instead of endpoint or straight-line distance', () => {
    const roads = [road('A', [p(0), p(100), p(100, 100)])],
      a = nearestRoadAnchor(roads, p(50))!,
      b = nearestRoadAnchor(roads, p(100, 50))!;
    const route = selectedRoadJourney(roads, a, b)!;
    expect(route.lengthKm).toBeCloseTo(0.1);
    expect(route.points).toEqual([p(50), p(100), p(100, 50)]);
  });
  it('connects selected positions on different explicitly joined roads', () => {
    const roads = [road('A', [p(0), p(100)]), road('B', [p(100), p(200)])];
    expect(
      selectedRoadJourney(
        roads,
        nearestRoadAnchor(roads, p(25))!,
        nearestRoadAnchor(roads, p(175))!
      )?.lengthKm
    ).toBeCloseTo(0.15);
  });
  it('flags blocked geometry and excludes it when avoidance is selected', () => {
    const roads = [road('A', [p(0), p(100)], 'blocked')],
      a = nearestRoadAnchor(roads, p(20))!,
      b = nearestRoadAnchor(roads, p(80))!;
    expect(selectedRoadJourney(roads, a, b)?.status).toBe('blocked');
    expect(selectedRoadJourney(roads, a, b, true)).toBeNull();
  });
  it('does not connect crossing roads or accept distant/identical points', () => {
    const roads = [
        road('A', [p(0), p(100)]),
        road('B', [p(50, -50), p(50, 50)])
      ],
      a = nearestRoadAnchor(roads, p(10))!,
      b = nearestRoadAnchor(roads, p(50, 40))!;
    expect(selectedRoadJourney(roads, a, b)).toBeNull();
    expect(nearestRoadAnchor(roads, p(1000))).toBeNull();
    expect(selectedRoadJourney(roads, a, a)).toBeNull();
  });
});
