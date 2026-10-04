import proj4 from 'proj4';

export type MeasurePoint = { x: number; y: number; lat: number; lng: number };
export type MeasureMode = 'distance' | 'area';
const utm48 = '+proj=utm +zone=48 +datum=WGS84 +units=m +no_defs';

/** Horizontal grid measurements in the incident's UTM zone, never screen pixels. */
export function measurementPoint(lat: number, lng: number): MeasurePoint | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < 0 || lat > 84 || lng < 102 || lng > 108) return null;
  const [x, y] = proj4('EPSG:4326', utm48, [lng, lat]);
  return { x, y, lat, lng };
}

export function horizontalLength(points: MeasurePoint[], closed = false): number {
  return points.reduce((total, point, index) => {
    const next = points[index + 1] ?? (closed ? points[0] : null);
    return total + (next ? Math.hypot(next.x - point.x, next.y - point.y) : 0);
  }, 0);
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
