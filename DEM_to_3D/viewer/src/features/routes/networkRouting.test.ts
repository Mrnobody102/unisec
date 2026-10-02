import { describe, expect, it } from 'vitest';
import { buildNetworkRoutes } from './networkRouting';
import { initialCommunities, initialRoadSegments, stagingPoint } from '../../data/cheTaoScenario';
import type { RoadSegment } from '../../types/dear';

describe('network-derived access options', () => {
  it('avoids a blocked main road and preserves an uncertain bypass', () => {
    const pair = buildNetworkRoutes(initialRoadSegments, initialCommunities, stagingPoint.projected).get('NK')!;
    expect(pair.direct?.segs.map(road => road.id)).toEqual(['E1', 'E8', 'E9']);
    expect(pair.candidate?.segs.map(road => road.id)).toEqual(['E12', 'E13', 'E14']);
    expect(pair.candidate?.status).toBe('uncertain');
    expect(pair.direct?.name[0]).toBe('Đường chính vào Nậm Khắt');
    expect(pair.candidate?.name[0]).toBe('Đường vòng qua sườn núi');
  });
  it('recalculates from an added network connection without predefined route IDs', () => {
    const destination = initialCommunities.find(community => community.id === 'NK')!;
    const extra: RoadSegment = { id: 'new-road', name: ['Test', 'Test'], cls: 'secondary', len: 1,
      status: 'open', points: [stagingPoint.projected, { x: 409000, y: 2405000 }, destination.projected] };
    const pair = buildNetworkRoutes([...initialRoadSegments, extra], initialCommunities, stagingPoint.projected).get('NK')!;
    expect(pair.candidate?.segs.map(road => road.id)).toEqual(['new-road']);
    expect(pair.candidate?.status).toBe('open');
  });
  it('retains blocked options for inspection without claiming an open route', () => {
    const roads = initialRoadSegments.map(road => road.id === 'E13' ? { ...road, status: 'blocked' as const } : road);
    const pair = buildNetworkRoutes(roads, initialCommunities, stagingPoint.projected).get('NK')!;
    expect(pair.direct?.status).toBe('blocked'); expect(pair.candidate?.status).toBe('blocked');
  });
  it('selects the shorter main path when the blockage is cleared', () => {
    const roads = initialRoadSegments.map(road => road.id === 'E8' ? { ...road, status: 'open' as const } : road);
    const pair = buildNetworkRoutes(roads, initialCommunities, stagingPoint.projected).get('NK')!;
    expect(pair.candidate?.segs.map(road => road.id)).toEqual(['E1', 'E8', 'E9']);
    expect(pair.direct).toBeNull();
  });
  it('orients reversed edges and never invents missing connections', () => {
    const roads = initialRoadSegments.map(road => ({ ...road, points: [...road.points].reverse() }));
    const routes = buildNetworkRoutes(roads, initialCommunities, stagingPoint.projected);
    expect(routes.get('NK')?.candidate?.points[0]).toEqual(stagingPoint.projected);
    expect(routes.get('NK')?.candidate?.points.at(-1)).toEqual(initialCommunities[0].projected);
    expect(routes.get('PH')).toEqual({ direct: null, candidate: null });
    expect(buildNetworkRoutes(roads.filter(road => road.id !== 'E3'), initialCommunities, stagingPoint.projected).get('KM'))
      .toEqual({ direct: null, candidate: null });
  });
});
