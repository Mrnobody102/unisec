import { describe, expect, it } from 'vitest';
import { createSurfaceProfile, fillNodataGaps, type ProfileSample } from './profile';
import type { TerrainTile } from './analysisTerrain';
import type { TerrainMetadata } from '../types/terrain';

const metadata: TerrainMetadata = {
  schema_version: 1,
  asset_id: 'profile-test',
  crs: { authority: 'EPSG', code: 32648, proj4: '+proj=utm +zone=48 +datum=WGS84 +units=m +no_defs', linear_unit: 'metre' },
  scene_axes: { x: 'east', y: 'up', z: 'negative_north' },
  world_origin: { x: 0, y: 0 },
  grid: { file: 'terrain.grid.bin', shape: [3, 3], shape_order: 'rows_cols', dtype: 'float32', byte_order: 'little_endian', layout: 'row_major', nodata_encoding: 'nan', elevation_unit: 'metre', sampling_method: 'nearest_subsample', source_step: 1, byte_length: 36 },
  grid_transform: { a: 10, b: 0, c: 0, d: 0, e: -10, f: 30, convention: 'rasterio_affine', pixel_reference: 'center' },
  elevation: { base_elevation: 0, exaggeration: 1, normalize_base: false, min: 0, max: 100 },
  analysis_supported: true,
};

describe('createSurfaceProfile', () => {
  it('samples a projected line at an even interval and reports projected length and azimuth', () => {
    const grid = new Float32Array([
      0, 10, 20,
      10, 20, 30,
      20, 30, 40,
    ]);

    const profile = createSurfaceProfile(grid, metadata, { x: 5, y: 25 }, { x: 25, y: 5 }, 10);

    expect(profile.length).toBeCloseTo(28.284271, 5);
    expect(profile.azimuth).toBeCloseTo(135, 6);
    expect(profile.samples.map((sample) => sample.distance)).toEqual([0, 10, 20, 28.284271247461902]);
    expect(profile.samples.map((sample) => sample.elevation)).toEqual([0, 14.14213562373095, 28.284271247461902, 40]);
    expect(profile.segments).toEqual([[0, 1, 2, 3]]);
  });

  it('marks a bilinear neighborhood containing NaN as nodata but bridges the gap with interpolated samples', () => {
    const grid = new Float32Array([
      0, 10, 20,
      10, Number.NaN, 30,
      20, 30, 40,
    ]);

    const profile = createSurfaceProfile(grid, metadata, { x: 5, y: 25 }, { x: 25, y: 5 }, 10);

    // Raw nodata runs are gap-filled so the line stays connected…
    expect(profile.samples.every((sample) => sample.elevation !== undefined)).toBe(true);
    expect(profile.segments).toEqual([[0, 1, 2, 3]]);
    // …but the bridged samples are flagged for distinct rendering.
    expect(profile.samples.map((sample) => Boolean(sample.gapFilled))).toEqual([false, true, true, false]);
    expect(profile.samples[0]!.elevation).toBe(0);
    expect(profile.samples[3]!.elevation).toBe(40);
    expect(profile.samples[1]!.elevation).toBeGreaterThan(0);
    expect(profile.samples[1]!.elevation).toBeLessThan(40);
  });

  it('keeps an edge pixel valid when only zero-weight neighbors are nodata', () => {
    const grid = new Float32Array([0, Number.NaN, 20, 10, 20, 30, 20, 30, 40]);
    const profile = createSurfaceProfile(grid, metadata, { x: 5, y: 25 }, { x: 5, y: 25 }, 10);
    expect(profile.samples[0].elevation).toBe(0);
  });

  it('marks samples outside the pixel-center grid domain as nodata instead of clamping them to the edge, then bridges from the nearest valid sample', () => {
    const grid = new Float32Array([0, 10, 20, 10, 20, 30, 20, 30, 40]);
    const profile = createSurfaceProfile(grid, metadata, { x: 26, y: 15 }, { x: 26, y: 15 }, 10);
    expect(profile.samples[0].elevation).toBeUndefined();
    expect(profile.samples[0].gapFilled).toBeUndefined();
  });
});

