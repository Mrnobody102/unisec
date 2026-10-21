import { describe, expect, it } from 'vitest';
import { areaM2, withinArea } from './areaGeometry';
import { preparedPacket } from '../data/cheTaoScenario';

describe('analysis area versus terrain footprint', () => {
  it('calculates the area independently of the DEM mask', () => {
    expect(areaM2(preparedPacket.aoi.points)).toBe(127680000);
    expect(withinArea({ x: 398299, y: 2405000 }, preparedPacket.aoi.points)).toBe(false);
    expect(withinArea({ x: 398300, y: 2405000 }, preparedPacket.aoi.points)).toBe(true);
  });
  it('includes all prepared communities, including Lao Mải outside the DEM', () => {
    expect(preparedPacket.communities.every(community => withinArea(community.projected, preparedPacket.aoi.points))).toBe(true);
  });
});
