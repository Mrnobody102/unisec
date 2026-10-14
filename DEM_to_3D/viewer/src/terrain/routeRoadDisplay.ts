import type { RoadSegment, ScenarioRoute } from "../types/dear";
export type DisplayRoad = {
  road: RoadSegment;
  sourceId: string;
  routeSelected: boolean;
};
/** Full network roads remain contextual. A partial journey highlights only its
 * clipped geometry, while clicks still inspect the original road. */
export function routeRoadDisplay(
  roads: RoadSegment[],
  route: ScenarioRoute | null | undefined,
  enabled: boolean,
): DisplayRoad[] {
  const ids = new Set(roads.map((r) => r.id));
  const selected = new Set(enabled ? (route?.segs.map((r) => r.id) ?? []) : []);
  const result = roads.map((road) => ({
    road,
    sourceId: road.id,
    routeSelected: selected.has(road.id),
  }));
  if (enabled)
    for (const road of route?.segs ?? []) {
      if (!ids.has(road.id) && road.sourceRoadId && ids.has(road.sourceRoadId))
        result.push({ road, sourceId: road.sourceRoadId, routeSelected: true });
    }
  return result;
}
