import packetJson from '../../public/scenarios/che-tao/v0.3/incident.json';
import { preparedScenario } from './cheTaoScenario';

export const { initialEvidence, scenarioEvidence } = preparedScenario(packetJson);
