import { describe, expect, it } from 'vitest';
import { estimateTravel } from './travelEstimate';
import { preparedPacket, buildScenarioRoutes, initialRoadSegments } from '../../data/fixtures/networkScenario';

describe('conditional travel estimates', () => {
  it('walks the footpath bypass at scenario speeds and gives no estimate for a blocked route', () => {
    const routes = buildScenarioRoutes(initialRoadSegments);
    const nk = routes.get('NK')!;
    expect(estimateTravel(nk.direct!, preparedPacket.routingAssumptions)).toBeUndefined();
    expect(estimateTravel(nk.candidate!, preparedPacket.routingAssumptions)).toEqual({ mode: 'foot', minMinutes: 170, maxMinutes: 290 });
  });
  it('uses a walking assumption for an unverified mountain track', () => {
    const route = buildScenarioRoutes(initialRoadSegments).get('LM')!.candidate!;
    expect(estimateTravel(route, preparedPacket.routingAssumptions)?.mode).toBe('foot');
  });
});
