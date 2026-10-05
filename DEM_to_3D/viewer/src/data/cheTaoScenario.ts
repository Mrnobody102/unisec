import packetJson from '../../public/scenarios/che-tao/v0.2/incident.json';
import { validateIncidentPacket } from './incidentPacket';
import { buildNetworkRoutes } from '../features/routes/networkRouting';
import { assessCommunity } from '../features/incident/responseAssessment';
import type { Community, Hazard, RoadSegment, ScenarioRoutePair } from '../types/dear';

/** Compatibility exports for terrain tools. JSON is the sole prepared-data source. */
export const preparedPacket = validateIncidentPacket(packetJson);
export const cheTaoIncident = preparedPacket.incident;
export const initialCommunitySignals = preparedPacket.signals;
export const initialRoadSegments = preparedPacket.roads;
export const initialHazards = preparedPacket.hazards;
export const initialResponseSites = preparedPacket.responseSites;
const staging = initialResponseSites.find(site => site.kind === 'staging')!;
export const stagingPoint = { ...staging, commune: 'Nậm Kha' };
const baseline: Community[] = preparedPacket.communities.map(community => ({ ...community, prio: 2 }));
const routes = buildNetworkRoutes(initialRoadSegments, baseline, staging.projected);
export const initialCommunities = baseline.map(community => ({
  ...community, prio: assessCommunity(routes.get(community.id), initialHazards, initialCommunitySignals[community.id]).priority
}));
export function buildScenarioRoutes(roads: RoadSegment[]): Map<string, ScenarioRoutePair> {
  return buildNetworkRoutes(roads, initialCommunities, staging.projected);
}
export function scenarioHazards(updated: boolean): Hazard[] {
  return initialHazards.map(hazard => updated && hazard.id === preparedPacket.report.hazard.id ? preparedPacket.report.hazard : hazard);
}
