import type { ProjectedPoint } from './coordinate';

/** Planimetric length in the projected CRS linear unit. */
export function projectedPathLength(points: readonly ProjectedPoint[]): number {
  return points.slice(1).reduce((length, point, i) => length + Math.hypot(point.x - points[i].x, point.y - points[i].y), 0);
}
