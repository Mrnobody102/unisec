import { expect, it } from 'vitest';
import { planLocalTileWindow } from './localTileImagery';
import { validateTilePyramidMetadata } from './tileMetadata';
import { collectTileFiles, loadTilePackage, validateUploadedTileInventory } from './tileUpload';
import { pairUploadedFiles } from './upload';
import type { TerrainMetadata } from '../types/terrain';

const metadata = {
  schema_version: 1, asset_id: 'model', format: 'webp', quality: 88, tile_size: 8, gutter_px: 2, min_zoom: 0, max_zoom: 1,
  bounds_projected: { min_x: 0, min_y: 0, max_x: 16, max_y: 16 }, crs: { authority: 'EPSG', code: 32648, linear_unit: 'metre' },
  orientation: { origin: 'top_left', x: 'east', y: 'north_to_south' }, source: 'source.tif',
  levels: [ { zoom: 0, width_px: 8, height_px: 8, columns: 1, rows: 1, pixel_size_x: 2, pixel_size_y: 2 }, { zoom: 1, width_px: 16, height_px: 16, columns: 2, rows: 2, pixel_size_x: 1, pixel_size_y: 1 } ]
};
const validated = () => validateTilePyramidMetadata(structuredClone(metadata));
const file = (path: string, content = '') => Object.assign(new File([content], path.split('/').at(-1)!), { webkitRelativePath: path });
const inventory = () => new Map(['z0/0_0.webp', 'z1/0_0.webp', 'z1/0_1.webp', 'z1/1_0.webp', 'z1/1_1.webp'].map(path => [path, file(`package/model_tiles/${path}`)]));

it('selects a complete coarser window when full detail exceeds the atlas budget', () => {
  expect(planLocalTileWindow(validated(), [{x:0,y:0},{x:16,y:16}], 8)).toEqual({ zoom: 0, column: 0, row: 0, columns: 1, rows: 1 });
  expect(planLocalTileWindow(validated(), [{x:2,y:10},{x:6,y:14}], 8)).toEqual({ zoom: 1, column: 0, row: 0, columns: 1, rows: 1 });
  expect(planLocalTileWindow(validated(), [{x:18,y:18},{x:20,y:20}], 16)).toBeNull();
  expect(planLocalTileWindow(validated(), [{x:NaN,y:0}], 16)).toBeNull();
});

it('rejects malformed dimensions, CRS and physical pixel spacing before allocating an atlas', () => {
  for (const change of [{ tile_size: 100000 }, { gutter_px: -1 }, { max_zoom: 100000 }, { levels: null }, { crs: [] }]) expect(() => validateTilePyramidMetadata({...metadata,...change})).toThrow();
  const wrong = structuredClone(metadata); wrong.levels[1].pixel_size_x = -1;
  expect(() => validateTilePyramidMetadata(wrong)).toThrow();
  wrong.levels[1].pixel_size_x = 5;
  expect(() => validateTilePyramidMetadata(wrong)).toThrow();
});

it('keeps nested model packages separate and rejects duplicate and unsafe tile paths', () => {
  const tiles = [...inventory().values()];
  expect(collectTileFiles(tiles, 'model.glb').size).toBe(5);
  expect(collectTileFiles(tiles, 'other.glb').size).toBe(0);
  expect(() => collectTileFiles([...tiles, tiles[0]], 'model.glb')).toThrow('Duplicate');
  expect(() => collectTileFiles([file('package/model_tiles/../z0/0_0.webp')], 'model.glb')).toThrow('Unsafe');
  const pairs = pairUploadedFiles([file('package/model.glb'), file('package/model.tiles.json'), ...tiles]);
  expect(pairs[0].texture).toBeUndefined(); expect(pairs[0].resources).toEqual([]); expect(pairs[0].tiles?.files.size).toBe(5);
  expect(() => pairUploadedFiles([file('model.glb'), file('other.tiles.json')])).toThrow('Sidecar');
  expect(() => validateUploadedTileInventory(validated(), new Map([['z00/0_0.webp', file('preview.webp')]]))).toThrow('Noncanonical');
});

it('requires complete tile inventories and the same coordinate system as the model', async () => {
  const tiles = inventory(); validateUploadedTileInventory(validated(), tiles);
  tiles.delete('z1/1_1.webp'); expect(() => validateUploadedTileInventory(validated(), tiles)).toThrow('incomplete');
  const terrain = { crs: { authority: 'EPSG', code: 32648 } } as TerrainMetadata;
  const sidecar = file('model.tiles.json', JSON.stringify(metadata));
  await expect(loadTilePackage(sidecar, inventory(), 'model.glb', terrain)).resolves.toMatchObject({asset_id:'model'});
  await expect(loadTilePackage(sidecar, inventory(), 'other.glb', terrain)).rejects.toThrow('asset_id');
  await expect(loadTilePackage(sidecar, inventory(), 'model.glb')).rejects.toThrow('coordinate');
});
