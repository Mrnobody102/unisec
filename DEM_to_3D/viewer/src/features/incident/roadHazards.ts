import type { Community, RoadSegment, ScenarioRoutePair } from "../../types/dear";
/** Canonical relationship resolver, including the original single-ID dataset field. */
export function roadHazardIds(
  road: Pick<RoadSegment, "hz" | "hazardIds">,
): string[] {
  return [...new Set(road.hazardIds ?? (road.hz ? [road.hz] : []))];
}
export function roadsForHazard(
  roads: RoadSegment[],
  hazardId: string,
): RoadSegment[] {
  return roads.filter((r) => roadHazardIds(r).includes(hazardId));
}
export function setRoadHazards(
  roads: RoadSegment[],
  roadId: string,
  hazardIds: string[],
): RoadSegment[] {
  const ids = [...new Set(hazardIds)];
  return roads.map((r) =>
    r.id === roadId ? { ...r, hazardIds: ids, hz: ids[0] } : r,
  );
}
export function setHazardRoads(
  roads: RoadSegment[],
  hazardId: string,
  roadIds: string[],
): RoadSegment[] {
  const linked = new Set(roadIds);
  return roads.map((r) => {
    const before = roadHazardIds(r),
      ids = before.filter((id) => id !== hazardId);
    if (linked.has(r.id)) ids.push(hazardId);
    return ids.length === before.length &&
      ids.every((id) => before.includes(id))
      ? r
      : { ...r, hazardIds: ids, hz: ids[0] };
  });
}
export function sameLinks(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((id) => b.includes(id));
}
/** Communities named in a hazard's findings, or reached through a road it affects. */
export function communitiesForHazard(
  communities: Community[],
  routes: Map<string, ScenarioRoutePair>,
  hazardId: string
): Community[] {
  return communities.filter(community =>
    community.facts.some(fact => !Array.isArray(fact) && fact.hazardId === hazardId) ||
    [routes.get(community.id)?.candidate, routes.get(community.id)?.direct]
      .some(route => route?.segs.some(seg => roadHazardIds(seg).includes(hazardId))));
}
