import { describe, expect, it } from 'vitest';
import { selectAnalysisTerrain } from './analysisTerrain';
import type { LoadedModel, TerrainMetadata } from '../types/terrain';

const metadata: TerrainMetadata = {
  schema_version: 1,
  asset_id: 'analysis-test',
  crs: { authority: 'EPSG', code: 32648, proj4: '+proj=utm +zone=48 +datum=WGS84 +units=m +no_defs', linear_unit: 'metre' },
  scene_axes: { x: 'east', y: 'up', z: 'negative_north' },
  world_origin: { x: 0, y: 0 },
  grid: { file: 'analysis.grid.bin', shape: [1, 1], shape_order: 'rows_cols', dtype: 'float32', byte_order: 'little_endian', layout: 'row_major', nodata_encoding: 'nan', elevation_unit: 'metre', sampling_method: 'nearest_subsample', source_step: 1, byte_length: 4 },
  grid_transform: { a: 1, b: 0, c: 0, d: 0, e: -1, f: 1, convention: 'rasterio_affine', pixel_reference: 'center' },
  elevation: { base_elevation: 0, exaggeration: 1, normalize_base: false, min: 0, max: 1 },
  analysis_supported: true,
};

function model(overrides: Partial<LoadedModel>): LoadedModel {
  return { id: 'model', name: 'model.glb', gltf: null as never, objectUrls: [], ...overrides };
}

describe('selectAnalysisTerrain', () => {
  it('keeps profile analysis available when multiple uploaded models include a terrain asset', () => {
    const visualOnly = model({ id: 'visual-only' });
    const analyzable = model({ id: 'terrain', metadata, grid: new Float32Array([1]), gridBuffer: new ArrayBuffer(4) });

    expect(selectAnalysisTerrain([visualOnly, analyzable])).toMatchObject({ metadata, grid: analyzable.grid, gridBuffer: analyzable.gridBuffer, gltf: analyzable.gltf });
  });

  it('returns no analysis terrain when uploaded models have no metadata and grid', () => {
    expect(selectAnalysisTerrain([model({})])).toBeNull();
  });

  it('builds a composite tile list from all analyzable models sharing the reference CRS', () => {
    const first = model({ id: 'first', metadata, grid: new Float32Array([1]), gridBuffer: new ArrayBuffer(4) });
    const second = model({ id: 'second', metadata: { ...metadata, asset_id: 'analysis-second' }, grid: new Float32Array([2]), gridBuffer: new ArrayBuffer(4) });

    const result = selectAnalysisTerrain([first, second]);

    expect(result?.tiles).toHaveLength(2);
    expect(result?.tiles[0].metadata.asset_id).toBe('analysis-test');
    expect(result?.tiles[1].metadata.asset_id).toBe('analysis-second');
  });

  it('excludes tiles whose CRS does not match the reference', () => {
    const first = model({ id: 'first', metadata, grid: new Float32Array([1]), gridBuffer: new ArrayBuffer(4) });
    const otherCrs = model({ id: 'other-crs', metadata: { ...metadata, asset_id: 'other-crs', crs: { ...metadata.crs, code: 32649 } }, grid: new Float32Array([2]), gridBuffer: new ArrayBuffer(4) });

    const result = selectAnalysisTerrain([first, otherCrs]);

    expect(result?.tiles).toHaveLength(1);
    expect(result?.tiles[0].metadata.asset_id).toBe('analysis-test');
  });
});
