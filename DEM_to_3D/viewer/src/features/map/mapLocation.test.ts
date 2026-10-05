import { describe, expect, it } from 'vitest';
import type { TerrainData, TerrainMetadata } from '../../types/terrain';
import { readMapLocation, readTerrainLocation } from './mapLocation';

const metadata = {
  crs: { authority: 'EPSG', code: 32648, proj4: '+proj=utm +zone=48 +datum=WGS84 +units=m +no_defs' },
  grid: { shape: [2, 2] }, grid_transform: { a: 1, b: 0, c: 499999, d: 0, e: -1, f: 1 },
  world_origin: { x: 500000, y: 0 }, elevation: { base_elevation: 10, exaggeration: 5 }
} as TerrainMetadata;
const terrain: TerrainData = { metadata, grid: new Float32Array([10, 20, 30, 40]), gridBuffer: new ArrayBuffer(16) };

describe('map location', () => {
  it('reads UTM coordinates and physical elevation independently of display exaggeration', () => {
    const point = readMapLocation(0, 105, terrain);
    expect(point.projected!.x).toBeCloseTo(500000, 5);
    expect(point.projected!.y).toBeCloseTo(0, 5);
    expect(point.elevation).toBeCloseTo(25, 5);
    expect(point.scene!.y).toBeCloseTo(75, 5);
  });
  it('retains coordinates outside DEM coverage without inventing a height', () => {
    const point = readMapLocation(20, 105, terrain);
    expect(point.latitude).toBe(20);
    expect(point.projected).toBeDefined();
    expect(point.elevation).toBeUndefined();
    expect(point.scene).toBeUndefined();
    expect(readMapLocation(20, 105, null)).toEqual({ latitude: 20, longitude: 105 });
  });
  it('uses the picked 3D model CRS for geographic coordinates', () => {
    const point = readTerrainLocation({ projected: { x: 500000, y: 0 }, scene: { x: 0, y: 75, z: 0 }, elevation: 25, row: 0, column: 0, interpolated: true }, metadata)!;
    expect(point.latitude).toBeCloseTo(0, 6);
    expect(point.longitude).toBeCloseTo(105, 6);
    expect(point.elevation).toBe(25);
  });
});
