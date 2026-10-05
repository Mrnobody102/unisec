import { describe, expect, it } from 'vitest';
import { selectVerticesAlongLine, vertexTolerance, type ProjectedVertex } from './vertex';
import type { TerrainMetadata } from '../types/terrain';

const metadata: TerrainMetadata = {
  schema_version: 1,
  asset_id: 'vertex-test',
  crs: { authority: 'EPSG', code: 32648, proj4: '+proj=utm +zone=48 +datum=WGS84 +units=m +no_defs', linear_unit: 'metre' },
  scene_axes: { x: 'east', y: 'up', z: 'negative_north' },
  world_origin: { x: 0, y: 0 },
  grid: { file: 'terrain.grid.bin', shape: [3, 3], shape_order: 'rows_cols', dtype: 'float32', byte_order: 'little_endian', layout: 'row_major', nodata_encoding: 'nan', elevation_unit: 'metre', sampling_method: 'nearest_subsample', source_step: 2, byte_length: 36 },
  grid_transform: { a: 10, b: 0, c: 0, d: 0, e: -10, f: 30, convention: 'rasterio_affine', pixel_reference: 'center' },
  elevation: { base_elevation: 100, exaggeration: 2, normalize_base: true, min: 100, max: 200 },
  analysis_supported: true,
};

const v = (id: string, x: number, y: number, elevation = 120): ProjectedVertex => ({ id, projected: { x, y }, elevation });

describe('selectVerticesAlongLine', () => {
  it('uses affine cell size for tolerance, clips to the segment, sorts, and deduplicates', () => {
    const selected = selectVerticesAlongLine(
      [v('late', 20.2, 9.8), v('off', 15, 26), v('first', 5, 25), v('duplicate', 5.0000001, 24.9999999), v('middle', 15, 15)],
      { x: 5, y: 25 },
      { x: 25, y: 5 },
      metadata,
    );

    expect(vertexTolerance(metadata)).toBeCloseTo(7.0710678119, 8);
    expect(selected.map((item) => item.id)).toEqual(['first', 'middle', 'late']);
    expect(selected[0].distance).toBe(0);
    expect(selected[1].distance).toBeCloseTo(14.14213562373095, 12);
    expect(selected[2].distance).toBeCloseTo(21.49604614807104, 12);
    expect(selected[0].row).toBe(0);
    expect(selected[0].column).toBe(0);
  });
});
