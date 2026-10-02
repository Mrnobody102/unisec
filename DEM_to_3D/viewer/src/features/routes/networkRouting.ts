import type { Community, RoadSegment, ScenarioRoute, ScenarioRoutePair } from '../../types/dear';
import { projectedPathLength } from '../../terrain/pathGeometry';

type Point = { x: number; y: number };
type Step = { road: RoadSegment; reversed: boolean };
const key = (point: Point) => `${point.x},${point.y}`;

/** Prepared graph: endpoints are explicitly connected. Do not snap unknown roads
 * or connect line crossings without a surveyed network junction. */
function findPath(roads: RoadSegment[], start: Point, destination: Point,
  ignoreStatus: boolean, excluded = new Set<string>()): Step[] | null {
  const adjacency = new Map<string, Array<Step & { to: string; cost: number }>>();
  for (const road of [...roads].sort((a, b) => a.id.localeCompare(b.id))) {
    if (excluded.has(road.id) || (!ignoreStatus && road.status === 'blocked') || road.points.length < 2) continue;
    const a = key(road.points[0]), b = key(road.points.at(-1)!);
    const length = projectedPathLength(road.points);
    if (!Number.isFinite(length) || length <= 0) continue;
    // Versioned demo policy: uncertainty adds cost, not proof of passage.
    const cost = length * (!ignoreStatus && road.status === 'uncertain' ? 3 : 1);
    const forward = adjacency.get(a) ?? []; forward.push({ road, reversed: false, to: b, cost }); adjacency.set(a, forward);
    const reverse = adjacency.get(b) ?? []; reverse.push({ road, reversed: true, to: a, cost }); adjacency.set(b, reverse);
  }
  const from = key(start), to = key(destination);
  if (!adjacency.has(from) || !adjacency.has(to)) return null;
  const distance = new Map([[from, 0]]), previous = new Map<string, { from: string; step: Step }>();
  const visited = new Set<string>();
  while (true) {
    let current: string | null = null, best = Infinity;
    for (const [node, value] of distance) if (!visited.has(node) && value < best) { current = node; best = value; }
    if (current === null) return null;
    if (current === to) break;
    visited.add(current);
    for (const edge of adjacency.get(current) ?? []) {
      if (visited.has(edge.to)) continue;
      const candidate = best + edge.cost;
      if (candidate < (distance.get(edge.to) ?? Infinity)) {
        distance.set(edge.to, candidate); previous.set(edge.to, { from: current, step: edge });
      }
    }
  }
  const result: Step[] = [];
  for (let node = to; node !== from;) {
    const entry = previous.get(node); if (!entry) return null;
    result.unshift(entry.step); node = entry.from;
  }
  return result.length ? result : null;
}

function route(steps: Step[], community: Community, type: 'direct' | 'candidate'): ScenarioRoute {
  const segs = steps.map(step => step.reversed ? { ...step.road, points: [...step.road.points].reverse() } : step.road);
  const points = segs.flatMap((segment, index) => index ? segment.points.slice(1) : segment.points);
  const status = segs.some(segment => segment.status === 'blocked') ? 'blocked'
    : segs.some(segment => segment.status === 'uncertain') ? 'uncertain' : 'open';
  // Keep the mapped road name when sections share it. Shortest does not imply
  // an officially designated main road, and an alternative is not always a bypass.
  const name = [0, 1].map(index => {
    const names = segs.map(segment => segment.name[index].split(',')[0].trim());
    return names.every(value => value === names[0]) ? names[0]
      : index === 0 ? `Tuyến tiếp cận ${community.name}` : `Access route to ${community.name}`;
  }) as [string, string];
  return { id: `RT-${community.id}-${type.toUpperCase()}`, communityId: community.id, type, name,
    points, segs, status, lengthKm: Number((projectedPathLength(points) / 1000).toFixed(2)) };
}

/** Shortest mapped baseline and candidate after blockage filtering. When all
 * options are blocked, keep known geometry for inspection, not recommendation. */
export function buildNetworkRoutes(roads: RoadSegment[], communities: Community[], staging: Point): Map<string, ScenarioRoutePair> {
  const routes = new Map<string, ScenarioRoutePair>();
  for (const community of communities) {
    const baseline = findPath(roads, staging, community.projected, true);
    if (!baseline) { routes.set(community.id, { direct: null, candidate: null }); continue; }
    const preferred = findPath(roads, staging, community.projected, false);
    let alternative: Step[] | null = null, alternativeLength = Infinity;
    // A distinct path can be found by excluding each edge of the baseline.
    // Retain the shortest known alternative for comparison even if blocked.
    for (const step of baseline) {
      const path = findPath(roads, staging, community.projected, true, new Set([step.road.id]));
      const length = path?.reduce((sum, item) => sum + projectedPathLength(item.road.points), 0) ?? Infinity;
      if (length < alternativeLength) { alternative = path; alternativeLength = length; }
    }
    const differs = preferred && preferred.map(step => step.road.id).join(',') !== baseline.map(step => step.road.id).join(',');
    if (differs || (!preferred && alternative)) {
      routes.set(community.id, {
        direct: route(baseline, community, 'direct'),
        candidate: route(differs ? preferred! : alternative!, community, 'candidate')
      });
    } else routes.set(community.id, { direct: null, candidate: route(preferred ?? baseline, community, 'candidate') });
  }
  return routes;
}
