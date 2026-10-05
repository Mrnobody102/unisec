import { describe, expect, it } from 'vitest';
import { estimateTravel } from './travelEstimate';
import { preparedPacket, buildScenarioRoutes, initialRoadSegments } from '../../data/cheTaoScenario';

describe('conditional travel estimates', () => {
  it('uses scenario speed ranges and gives no execution estimate for a blocked route', () => {
    const routes = buildScenarioRoutes(initialRoadSegments);
    const nk = routes.get('NK')!;
    expect(estimateTravel(nk.direct!, preparedPacket.routingAssumptions)).toBeUndefined();
    expect(estimateTravel(nk.candidate!, preparedPacket.routingAssumptions)).toEqual({ mode: 'pickup', minMinutes: 40, maxMinutes: 85 });
  });
  it('uses a walking assumption for an unverified mountain track', () => {
    const route = buildScenarioRoutes(initialRoadSegments).get('LM')!.candidate!;
    expect(estimateTravel(route, preparedPacket.routingAssumptions)?.mode).toBe('foot');
  });
});
