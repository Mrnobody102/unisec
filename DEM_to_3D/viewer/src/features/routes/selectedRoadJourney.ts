import proj4 from 'proj4';
import type { RoadSegment, ScenarioRoute } from '../../types/dear';
import { projectedPathLength } from '../../terrain/pathGeometry';
import { findPreparedNetworkPath } from './networkRouting';
type Point = { x: number; y: number };
export type RoadAnchor = {
  point: Point;
  roadId: string;
  station: number;
  distance: number;
};
const crs = '+proj=utm +zone=48 +datum=WGS84 +units=m +no_defs';
export function roadProjected(latitude: number, longitude: number): Point {
  const [x, y] = proj4('EPSG:4326', crs, [longitude, latitude]);
  return { x, y };
}
export function roadGeographic(point: Point): {
  latitude: number;
  longitude: number;
} {
  const [longitude, latitude] = proj4(crs, 'EPSG:4326', [point.x, point.y]);
  return { latitude, longitude };
}
export function nearestRoadAnchor(
  roads: RoadSegment[],
  point: Point,
  maxDistance = 100
): RoadAnchor | null {
  let best: RoadAnchor | null = null;
  for (const road of roads) {
    let station = 0;
    for (let i = 1; i < road.points.length; i++) {
      const a = road.points[i - 1],
        b = road.points[i],
        dx = b.x - a.x,
        dy = b.y - a.y,
        length = Math.hypot(dx, dy);
      if (!length) continue;
      const t = Math.max(
          0,
          Math.min(
            1,
            ((point.x - a.x) * dx + (point.y - a.y) * dy) / (length * length)
          )
        ),
        p = { x: a.x + t * dx, y: a.y + t * dy },
        distance = Math.hypot(point.x - p.x, point.y - p.y);
      if (!best || distance < best.distance)
        best = {
          point: p,
          roadId: road.id,
          station: station + t * length,
          distance
        };
      station += length;
    }
  }
  return best && best.distance <= maxDistance ? best : null;
}
/** Split only selected roads. Existing surveyed endpoint topology stays unchanged. */
export function selectedRoadJourney(
  roads: RoadSegment[],
  start: RoadAnchor,
  end: RoadAnchor,
  avoidBlocked = false
): ScenarioRoute | null {
  if (
    Math.hypot(start.point.x - end.point.x, start.point.y - end.point.y) < 0.1
  )
    return null;
  const split = roads.flatMap((road) => {
    const marks = [start, end].filter((p) => p.roadId === road.id),
      length = projectedPathLength(road.points);
    if (!marks.length) return [road];
    const cuts = [
      { station: 0, point: road.points[0] },
      ...marks,
      { station: length, point: road.points.at(-1)! }
    ]
      .sort((a, b) => a.station - b.station)
      .filter((p, i, all) => !i || p.station - all[i - 1].station > 0.001);
    const stations = [0];
    for (let i = 1; i < road.points.length; i++)
      stations.push(
        stations[i - 1] +
          Math.hypot(
            road.points[i].x - road.points[i - 1].x,
            road.points[i].y - road.points[i - 1].y
          )
      );
    return cuts.slice(1).map((cut, i) => {
      const from = cuts[i],
        points = [
          from.point,
          ...road.points.filter(
            (_, j) =>
              stations[j] > from.station + 0.001 &&
              stations[j] < cut.station - 0.001
          ),
          cut.point
        ];
      return {
        ...road,
        id: road.id + ':part:' + i,
        points,
        len: projectedPathLength(points) / 1000
      };
    });
  });
  const steps = findPreparedNetworkPath(
    split,
    start.point,
    end.point,
    !avoidBlocked
  );
  if (!steps) return null;
  const segs = steps.map((s) =>
      s.reversed ? { ...s.road, points: [...s.road.points].reverse() } : s.road
    ),
    points = segs.flatMap((s, i) => (i ? s.points.slice(1) : s.points));
  return {
    id: `journey:${start.roadId}:${start.station}:${end.roadId}:${end.station}:${avoidBlocked}`,
    communityId: '',
    type: 'candidate',
    name: ['Hành trình đã chọn', 'Selected journey'],
    points,
    segs,
    status: segs.some((s) => s.status === 'blocked')
      ? 'blocked'
      : segs.some((s) => s.status === 'uncertain')
        ? 'uncertain'
        : 'open',
    lengthKm: projectedPathLength(points) / 1000
  };
}
