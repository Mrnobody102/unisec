import type {MapTile} from '../../terrain/regionalBasemap';

export type LocalMapSource = {
  schemaVersion: 1;
  imagery: {url: string; maxZoom: number; credit: string; name: string};
  terrain: {url: string; maxZoom: number};
  elevation: {url: string; tiles: MapTile[]};
  bounds: [number, number, number, number];
};

// One workspace is loaded before any map renderer mounts. All renderers share
// this validated source; loading another workspace explicitly replaces it.
let current: LocalMapSource | null = null;
const validTemplate = (value: unknown): value is string =>
  typeof value === 'string' && /^\/offline-map\/[a-zA-Z0-9_./{}-]+$/.test(value) &&
  !value.includes('..') && !value.includes('//') &&
  ['{z}', '{x}', '{y}'].every(token => value.includes(token));
const validZoom = (value: number) => Number.isInteger(value) && value >= 0 && value <= 18;
const tileKey = (tile: MapTile) => `${tile.z}/${tile.x}/${tile.y}`;

export function validateLocalMapSource(value: unknown): LocalMapSource {
  const source = value as LocalMapSource;
  if (!source || source.schemaVersion !== 1 ||
      !validTemplate(source.imagery?.url) || !validTemplate(source.terrain?.url) || !validTemplate(source.elevation?.url) ||
      ![source.imagery.maxZoom, source.terrain.maxZoom].every(validZoom) ||
      typeof source.imagery.credit !== 'string' || typeof source.imagery.name !== 'string' ||
      !Array.isArray(source.bounds) || source.bounds.length !== 4 || !source.bounds.every(Number.isFinite) ||
      source.bounds[0] >= source.bounds[2] || source.bounds[1] >= source.bounds[3] ||
      source.bounds[0] < -180 || source.bounds[2] > 180 || source.bounds[1] < -85.0511 || source.bounds[3] > 85.0511 ||
      !Array.isArray(source.elevation.tiles) || !source.elevation.tiles.length || source.elevation.tiles.length > 128 ||
      !source.elevation.tiles.every(tile => Number.isInteger(tile.z) && tile.z >= 0 && tile.z <= 14 &&
        [tile.x, tile.y].every(n => Number.isInteger(n) && n >= 0 && n < 2 ** tile.z)) ||
      new Set(source.elevation.tiles.map(tile => tile.z)).size !== 1 ||
      new Set(source.elevation.tiles.map(tileKey)).size !== source.elevation.tiles.length) {
    throw new Error('Invalid local map package');
  }
  return source;
}

export const localMapSource = () => current;
export function setLocalMapSource(value: LocalMapSource | null) { current = value; }
export const tileUrl = (template: string, tile: MapTile) => template
  .replaceAll('{z}', String(tile.z)).replaceAll('{x}', String(tile.x)).replaceAll('{y}', String(tile.y));
