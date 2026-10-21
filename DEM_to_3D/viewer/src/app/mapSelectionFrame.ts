type Point = { x: number; y: number };
type SelectionScene = {
  roads: Array<{ id: string; points: Point[] }>;
  hazards: Array<{ id: string; projected: Point }>;
  communities: Array<{ id: string; projected: Point }>;
  responseSites?: Array<{ id: string; projected: Point }>;
  aoi?: { id: string; points: Point[] };
};

/** Both renderers frame the same geometry when selecting or changing map mode. */
export function mapSelectionFrame(scene: SelectionScene, selection: string, routePoints?: Point[]): Point[] {
  const [kind, id] = selection.split(':');
  if (kind === 'road') return scene.roads.find(road => road.id === id)?.points ?? [];
  if (kind === 'aoi') return scene.aoi?.id === id ? scene.aoi.points : [];
  if (kind === 'community' && routePoints?.length) return routePoints;
  const point = kind === 'hazard' ? scene.hazards.find(hazard => hazard.id === id)?.projected
    : kind === 'community' ? scene.communities.find(community => community.id === id)?.projected
    : kind === 'poi' ? scene.responseSites?.find(site => site.id === id)?.projected : undefined;
  if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return [];
  const radius = kind === 'community' ? 450 : 250;
  return [
    { x: point.x - radius, y: point.y - radius },
    { x: point.x + radius, y: point.y - radius },
    point,
    { x: point.x + radius, y: point.y + radius },
    { x: point.x - radius, y: point.y + radius }
  ];
}
