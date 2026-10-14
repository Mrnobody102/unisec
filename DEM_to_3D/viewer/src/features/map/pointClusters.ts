import type { PointRenderingMode } from './pointRendering';
/** Screen-space point clustering shared by the GIS workspace and the response map. */
export type ScreenPoint = { x: number; y: number };
export type LngLat = { lat: number; lng: number };

/** Markers whose centres are closer than this many screen pixels merge into one cluster. */
export const CLUSTER_RADIUS_PX = 28;

/** Zooming in reveals individual coordinates instead of retaining large count bubbles. */
export function clusterRadiusAtZoom(zoom: number): number {
  if (zoom >= 17) return 14;
  if (zoom >= 14) return 20;
  return CLUSTER_RADIUS_PX;
}
/**
 * Members spread over less ground than this are one physical site (phone GPS jitter,
 * several photos taken at one spot). Zooming cannot separate them meaningfully, so the
 * map lists them instead of zooming in.
 */
export const SAME_SITE_METERS = 25;

/**
 * Greedy, grid-indexed clustering (the single-level step of supercluster). Seeds follow input
 * order, so the same records always produce the same clusters at a given zoom.
 */
export function clusterScreenPoints<T extends ScreenPoint>(
  points: readonly T[],
  radius = CLUSTER_RADIUS_PX
): T[][] {
  const cells = new Map<string, number[]>();
  const cell = (point: ScreenPoint) => [
    Math.floor(point.x / radius),
    Math.floor(point.y / radius)
  ];
  points.forEach((point, index) => {
    const key = cell(point).join(':');
    const bucket = cells.get(key);
    if (bucket) bucket.push(index);
    else cells.set(key, [index]);
  });
  const taken = new Uint8Array(points.length),
    limit = radius * radius,
    groups: T[][] = [];
  points.forEach((seed, index) => {
    if (taken[index]) return;
    taken[index] = 1;
    const group = [seed];
    const [cx, cy] = cell(seed);
    for (let dx = -1; dx <= 1; dx++)
      for (let dy = -1; dy <= 1; dy++)
        for (const other of cells.get(`${cx + dx}:${cy + dy}`) ?? []) {
          if (taken[other]) continue;
          const point = points[other];
          if ((point.x - seed.x) ** 2 + (point.y - seed.y) ** 2 > limit)
            continue;
          taken[other] = 1;
          group.push(point);
        }
    groups.push(group);
  });
  return groups;
}

/** Display grouping only; each mode keeps the original records and coordinates intact. */
export function pointScreenGroups<T extends ScreenPoint>(
  points: readonly T[],
  zoom: number,
  mode: PointRenderingMode
): T[][] {
  return mode === 'individual'
    ? points.map((point) => [point])
    : clusterScreenPoints(points, clusterRadiusAtZoom(zoom));
}

export function centroid(points: readonly LngLat[]): LngLat {
  const sum = points.reduce(
    (total, p) => ({ lat: total.lat + p.lat, lng: total.lng + p.lng }),
    {
      lat: 0,
      lng: 0
    }
  );
  return { lat: sum.lat / points.length, lng: sum.lng / points.length };
}

/** Great-circle distance in metres (spherical Earth, adequate for cluster spread). */
export function groundDistance(a: LngLat, b: LngLat): number {
  const rad = Math.PI / 180,
    dLat = (b.lat - a.lat) * rad,
    dLng = (b.lng - a.lng) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6_371_008.8 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Approximate ground diameter of a group: twice the farthest member from the centroid. */
export function groundSpread(points: readonly LngLat[]): number {
  if (points.length < 2) return 0;
  const centre = centroid(points);
  return 2 * Math.max(...points.map((point) => groundDistance(centre, point)));
}

/** Monotone-chain convex hull, counter-clockwise, without repeating the first vertex. */
export function convexHull(points: readonly LngLat[]): LngLat[] {
  const sorted = [...points].sort((a, b) => a.lng - b.lng || a.lat - b.lat);
  if (sorted.length < 3) return sorted;
  const cross = (o: LngLat, a: LngLat, b: LngLat) =>
    (a.lng - o.lng) * (b.lat - o.lat) - (a.lat - o.lat) * (b.lng - o.lng);
  const half = (input: LngLat[]) => {
    const chain: LngLat[] = [];
    for (const point of input) {
      while (
        chain.length >= 2 &&
        cross(chain[chain.length - 2], chain[chain.length - 1], point) <= 0
      )
        chain.pop();
      chain.push(point);
    }
    chain.pop();
    return chain;
  };
  return [...half(sorted), ...half([...sorted].reverse())];
}

/** Member colour shares, largest first; mixed groups can use a neutral aggregate symbol. */
export function colorShares(
  colors: readonly string[]
): { color: string; share: number }[] {
  const counts = new Map<string, number>();
  for (const color of colors) counts.set(color, (counts.get(color) ?? 0) + 1);
  return [...counts]
    .sort((a, b) => b[1] - a[1])
    .map(([color, count]) => ({ color, share: count / colors.length }));
}
