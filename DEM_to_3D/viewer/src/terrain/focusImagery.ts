import * as THREE from 'three';
import proj4 from 'proj4';
import type { TerrainMetadata } from '../types/terrain';
import { imagerySource } from '../features/map/imagerySource';
import type { MapTile } from './regionalBasemap';

const detailTileBudget = 48;
const selectionPaddingM = 350;

/** A bounded detail window, not a full-resolution download of the whole study area. */
export function focusTiles(metadata: TerrainMetadata, points: Array<{x: number; y: number}>): MapTile[] {
  const valid = points.filter(point => Number.isFinite(point.x) && Number.isFinite(point.y));
  if (!valid.length) return [];
  const minX = Math.min(...valid.map(point => point.x)) - selectionPaddingM;
  const maxX = Math.max(...valid.map(point => point.x)) + selectionPaddingM;
  const minY = Math.min(...valid.map(point => point.y)) - selectionPaddingM;
  const maxY = Math.max(...valid.map(point => point.y)) + selectionPaddingM;
  if (Math.max(maxX - minX, maxY - minY) > 12000) return [];
  const crs = metadata.crs.proj4 || `${metadata.crs.authority}:${metadata.crs.code}`;
  const corners = [minX, maxX].flatMap(x => [minY, maxY].map(y => proj4(crs, 'EPSG:4326', [x, y])));

  for (let z = Math.min(18, imagerySource.maxNativeZoom); z >= 0; z--) {
    const n = 2 ** z;
    const xy = corners.map(([lon, lat]) => {
      const latitude = THREE.MathUtils.degToRad(Math.max(-85.05, Math.min(85.05, lat)));
      return [Math.floor((lon + 180) / 360 * n), Math.floor((1 - Math.asinh(Math.tan(latitude)) / Math.PI) / 2 * n)];
    });
    const west = Math.max(0, Math.min(...xy.map(point => point[0])));
    const east = Math.min(n - 1, Math.max(...xy.map(point => point[0])));
    const north = Math.max(0, Math.min(...xy.map(point => point[1])));
    const south = Math.min(n - 1, Math.max(...xy.map(point => point[1])));
    if ((east - west + 1) * (south - north + 1) > detailTileBudget) continue;
    const tiles: MapTile[] = [];
    for (let x = west; x <= east; x++) for (let y = north; y <= south; y++) tiles.push({x, y, z});
    return tiles;
  }
  return [];
}

/** Publish only a complete patch. A failure never replaces the retained base imagery. */
export async function loadFocusAtlas(tiles: MapTile[], signal: AbortSignal, anisotropy: number) {
  if (!tiles.length) return null;
  const zoom = tiles[0].z;
  const minX = Math.min(...tiles.map(tile => tile.x)), minY = Math.min(...tiles.map(tile => tile.y));
  const maxX = Math.max(...tiles.map(tile => tile.x)) + 1, maxY = Math.max(...tiles.map(tile => tile.y)) + 1;
  const canvas = document.createElement('canvas');
  canvas.width = (maxX - minX) * 256;
  canvas.height = (maxY - minY) * 256;
  const context = canvas.getContext('2d');
  if (!context) return null;
  let cursor = 0;
  const worker = async () => {
    while (cursor < tiles.length) {
      signal.throwIfAborted();
      const tile = tiles[cursor++];
      const url = imagerySource.url.replaceAll('{z}', String(tile.z)).replaceAll('{x}', String(tile.x)).replaceAll('{y}', String(tile.y));
      const response = await fetch(url, {signal});
      if (!response.ok) throw new Error('Detail imagery unavailable');
      const bitmap = await createImageBitmap(await response.blob());
      try {
        signal.throwIfAborted();
        context.drawImage(bitmap, (tile.x - minX) * 256, (tile.y - minY) * 256, 256, 256);
      } finally {
        bitmap.close();
      }
    }
  };
  await Promise.all(Array.from({length: 4}, worker));
  signal.throwIfAborted();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = anisotropy;
  return {zoom, minX, minY, maxX, maxY, texture, dispose: () => {
    texture.dispose();
    canvas.width = canvas.height = 1;
  }};
}
