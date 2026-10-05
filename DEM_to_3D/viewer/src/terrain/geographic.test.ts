import { describe, expect, it } from 'vitest';
import type { LoadedModel, TerrainMetadata } from '../types/terrain';
import { createGeographicPlacements } from './geographic';
import { pairUploadedFiles, selectUploadedFiles } from './upload';

const metadata = (overrides: Partial<TerrainMetadata> = {}): TerrainMetadata => ({
  schema_version: 1,
  asset_id: 'tile-a',
  crs: { authority: 'EPSG', code: 32648, proj4: 'utm-a', linear_unit: 'metre' },
  scene_axes: { x: 'east', y: 'up', z: 'negative_north' },
  world_origin: { x: 1000, y: 2000 },
  grid: { file: 'tile-a.grid.bin', shape: [2, 2], shape_order: 'rows_cols', dtype: 'float32', byte_order: 'little_endian', layout: 'row_major', nodata_encoding: 'nan', elevation_unit: 'metre', sampling_method: 'nearest_subsample', source_step: 1, byte_length: 16 },
  grid_transform: { a: 1, b: 0, c: 999.5, d: 0, e: -1, f: 2000.5, convention: 'rasterio_affine', pixel_reference: 'center' },
  elevation: { base_elevation: 100, exaggeration: 2, normalize_base: true, min: 100, max: 200 },
  analysis_supported: true,
  mesh: { file: 'tile-a.glb', vertex_count: 3, triangle_count: 1 },
  ...overrides,
});

const model = (id: string, terrainMetadata: TerrainMetadata): LoadedModel => ({
  id,
  name: `${id}.glb`,
  gltf: { scene: {} } as LoadedModel['gltf'],
  metadata: terrainMetadata,
  objectUrls: [],
});

describe('geographic terrain placement', () => {
  it('preserves projected coordinates and real elevations in the reference scene', () => {
    const first = model('tile-a', metadata());
    const second = model('tile-b', metadata({
      asset_id: 'tile-b',
      world_origin: { x: 1250, y: 1640 },
      elevation: { base_elevation: 140, exaggeration: 4, normalize_base: true, min: 140, max: 240 },
      grid: { ...first.metadata!.grid, file: 'tile-b.grid.bin' },
      mesh: { ...first.metadata!.mesh!, file: 'tile-b.glb' },
    }));

    const placements = createGeographicPlacements([first, second]);

    expect(placements[0]).toMatchObject({ position: { x: 0, y: 0, z: 0 }, scaleY: 1 });
    expect(placements[1]).toMatchObject({ position: { x: 250, y: 80, z: 360 }, scaleY: 0.5 });
  });

  it('rejects a geographic merge when CRS identity or units differ', () => {
    const first = model('tile-a', metadata());
    expect(() => createGeographicPlacements([
      first,
      model('tile-b', metadata({ crs: { authority: 'EPSG', code: 32649, proj4: 'utm-b', linear_unit: 'metre' } })),
    ])).toThrow(/CRS/);
    expect(() => createGeographicPlacements([
      first,
      model('tile-c', metadata({ crs: { authority: 'EPSG', code: 32648, proj4: 'utm-a', linear_unit: 'degree' } })),
    ])).toThrow(/metre/);
  });

  it('requires terrain metadata for geographic placement', () => {
    const first = model('tile-a', metadata());
    expect(() => createGeographicPlacements([first, { ...model('tile-b', metadata()), metadata: undefined }])).toThrow(/metadata/);
  });
});

describe('uploaded terrain file pairing', () => {
  it('keeps the first model and matching sidecars in single-model mode', () => {
    const files = [new File(['{}'], 'south.terrain.json'), new File(['a'], 'north.glb'), new File(['b'], 'south.glb'), new File(['{}'], 'north.terrain.json'), new File(['grid'], 'north.grid.bin')];
    expect(selectUploadedFiles(files, 'single')).toEqual([files[1], files[3], files[4]]);
  });

  it('pairs model, terrain metadata, grid, and external glTF resources by basename', () => {
    const files = [
      new File(['glb'], 'north.glb'),
      new File(['{}'], 'north.terrain.json'),
      new File([new Uint8Array(16)], 'north.grid.bin'),
      new File(['buffer'], 'north.bin'),
      new File(['texture'], 'north.png'),
    ];

    const pairs = pairUploadedFiles(files);

    expect(pairs).toHaveLength(1);
    expect(pairs[0]).toMatchObject({ model: files[0], metadata: files[1], texture: files[4] });
    expect(pairs[0].resources).toEqual(expect.arrayContaining([files[3]]));
  });

  it('pairs a GeoTIFF texture sidecar by basename', () => {
    const files = [
      new File(['glb'], 'north.glb'),
      new File(['{}'], 'north.terrain.json'),
      new File(['tiff'], 'north.tif'),
    ];
    const pairs = pairUploadedFiles(files);
    expect(pairs[0].texture).toBe(files[2]);
    expect(pairs[0].resources).toEqual([]);
  });

  it('reports an unpaired model instead of guessing a geographic sidecar', () => {
    expect(() => pairUploadedFiles([new File(['glb'], 'north.glb'), new File(['{}'], 'south.terrain.json')])).toThrow(/north/);
  });
});
