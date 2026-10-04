import { describe, expect, it } from 'vitest';
import { preparedPacket, buildScenarioRoutes } from '../../data/cheTaoScenario';
import { assessCommunity } from '../incident/responseAssessment';
import { createDecisionSnapshot } from './decisionSnapshot';
import { decisionGeoJSON } from './decisionGeoJSON';

function snapshot() {
  const packet = preparedPacket, allRoutes = buildScenarioRoutes(packet.roads);
  const communities = packet.communities.map(c => ({ ...c, prio: assessCommunity(allRoutes.get(c.id), packet.hazards, packet.signals[c.id]).priority }));
  const community = communities.find(c => c.id === 'NK')!, routes = allRoutes.get(community.id)!;
  return createDecisionSnapshot({ packet, updated: false, community, communities,
    assessment: assessCommunity(routes, packet.hazards, packet.signals.NK), route: routes.candidate,
    roads: packet.roads, hazards: packet.hazards, evidence: packet.evidence });
}

describe('RFC 7946 decision export', () => {
  it('exports longitude/latitude, a counterclockwise closed AOI and distinct object IDs', () => {
    const source = snapshot(), result = decisionGeoJSON(source);
    const community = result.features.find(f => f.id === 'community:NK')!;
    expect(community.geometry.type).toBe('Point');
    if (community.geometry.type !== 'Point') throw new Error('Expected point');
    const [longitude, latitude] = community.geometry.coordinates;
    expect(longitude).toBeGreaterThan(103); expect(longitude).toBeLessThan(105);
    expect(latitude).toBeGreaterThan(20); expect(latitude).toBeLessThan(23);
    const area = result.features.find(f => f.id === `aoi:${source.aoi.id}`)!.geometry;
    if (area.type !== 'Polygon') throw new Error('Expected polygon');
    const ring = area.coordinates[0]; expect(ring[0]).toEqual(ring[ring.length - 1]);
    expect(ring.slice(0, -1).reduce((sum, p, i) => { const q = ring[i + 1]; return sum + p[0] * q[1] - q[0] * p[1]; }, 0)).toBeGreaterThan(0);
    expect(new Set(result.features.map(f => f.id)).size).toBe(result.features.length);
    expect(result).not.toHaveProperty('crs');
    expect(source.aoi.points[0].x).toBeGreaterThan(100000);
  });
  it('preserves conditional access, unverified H sites, evidence and data status', () => {
    const source = snapshot(), result = decisionGeoJSON(source);
    expect(result.metadata.dataKind).toBe('synthetic'); expect(result.metadata.reviewStatus).toBe('draft');
    expect(result.metadata.asOf).toBe(source.asOf);
    expect(result.features.find(f => f.id === `route:${source.route!.id}`)!.properties.status).toBe(source.route!.status);
    expect(result.features.filter(f => f.properties.siteType === 'hlz')[0].properties.assessment).toBe('candidate');
    expect(result.features.filter(f => f.properties.kind === 'hazard').some(f => (f.properties.evidence as unknown[]).length > 0)).toBe(true);
  });
});
