import packetJson from '../../public/scenarios/che-tao/v0.3/incident.json';
import { validateIncidentPacket } from './incidentPacket';
import { buildNetworkRoutes } from '../features/routes/networkRouting';
import { assessCommunity } from '../features/incident/responseAssessment';
import type { Community, Hazard, IncidentEvidence, RoadSegment, ScenarioRoutePair } from '../types/dear';

/** Derived views of one prepared packet; tests also apply it to the network fixture. */
export function preparedScenario(json: unknown) {
  const preparedPacket = validateIncidentPacket(json);
  const staging = preparedPacket.responseSites.find(site => site.kind === 'staging')!;
  const baseline: Community[] = preparedPacket.communities.map(community => ({ ...community, prio: 2 }));
  const routes = buildNetworkRoutes(preparedPacket.roads, baseline, staging.projected, preparedPacket.routingAssumptions);
  const initialCommunities = baseline.map(community => ({
    ...community, prio: assessCommunity(routes.get(community.id), preparedPacket.hazards, preparedPacket.signals[community.id]).priority
  }));
  const { report } = preparedPacket;
  return {
    preparedPacket,
    cheTaoIncident: preparedPacket.incident,
    initialCommunitySignals: preparedPacket.signals,
    initialRoadSegments: preparedPacket.roads,
    initialHazards: preparedPacket.hazards,
    initialResponseSites: preparedPacket.responseSites,
    stagingPoint: { ...staging, commune: staging.name[0].replace(/^Điểm tập kết /, '') },
    initialCommunities,
    initialEvidence: preparedPacket.evidence,
    buildScenarioRoutes: (roads: RoadSegment[]): Map<string, ScenarioRoutePair> =>
      buildNetworkRoutes(roads, initialCommunities, staging.projected, preparedPacket.routingAssumptions),
    scenarioHazards: (updated: boolean): Hazard[] => preparedPacket.hazards.map(hazard => updated && hazard.id === report.hazard.id ? report.hazard : hazard),
    scenarioEvidence: (updated: boolean): IncidentEvidence[] =>
      preparedPacket.evidence.map(evidence => updated && evidence.hazardId === report.evidence.hazardId ? report.evidence : evidence)
  };
}

/** Compatibility exports for terrain tools. JSON is the sole prepared-data source. */
export const {
  preparedPacket, cheTaoIncident, initialCommunitySignals, initialRoadSegments, initialHazards, initialResponseSites,
  stagingPoint, initialCommunities, buildScenarioRoutes, scenarioHazards
} = preparedScenario(packetJson);
