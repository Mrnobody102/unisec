import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import proj4 from 'proj4';
import metadataJson from '../../public/terrain/che_tao_v2_tex.terrain.json';
import { validateMetadata } from './validation';
import { pixelToProjected, sceneToProjected } from './coordinate';
import { createRegionalBasemap, planRegionalTiles, tileLonLat, tileScenePoint, type BasemapState } from './regionalBasemap';

const metadata = validateMetadata(metadataJson);
describe('Regional basemap placement', () => {
  it('uses Web Mercator tile coordinates with north at the top', () => {
    expect(tileLonLat(1, 1, 1)).toEqual([0, 0]);
    const [lon, lat] = tileLonLat(0, 0, 0);
    expect(lon).toBe(-180);
    expect(lat).toBeCloseTo(85.05112878);
  });
  it.each([false, true])('bounds tile requests and covers all DEM corners (rotated grid=%s)', rotated => {
    const terrain = rotated ? { ...metadata, grid_transform: { ...metadata.grid_transform, b: -20, d: -20 } } : metadata;
    const tiles = planRegionalTiles(terrain);
    expect(tiles.length).toBeGreaterThan(0);
    expect(tiles.length).toBeLessThanOrEqual(64);
    for (const col of [0, terrain.grid.shape[1] - 1]) for (const row of [0, terrain.grid.shape[0] - 1]) {
      const p = pixelToProjected(terrain, col, row);
      const [lon, lat] = proj4(terrain.crs.proj4!, 'EPSG:4326', [p.x, p.y]);
      expect(tiles.some(tile => {
        const nw = tileLonLat(tile.x, tile.y, tile.z), se = tileLonLat(tile.x + 1, tile.y + 1, tile.z);
        return lon >= nw[0] && lon <= se[0] && lat <= nw[1] && lat >= se[1];
      })).toBe(true);
    }
  });
  it('reprojects tiles into the DEM frame without gaps along shared edges', () => {
    const tile = planRegionalTiles(metadata)[0];
    const point = tileScenePoint(metadata, tile, .5, .5);
    const converted = sceneToProjected(metadata, point);
    const expected = proj4('EPSG:4326', metadata.crs.proj4!, tileLonLat(tile.x + .5, tile.y + .5, tile.z));
    expect(converted.projected.x).toBeCloseTo(expected[0], 6);
    expect(converted.projected.y).toBeCloseTo(expected[1], 6);
    expect(converted.elevation).toBeCloseTo(metadata.elevation.base_elevation - 20);
    for (const v of [0, .25, .5, .75, 1]) {
      const left = tileScenePoint(metadata, tile, 1, v);
      const right = tileScenePoint(metadata, { ...tile, x: tile.x + 1 }, 0, v);
      expect(left.distanceTo(right)).toBeLessThan(.000001);
    }
  });
  it('rejects unprojected terrain rather than placing tiles in the wrong location', () => {
    expect(() => planRegionalTiles({ ...metadata, crs: { authority: 'EPSG', code: 4326, linear_unit: 'degree' } })).toThrow('metric');
  });
  it('stops requesting tiles when the service is unavailable', async () => {
    vi.stubGlobal('window', globalThis);
    const fetchMock = vi.fn(async () => { throw new Error('offline'); });
    vi.stubGlobal('fetch', fetchMock);
    const states: BasemapState[] = [];
    const basemap = createRegionalBasemap(metadata, new THREE.Matrix4(), state => states.push(state));
    try {
      basemap.setOptions(true, 'satellite');
      await vi.waitFor(() => expect(states.at(-1)?.status).toBe('error'), { timeout: 1000 });
      expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(4);
      expect(fetchMock.mock.calls.length).toBeLessThanOrEqual(7);
    } finally {
      basemap.dispose();
      vi.unstubAllGlobals();
    }
  });
});
