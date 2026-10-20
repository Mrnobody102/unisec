import { describe, expect, it } from 'vitest';
import { mapSelectionFrame } from './mapSelectionFrame';
import { preparedPacket } from '../data/cheTaoScenario';

describe('map selection framing', () => {
  it('frames a landslide at a local scale in either renderer', () => {
    const hazard = preparedPacket.hazards[0];
    const points = mapSelectionFrame(preparedPacket, `hazard:${hazard.id}`);
    expect(points).toContain(hazard.projected);
    expect(Math.max(...points.map(p => p.x)) - Math.min(...points.map(p => p.x))).toBe(500);
    expect(Math.max(...points.map(p => p.y)) - Math.min(...points.map(p => p.y))).toBe(500);
  });
  it('uses full road and area geometry instead of a midpoint', () => {
    const road = preparedPacket.roads[0];
    expect(mapSelectionFrame(preparedPacket, `road:${road.id}`)).toEqual(road.points);
    expect(mapSelectionFrame(preparedPacket, `aoi:${preparedPacket.aoi.id}`)).toEqual(preparedPacket.aoi.points);
    expect(mapSelectionFrame(preparedPacket, 'hazard:missing')).toEqual([]);
  });
  it('only frames the entire route when explicitly requested', () => {
    const community = preparedPacket.communities[0];
    const road = preparedPacket.roads[0];
    expect(mapSelectionFrame(preparedPacket, `community:${community.id}`, road.points)).toEqual(road.points);
    expect(mapSelectionFrame(preparedPacket, `community:${community.id}`)).toContain(community.projected);
  });
});
