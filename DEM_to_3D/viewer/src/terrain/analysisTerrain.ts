import type { LoadedModel, TerrainMetadata } from '../types/terrain';
import { projectedToPixel } from './coordinate';
import { strictBilinearSample } from './profile';

export type TerrainTile = {
  metadata: TerrainMetadata;
  grid: Float32Array;
};

export type AnalysisTerrain = {
  /** Reference metadata (first analyzable model) used for scene placement of overlays. */
  metadata: TerrainMetadata;
  /** Grid of the reference tile (kept for single-tile compatibility). */
  grid: Float32Array;
  gridBuffer: ArrayBuffer;
  gltf?: import('three/examples/jsm/loaders/GLTFLoader.js').GLTF;
  /** All analyzable tiles sharing the reference CRS (single model = one entry). */
  tiles: TerrainTile[];
};

type AnalysisInput = Pick<LoadedModel, 'metadata' | 'grid' | 'gridBuffer'> & { gltf?: LoadedModel['gltf'] };

function isAnalyzable(model: AnalysisInput): boolean {
  return Boolean(model.metadata?.analysis_supported && model.grid && model.gridBuffer);
}

function sameCrs(reference: TerrainMetadata, candidate: TerrainMetadata): boolean {
  return reference.crs.authority.toUpperCase() === candidate.crs.authority.toUpperCase()
    && reference.crs.code === candidate.crs.code;
}

/** Test whether a projected point lies inside a tile's pixel-center grid domain, with optional slack in pixel units. */
export function tileContainsPoint(tile: TerrainTile, x: number, y: number, slack = 0): boolean {
  const [rows, columns] = tile.metadata.grid.shape;
  let pixel;
  try {
    pixel = projectedToPixel(tile.metadata, x, y);
  } catch {
    return false;
  }
  // Pixel references cell centers: the strict domain in pixel-index units is
  // [-0.5, columns-0.5] x [-0.5, rows-0.5] (cell edges). Extra slack lets a
  // second pass pick up points just outside, bridging seams between tiles.
  const tolerance = slack + 1e-9;
  return pixel.column >= -0.5 - tolerance && pixel.column <= columns - 0.5 + tolerance
    && pixel.row >= -0.5 - tolerance && pixel.row <= rows - 0.5 + tolerance;
}

/**
 * Sample elevation at a projected point across analyzable tiles. Strict domain
 * containment first, then a half-pixel-slack retry so seam points between two
 * adjacent tiles still resolve. Points outside every tile yield undefined.
 */
export function sampleTiles(tiles: readonly TerrainTile[], x: number, y: number): { elevation?: number; pixel?: { row: number; column: number }; tileIndex: number } {
  for (let pass = 0; pass < 2; pass += 1) {
    const slack = pass === 0 ? 0 : 0.5;
    for (let index = 0; index < tiles.length; index += 1) {
      const tile = tiles[index];
      if (!tileContainsPoint(tile, x, y, slack)) continue;
      const sampled = strictBilinearSample(tile.grid, tile.metadata, { x, y });
      return { elevation: sampled.elevation, pixel: sampled.pixel, tileIndex: index };
    }
  }
  return { tileIndex: -1 };
}

/**
 * Select the analysis terrain from uploaded models. When several analyzable
 * models share the reference CRS, a composite multi-tile terrain is returned so
 * profiles can cross tile boundaries; otherwise the first analyzable model wins
 * (previous behavior).
 */
export function selectAnalysisTerrain(models: readonly AnalysisInput[]): AnalysisTerrain | null {
  const reference = models.find(isAnalyzable);
  if (!reference?.metadata || !reference.grid || !reference.gridBuffer) return null;
  const referenceMetadata: TerrainMetadata = reference.metadata;

  const tiles: TerrainTile[] = [];
  models.forEach((model) => {
    if (!isAnalyzable(model) || !model.metadata || !model.grid) return;
    if (!sameCrs(referenceMetadata, model.metadata)) return;
    tiles.push({ metadata: model.metadata, grid: model.grid });
  });

  return { metadata: reference.metadata, grid: reference.grid, gridBuffer: reference.gridBuffer, gltf: reference.gltf, tiles };
}
