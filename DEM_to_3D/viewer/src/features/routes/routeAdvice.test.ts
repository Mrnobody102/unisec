import { describe, expect, it } from 'vitest';
import { recommendRoute, routeProblems } from './routeAdvice';
import { buildScenarioRoutes, initialRoadSegments } from '../../data/fixtures/networkScenario';

describe('resident route advice', () => {
  it('recommends the bypass when the main road is blocked and names the avoided road', () => {
    const { best, avoided } = recommendRoute(buildScenarioRoutes(initialRoadSegments).get('NK'));
    expect(best?.type).toBe('candidate');
    expect(avoided?.status).toBe('blocked');
    expect(routeProblems(best!).every(road => road.status !== 'open')).toBe(true);
  });
  it('still answers when every mapped route is blocked, without inventing an alternative', () => {
    const roads = initialRoadSegments.map(road => road.id === 'E13' ? { ...road, status: 'blocked' as const } : road);
    const { best, avoided } = recommendRoute(buildScenarioRoutes(roads).get('NK'));
    expect(best?.status).toBe('blocked');
    expect(avoided).toBeNull();
  });
  it('returns nothing when no route is mapped', () => {
    expect(recommendRoute(undefined)).toEqual({ best: null, avoided: null });
  });
});
