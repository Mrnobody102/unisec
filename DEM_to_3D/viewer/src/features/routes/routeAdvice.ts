import type { RoadStatus, ScenarioRoute, ScenarioRoutePair } from '../../types/dear';

const rank: Record<RoadStatus, number> = { open: 0, uncertain: 1, blocked: 2 };

/**
 * The one route a resident should take: passable first, then unverified, then the shorter.
 * `avoided` is the other mapped route when it is worse, so the app can say why it was not chosen.
 */
export function recommendRoute(pair: ScenarioRoutePair | undefined): {
  best: ScenarioRoute | null;
  avoided: ScenarioRoute | null;
} {
  const routes = [pair?.direct, pair?.candidate]
    .filter((route): route is ScenarioRoute => route != null)
    .sort((a, b) => rank[a.status] - rank[b.status] || a.lengthKm - b.lengthKm);
  const [best = null, other = null] = routes;
  return { best, avoided: best && other && rank[other.status] > rank[best.status] ? other : null };
}

/** Road sections a resident must know about on the chosen route; open sections are omitted. */
export const routeProblems = (route: ScenarioRoute) => route.segs.filter((road) => road.status !== 'open');
