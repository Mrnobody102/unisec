import { describe, expect, it } from 'vitest';
import { communityAccessText } from './accessAssessment';
import { buildScenarioRoutes, initialRoadSegments, scenarioHazards } from '../../data/cheTaoScenario';

describe('community access assessment', () => {
  it('keeps a blocked main road distinct from an unverified bypass', () => {
    expect(communityAccessText(buildScenarioRoutes(initialRoadSegments).get('NK'))[0]).toBe('Có tuyến bị chặn, tuyến khác cần xác minh');
  });
  it('limits blockage conclusions to the routes actually mapped', () => {
    const roads = initialRoadSegments.map(road => road.id === 'E13' ? { ...road, status: 'blocked' as const } : road);
    expect(communityAccessText(buildScenarioRoutes(roads).get('NK'))[0]).toBe('Các tuyến đã biết đều bị chặn');
  });
  it('does not infer isolation from missing route data', () => {
    expect(communityAccessText(undefined)[0]).toBe('Chưa có tuyến để đánh giá');
    expect(communityAccessText(buildScenarioRoutes(initialRoadSegments).get('PH'))[0]).toBe('Chưa có tuyến để đánh giá');
  });
  it('only identifies the crossing as a landslide after the debris report is applied', () => {
    expect(scenarioHazards(false).find(hazard => hazard.id === 'U-1')?.kind).toBe('crossing');
    expect(scenarioHazards(true).find(hazard => hazard.id === 'U-1')?.kind).toBe('landslide');
  });
});
