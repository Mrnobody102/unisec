import type { RoutingAssumptions, ScenarioRoute } from '../../types/dear';
import { projectedPathLength } from '../../terrain/pathGeometry';

/** Scenario speeds are explicit input, not inferred from imagery or road class. */
export function estimateTravel(route: ScenarioRoute, speeds: RoutingAssumptions): ScenarioRoute['eta'] {
  if (route.status === 'blocked') return undefined;
  const mode = route.segs.some(road => road.cls === 'track') ? 'foot' : 'pickup';
  let min = 0, max = 0;
  for (const road of route.segs) {
    const [slow, fast] = speeds[mode === 'foot' ? 'track' : road.cls];
    const km = projectedPathLength(road.points) / 1000;
    min += km / fast * 60; max += km / slow * 60;
  }
  return { mode, minMinutes: Math.floor(min / 5) * 5, maxMinutes: Math.ceil(max / 5) * 5 };
}
