import { describe, expect, it } from 'vitest';
import { areaM2, withinArea } from './areaGeometry';
import { preparedPacket } from '../data/cheTaoScenario';

describe('analysis area versus terrain footprint', () => {
  it('calculates the area independently of the DEM mask', () => {
    expect(areaM2(preparedPacket.aoi.points)).toBe(201250000);
    expect(withinArea({ x: 390999, y: 2400000 }, preparedPacket.aoi.points)).toBe(false);
    expect(withinArea({ x: 391000, y: 2400000 }, preparedPacket.aoi.points)).toBe(true);
  });
  it('includes all prepared communities, including Lao Mải outside the DEM', () => {
    expect(preparedPacket.communities.every(community => withinArea(community.projected, preparedPacket.aoi.points))).toBe(true);
  });
});
