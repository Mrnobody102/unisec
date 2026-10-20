import type { TerrainMetadata } from '../types/terrain';
import { TerrainAssetError } from './validation';
import { logicalTilePath, tileLevel, validateTilePyramidMetadata, type TilePyramidMetadata } from './tileMetadata';

export const isTileMetadata = (file: File) => file.name.toLowerCase().endsWith('.tiles.json');
export const isTileFile = (file: File) => /(?:^|[/\\])[^/\\]+_tiles[/\\]/i.test(file.webkitRelativePath || file.name);

export function collectTileFiles(files: readonly File[], modelName: string): Map<string, File> {
  const root = modelName.replace(/\.(glb|gltf)$/i, '').toLowerCase() + '_tiles';
  const result = new Map<string, File>();
  for (const file of files) {
    const path = file.webkitRelativePath || file.name;
    const parts = path.replace(/\\/g, '/').split('/');
    if (!parts.some(part => part.toLowerCase() === root)) continue;
    if (path.includes('\\') || path.includes('\0') || /^(?:\/|[a-z]:)/i.test(path) || parts.some(part => !part || part === '.' || part === '..')) throw new TerrainAssetError(`Unsafe tile path: ${path}`);
    const index = parts.findIndex(part => part.toLowerCase() === root);
    const relative = parts.slice(index + 1).join('/');
    if (!/^z\d+\/\d+_\d+\.webp$/.test(relative)) throw new TerrainAssetError(`Invalid tile path: ${path}`);
    if (result.has(relative)) throw new TerrainAssetError(`Duplicate tile path: ${relative}`);
    result.set(relative, file);
  }
  return result;
}

export function validateUploadedTileInventory(metadata: TilePyramidMetadata, files: ReadonlyMap<string, File>): void {
  for (const path of files.keys()) {
    const match = /^z(\d+)\/(\d+)_(\d+)\.webp$/.exec(path);
    if (!match) throw new TerrainAssetError(`Invalid tile path: ${path}`);
    if (path !== logicalTilePath(Number(match[1]), Number(match[2]), Number(match[3]))) throw new TerrainAssetError(`Noncanonical tile path: ${path}`);
    const level = tileLevel(metadata, Number(match[1]));
    if (Number(match[2]) >= level.columns || Number(match[3]) >= level.rows) throw new TerrainAssetError(`Tile outside metadata bounds: ${path}`);
  }
  // A complete inventory makes a missing local tile an import error, not a blank patch.
  const expected = metadata.levels.reduce((sum, level) => sum + level.columns * level.rows, 0);
  if (!Number.isSafeInteger(expected) || files.size !== expected) throw new TerrainAssetError('Tile package is incomplete');
}

export async function loadTilePackage(file: File, files: Map<string, File>, modelName: string, terrain?: TerrainMetadata) {
  const metadata = validateTilePyramidMetadata(JSON.parse(await file.text()) as unknown);
  const key = modelName.replace(/\.(glb|gltf)$/i, '').toLowerCase();
  if (metadata.asset_id.toLowerCase() !== key) throw new TerrainAssetError('Tile asset_id does not match the model');
  if (!terrain || terrain.crs.authority !== metadata.crs.authority || terrain.crs.code !== metadata.crs.code) throw new TerrainAssetError('Tiles require matching terrain coordinate metadata');
  validateUploadedTileInventory(metadata, files);
  return metadata;
}
