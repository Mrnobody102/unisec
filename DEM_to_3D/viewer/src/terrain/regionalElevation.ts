import proj4 from 'proj4';
import type { TerrainMetadata } from '../types/terrain';
import type { MapTile } from './regionalBasemap';
import { bilinearElevation } from './elevationGrid';

export type ElevationTile = MapTile & { heights: Float32Array };
export type ElevationSurface = { metadata: TerrainMetadata; grid: Float32Array };
export type ContextReliefStatus = 'loading' | 'ready' | 'partial' | 'error';
const cache = new Map<string, ElevationTile>();
const tileKey = (tile: MapTile) => `${tile.z}/${tile.x}/${tile.y}`;

/** Terrarium metres, with transparent/invalid samples kept as NoData. */
export function decodeTerrarium(rgba: Uint8ClampedArray): Float32Array {
  const heights = new Float32Array(rgba.length / 4);
  for (let i = 0; i < heights.length; i++) {
    const p = i * 4;
    const elevation = rgba[p] * 256 + rgba[p + 1] + rgba[p + 2] / 256 - 32768;
    heights[i] = rgba[p + 3] && elevation >= -11000 && elevation <= 9000 ? elevation : NaN;
  }
  return heights;
}

/** Pixel-centre sampling across tile boundaries; absent neighbours stay unknown. */
export function sampleElevationTiles(tiles: Map<string, ElevationTile>, zoom: number, lon: number, lat: number): number | undefined {
  const n = 2 ** zoom, phi = Math.max(-85.0511, Math.min(85.0511, lat)) * Math.PI / 180;
  const x = (lon + 180) / 360 * n * 256 - .5;
  const y = (1 - Math.asinh(Math.tan(phi)) / Math.PI) / 2 * n * 256 - .5;
  const ix = Math.floor(x), iy = Math.floor(y), dx = x - ix, dy = y - iy;
  let height = 0;
  for (const [ox, oy, weight] of [[0, 0, (1-dx)*(1-dy)], [1, 0, dx*(1-dy)], [0, 1, (1-dx)*dy], [1, 1, dx*dy]]) {
    if (weight < 1e-10) continue;
    const px = ix + ox, py = iy + oy, tx = Math.floor(px / 256), ty = Math.floor(py / 256);
    const value = tiles.get(`${zoom}/${tx}/${ty}`)?.heights[(py - ty * 256) * 256 + px - tx * 256];
    if (value === undefined || !Number.isFinite(value)) return undefined;
    height += value * weight;
  }
  return height;
}

/** Display context only. Never added to the analysis grid, measurement raycasts or profile sampler. */
export function createRegionalElevation(metadata: TerrainMetadata, surfaces: ElevationSurface[], tiles: MapTile[], onReady: () => void) {
  const grids = new Map<string, ElevationTile>();
  const toWgs84 = proj4(metadata.crs.proj4 || `${metadata.crs.authority}:${metadata.crs.code}`, 'EPSG:4326');
  let disposed = false, controller: AbortController | null = null;
  let status: ContextReliefStatus = 'loading';
  const sample = (x: number, y: number): number | undefined => {
    for (const surface of surfaces) {
      const value = bilinearElevation(surface.grid, surface.metadata, x, y).elevation;
      if (value !== undefined) return value - 8; // Underlay clearance; measured terrain is untouched.
    }
    if (!tiles.length) return undefined;
    const [lon, lat] = toWgs84.forward([x, y]);
    const value = sampleElevationTiles(grids, tiles[0].z, lon, lat);
    return value === undefined ? undefined : value - 8;
  };
  const load = async () => {
    if (disposed || controller || status === 'ready') return;
    const run = new AbortController(); controller = run;
    const timeout = window.setTimeout(() => run.abort(), 20000);
    status = 'loading';
    const queue = tiles.filter(tile => {
      const saved = cache.get(tileKey(tile));
      if (saved) grids.set(tileKey(tile), saved);
      return !grids.has(tileKey(tile));
    });
    let failures = 0;
    const worker = async () => {
      while (queue.length && !run.signal.aborted) {
        const tile = queue.shift()!;
        let bitmap: ImageBitmap | undefined;
        try {
          const response = await fetch(`https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${tile.z}/${tile.x}/${tile.y}.png`, { signal: run.signal });
          if (!response.ok) throw new Error('Context elevation unavailable');
          bitmap = await createImageBitmap(await response.blob(), { colorSpaceConversion: 'none', premultiplyAlpha: 'none' });
          if (disposed || run.signal.aborted) continue;
          if (bitmap.width !== 256 || bitmap.height !== 256) throw new Error('Invalid elevation tile');
          const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
          const context = canvas.getContext('2d', { willReadFrequently: true });
          if (!context) throw new Error('Canvas unavailable');
          context.drawImage(bitmap, 0, 0);
          const heights = decodeTerrarium(context.getImageData(0, 0, 256, 256).data);
          if (!heights.some(Number.isFinite)) throw new Error('Empty elevation tile');
          const value = { ...tile, heights };
          grids.set(tileKey(tile), value); cache.set(tileKey(tile), value);
          while (cache.size > 64) cache.delete(cache.keys().next().value!);
        } catch {
          if (!grids.size && ++failures >= 4) run.abort();
        } finally { bitmap?.close(); }
      }
    };
    await Promise.all(Array.from({ length: 4 }, worker));
    clearTimeout(timeout); controller = null;
    if (disposed) return;
    status = grids.size === tiles.length && tiles.length > 0 ? 'ready' : grids.size ? 'partial' : 'error';
    onReady();
  };
  return { sample, load, get status() { return status; }, dispose() { disposed = true; controller?.abort(); grids.clear(); } };
}