describe('fillNodataGaps', () => {
  const sample = (index: number, distance: number, elevation?: number): ProfileSample => ({ index, distance, projected: { x: 0, y: 0 }, elevation });

  it('linearly interpolates interior nodata runs between the nearest valid samples', () => {
    const filled = fillNodataGaps([sample(0, 0, 10), sample(1, 10, undefined), sample(2, 20, undefined), sample(3, 30, 20)]);
    expect(filled.map((s) => s.elevation?.toFixed(6))).toEqual(['10.000000', '13.333333', '16.666667', '20.000000']);
    expect(filled.map((s) => Boolean(s.gapFilled))).toEqual([false, true, true, false]);
  });

  it('holds the nearest valid elevation for nodata runs touching the line ends', () => {
    const filled = fillNodataGaps([sample(0, 0, undefined), sample(1, 10, undefined), sample(2, 20, 30), sample(3, 30, 40)]);
    expect(filled.map((s) => s.elevation)).toEqual([30, 30, 30, 40]);
    expect(filled.map((s) => Boolean(s.gapFilled))).toEqual([true, true, false, false]);
  });

  it('leaves an all-nodata line untouched', () => {
    const filled = fillNodataGaps([sample(0, 0, undefined), sample(1, 10, undefined)]);
    expect(filled.map((s) => s.elevation)).toEqual([undefined, undefined]);
    expect(filled.map((s) => Boolean(s.gapFilled))).toEqual([false, false]);
  });
});

describe('createSurfaceProfile with multiple tiles', () => {
  // Two 3x3 grids, 10 m cells, side by side along x:
  // tile A covers x ∈ [-5, 25], tile B covers x ∈ [25, 55] (pixel-center domains overlap at the seam).
  const metadataA: TerrainMetadata = { ...metadata, asset_id: 'tile-a', grid_transform: { ...metadata.grid_transform, a: 10, b: 0, c: 0, d: 0, e: -10, f: 30 } };
  const metadataB: TerrainMetadata = { ...metadata, asset_id: 'tile-b', grid_transform: { ...metadata.grid_transform, a: 10, b: 0, c: 30, d: 0, e: -10, f: 30 } };

  it('samples a line crossing from one tile into an adjacent tile without nodata gaps', () => {
    const gridA = new Float32Array([0, 10, 20, 10, 20, 30, 20, 30, 40]);
    const gridB = new Float32Array([30, 40, 50, 40, 50, 60, 50, 60, 70]);
    const tiles: TerrainTile[] = [
      { metadata: metadataA, grid: gridA },
      { metadata: metadataB, grid: gridB },
    ];

    const profile = createSurfaceProfile(tiles, metadataA, { x: 5, y: 15 }, { x: 45, y: 15 }, 10);

    expect(profile.length).toBeCloseTo(40, 6);
    expect(profile.samples.every((sample) => sample.elevation !== undefined)).toBe(true);
    expect(profile.segments).toHaveLength(1);
    // Start (x=5) sits in tile A, end (x=45) sits in tile B — the crossing must be covered.
    expect(profile.samples[0]!.elevation).toBeCloseTo(10, 5);
    expect(profile.samples[profile.samples.length - 1]!.elevation).toBeCloseTo(50, 5);
  });

  it('returns nodata for samples outside every tile domain', () => {
    const tiles: TerrainTile[] = [
      { metadata: metadataA, grid: new Float32Array(9) },
      { metadata: metadataB, grid: new Float32Array(9) },
    ];

    const profile = createSurfaceProfile(tiles, metadataA, { x: 100, y: 15 }, { x: 100, y: 15 }, 10);

    expect(profile.samples[0].elevation).toBeUndefined();
    expect(profile.segments).toEqual([]);
  });
});
