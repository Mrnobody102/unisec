import proj4 from 'proj4';

export type MeasurePoint = { x: number; y: number; lat: number; lng: number };
export type MeasureMode = 'distance' | 'area' | 'radius' | 'bearing' | 'angle' | 'location';
const utm48 = '+proj=utm +zone=48 +datum=WGS84 +units=m +no_defs';

/** Horizontal grid measurements in the incident's UTM zone, never screen pixels. */
export function measurementPoint(lat: number, lng: number): MeasurePoint | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < 0 || lat > 84 || lng < 102 || lng > 108) return null;
  const [x, y] = proj4('EPSG:4326', utm48, [lng, lat]);
  return { x, y, lat, lng };
}

export function projectedMeasurementPoint(x: number, y: number): MeasurePoint | null {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  const [lng, lat] = proj4(utm48, 'EPSG:4326', [x, y]);
  return measurementPoint(lat, lng) ? { x, y, lat, lng } : null;
}

/** Clockwise from grid north, not magnetic or geographic north. */
export function gridBearing(a: MeasurePoint, b: MeasurePoint): number | null {
  if (Math.hypot(b.x - a.x, b.y - a.y) < 0.1) return null;
  return (Math.atan2(b.x - a.x, b.y - a.y) * 180 / Math.PI + 360) % 360;
}

/** Interior angle at the second point, in the horizontal grid plane. */
export function interiorAngle(points: MeasurePoint[]): number | null {
  if (points.length !== 3) return null;
  const [a, b, c] = points;
  const ux = a.x - b.x, uy = a.y - b.y, vx = c.x - b.x, vy = c.y - b.y;
  if (Math.hypot(ux, uy) < 0.1 || Math.hypot(vx, vy) < 0.1) return null;
  return Math.atan2(Math.abs(ux * vy - uy * vx), ux * vx + uy * vy) * 180 / Math.PI;
}

export function minimumPoints(mode: MeasureMode): number {
  return mode === 'location' ? 1 : mode === 'area' || mode === 'angle' ? 3 : 2;
}
export function canFinish(mode: MeasureMode, points: MeasurePoint[]): boolean {
  if (points.length < minimumPoints(mode)) return false;
  if (!['distance', 'area'].includes(mode) && points.length !== minimumPoints(mode)) return false;
  if (mode === 'area') return horizontalArea(points) !== null;
  if (mode === 'angle') return interiorAngle(points) !== null;
  if (mode === 'radius') return horizontalLength(points) >= 0.1 && radiusRing(points).length > 0;
  return mode === 'location' || horizontalLength(points) >= 0.1;
}

export function radiusRing(points: MeasurePoint[]): MeasurePoint[] {
  if (points.length !== 2) return [];
  const radius = horizontalLength(points), center = points[0];
  const ring = Array.from({ length: 72 }, (_, i) => projectedMeasurementPoint(
    center.x + radius * Math.cos(i * Math.PI / 36), center.y + radius * Math.sin(i * Math.PI / 36)));
  return ring.every((point): point is MeasurePoint => point !== null) ? ring : [];
}

export function horizontalLength(points: MeasurePoint[], closed = false): number {
  return points.reduce((total, point, index) => {
    const next = points[index + 1] ?? (closed ? points[0] : null);
    return total + (next ? Math.hypot(next.x - point.x, next.y - point.y) : 0);
  }, 0);
}

export function measurementPreviewPoints(mode: MeasureMode, points: MeasurePoint[], hover?: MeasurePoint): MeasurePoint[] {
  if (!hover) return points;
  const coincides = (point?: MeasurePoint) => point && Math.hypot(point.x - hover.x, point.y - hover.y) < 0.1;
  if (coincides(points.at(-1)) || (mode === 'area' && points.length >= 3 && coincides(points[0]))) return points;
  return [...points, hover];
}

const orientation = (a: MeasurePoint, b: MeasurePoint, c: MeasurePoint) =>
  (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
function intersects(a: MeasurePoint, b: MeasurePoint, c: MeasurePoint, d: MeasurePoint): boolean {
  const side = [orientation(a, b, c), orientation(a, b, d), orientation(c, d, a), orientation(c, d, b)];
  if (side[0] * side[1] < 0 && side[2] * side[3] < 0) return true;
  const within = (p: MeasurePoint, start: MeasurePoint, end: MeasurePoint) =>
    p.x >= Math.min(start.x, end.x) && p.x <= Math.max(start.x, end.x) &&
    p.y >= Math.min(start.y, end.y) && p.y <= Math.max(start.y, end.y);
  return (side[0] === 0 && within(c, a, b)) || (side[1] === 0 && within(d, a, b)) ||
    (side[2] === 0 && within(a, c, d)) || (side[3] === 0 && within(b, c, d));
}

export function horizontalArea(points: MeasurePoint[]): number | null {
  if (points.length < 3) return null;
  if (points.some((point, i) => Math.hypot(point.x - points[(i + 1) % points.length].x, point.y - points[(i + 1) % points.length].y) < 0.1)) return null;
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      if (j === i + 1 || (i === 0 && j === points.length - 1)) continue;
      if (intersects(points[i], points[(i + 1) % points.length], points[j], points[(j + 1) % points.length])) return null;
    }
  }
  // Use a local origin to avoid subtracting large UTM products.
  const origin = points[0];
  const twice = points.reduce((sum, point, index) => {
    const next = points[(index + 1) % points.length];
    return sum + (point.x - origin.x) * (next.y - origin.y) - (next.x - origin.x) * (point.y - origin.y);
  }, 0);
  return Math.abs(twice) > 0.01 ? Math.abs(twice) / 2 : null;
}
