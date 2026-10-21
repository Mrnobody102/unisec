import packetJson from './che-tao-network.json';
import { preparedScenario } from '../cheTaoScenario';

/** Richer road network (bypass, bridge, gully crossing) kept as a routing test fixture. */
export const scenario = preparedScenario(packetJson);
export const {
  preparedPacket, cheTaoIncident, initialCommunitySignals, initialRoadSegments, initialHazards, initialResponseSites,
  stagingPoint, initialCommunities, buildScenarioRoutes, scenarioHazards, initialEvidence, scenarioEvidence
} = scenario;
export { packetJson };
