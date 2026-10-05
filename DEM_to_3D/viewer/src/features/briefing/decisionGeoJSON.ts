import proj4 from 'proj4';
import type { DecisionSnapshot } from './decisionSnapshot';

type Position = [number, number];
type Geometry = { type: 'Point'; coordinates: Position } | { type: 'LineString'; coordinates: Position[] } | { type: 'Polygon'; coordinates: Position[][] };
type Feature = { type: 'Feature'; id: string; geometry: Geometry; properties: Record<string, unknown> };

/** RFC 7946 coordinates are WGS84 longitude/latitude, regardless of source CRS. */
export function decisionGeoJSON(snapshot: DecisionSnapshot) {
  if (snapshot.crs !== 'EPSG:32648') throw new Error('Unsupported snapshot CRS');
  const project = proj4('+proj=utm +zone=48 +datum=WGS84 +units=m +no_defs', 'EPSG:4326');
  const point = ({ x, y }: { x: number; y: number }): Position => {
    const position = project.forward([x, y]) as Position;
    if (!position.every(Number.isFinite) || Math.abs(position[0]) > 180 || Math.abs(position[1]) > 90) throw new Error('Invalid export position');
    return position;
  };
  const line = (points: Array<{ x: number; y: number }>): Geometry => ({ type: 'LineString', coordinates: points.map(point) });
  const features: Feature[] = [];
  const add = (kind: string, id: string, geometry: Geometry, properties: Record<string, unknown>) => features.push({ type: 'Feature', id: `${kind}:${id}`, geometry, properties: { kind, ...properties } });
  let ring = snapshot.aoi.points.map(point);
  if (ring.length && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]) ring = ring.slice(0, -1);
  const area = ring.reduce((sum, p, i) => { const q = ring[(i + 1) % ring.length]; return sum + p[0] * q[1] - q[0] * p[1]; }, 0);
  if (ring.length < 3 || area === 0) throw new Error('Invalid assessment area');
  if (area < 0) ring.reverse();
  ring.push([...ring[0]]);
  add('aoi', snapshot.aoi.id, { type: 'Polygon', coordinates: [ring] }, { name: snapshot.aoi.name, observedAt: snapshot.aoi.observedAt, source: snapshot.aoi.source });
  for (const road of snapshot.roads) add('road', road.id, line(road.points), { name: road.name, roadCode: road.scenarioRoadCode, status: road.status, class: road.cls, lengthKm: road.len, hazardId: road.hz });
  for (const community of snapshot.communities) add('community', community.id, { type: 'Point', coordinates: point(community.projected) }, { name: community.name, commune: community.commune, population: community.pop, households: community.hh, priority: community.prio, selected: community.id === snapshot.community.id });
  for (const hazard of snapshot.hazards) add('hazard', hazard.id, { type: 'Point', coordinates: point(hazard.projected) }, { name: hazard.name, hazardType: hazard.kind, observation: hazard.observation, observedAt: hazard.detected, source: hazard.src, evidence: snapshot.evidence.filter(record => record.hazardId === hazard.id) });
  for (const site of snapshot.responseSites) add('response-site', site.id, { type: 'Point', coordinates: point(site.projected) }, { name: site.name, siteType: site.kind, assessment: site.assessment, observedAt: site.observedAt, source: site.source });
  if (snapshot.route) add('route', snapshot.route.id, line(snapshot.route.points), { name: snapshot.route.name, communityId: snapshot.route.communityId, status: snapshot.route.status, lengthKm: snapshot.route.lengthKm, eta: snapshot.route.eta ?? null, segments: snapshot.route.segs.map(road => road.id), assessment: snapshot.assessment });
  return { type: 'FeatureCollection' as const, features, metadata: {
    format: 'dear-gis-v1', incidentId: snapshot.incidentId, datasetVersion: snapshot.datasetVersion,
    asOf: snapshot.asOf, dataKind: snapshot.dataKind, reviewStatus: snapshot.reviewStatus,
    appliedReportIds: snapshot.appliedReportIds, sourceCRS: snapshot.crs,
    selectedCommunityId: snapshot.community.id, assessment: snapshot.assessment,
    sources: snapshot.sources, routingMethod: snapshot.routingMethod, routingAssumptions: snapshot.routingAssumptions
  } };
}
