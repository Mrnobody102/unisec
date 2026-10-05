import { describe, expect, it } from 'vitest';
import { routeNextAction, selectAccessRoute } from './routeReview';
import { buildScenarioRoutes, initialRoadSegments, initialHazards } from '../../data/cheTaoScenario';

const routes = buildScenarioRoutes(initialRoadSegments);
describe('selected route review', () => {
  it('selects the available geometry even for a direct-only response', () => {
    const direct = routes.get('NK')!.direct!;
    expect(selectAccessRoute({ direct, candidate: null }, 'candidate')).toBe(direct);
    expect(selectAccessRoute({ direct: null, candidate: direct }, 'direct')).toBe(direct);
    expect(selectAccessRoute(null, 'candidate')).toBeNull();
  });
  it('gives a specific crossing and bridge inspection instead of a generic action', () => {
    expect(routeNextAction(routes.get('NK')!.candidate, initialHazards)[0]).toContain('điểm vượt khe');
    expect(routeNextAction(routes.get('KM')!.candidate, initialHazards)[0]).toContain('qua cầu');
  });
  it('prohibits using a blocked selection even when another route is available', () => {
    expect(routeNextAction(routes.get('NK')!.direct, initialHazards)[0]).toContain('Không sử dụng');
  });
  it('does not inherit another route’s uncertainty when reviewing a route with no reported blockage', () => {
    const route = routes.get('NK')!.candidate!;
    expect(routeNextAction({ ...route, status: 'open', segs: route.segs.map(road => ({ ...road, status: 'open' })) }, initialHazards)[0]).toBe('Xác minh khả năng đi qua toàn tuyến');
  });
});
