import type { ProjectedPoint } from './coordinate';
import { projectedToPixel } from './coordinate';
import type { TerrainMetadata } from '../types/terrain';
import type { TerrainTile } from './analysisTerrain';
import { tileContainsPoint } from './analysisTerrain';

export type ElevationSampler = (x: number, y: number) => { elevation?: number; pixel?: { row: number; column: number } };

export type ProfileSample = {
  index: number;
  distance: number;
  projected: ProjectedPoint;
  elevation?: number;
  pixel?: { row: number; column: number };
  /** true when the elevation was gap-filled (linear interpolation across a nodata run), not measured. */
  gapFilled?: boolean;
};

export type SurfaceProfile = {
  start: ProjectedPoint;
  end: ProjectedPoint;
  length: number;
  azimuth: number;
  sampleInterval: number;
  samples: ProfileSample[];
  segments: number[][];
};

function finiteGridValue(grid: Float32Array, metadata: TerrainMetadata, row: number, column: number): number | undefined {
  const [rows, columns] = metadata.grid.shape;
  if (row < 0 || column < 0 || row >= rows || column >= columns) return undefined;
  const value = grid[row * columns + column];
  return Number.isFinite(value) ? value : undefined;
}

/**
 * Bilinear interpolation that preserves nodata holes. At the outermost pixel
 * row/column there is no four-cell neighborhood, so a finite pixel-center
 * lookup is used instead of inventing a value outside the grid.
 */
export function strictBilinearSample(grid: Float32Array, metadata: TerrainMetadata, point: ProjectedPoint): { elevation?: number; pixel: { row: number; column: number } } {
  const pixel = projectedToPixel(metadata, point.x, point.y);
  const baseColumn = Math.floor(pixel.column);
  const baseRow = Math.floor(pixel.row);
  const [rows, columns] = metadata.grid.shape;
  if (pixel.column < -1e-9 || pixel.row < -1e-9 || pixel.column > columns - 1 + 1e-9 || pixel.row > rows - 1 + 1e-9) {
    return { pixel: { row: Math.round(pixel.row), column: Math.round(pixel.column) } };
  }
  if (baseColumn < 0 || baseRow < 0 || baseColumn >= columns || baseRow >= rows) {
    return { pixel: { row: Math.round(pixel.row), column: Math.round(pixel.column) } };
  }
  if (baseColumn === columns - 1 || baseRow === rows - 1) {
    return { elevation: finiteGridValue(grid, metadata, baseRow, baseColumn), pixel: { row: baseRow, column: baseColumn } };
  }
  const fx = pixel.column - baseColumn;
  const fy = pixel.row - baseRow;
  const v00 = finiteGridValue(grid, metadata, baseRow, baseColumn);
  const v10 = finiteGridValue(grid, metadata, baseRow, baseColumn + 1);
  const v01 = finiteGridValue(grid, metadata, baseRow + 1, baseColumn);
  const v11 = finiteGridValue(grid, metadata, baseRow + 1, baseColumn + 1);
  const weights = [(1 - fx) * (1 - fy), fx * (1 - fy), (1 - fx) * fy, fx * fy];
  const values = [v00, v10, v01, v11];
  if (values.some((value, index) => value === undefined && weights[index] > 1e-12)) {
    return { pixel: { row: Math.round(pixel.row), column: Math.round(pixel.column) } };
  }
  return {
    elevation: values.reduce<number>((sum, value, index) => sum + (value ?? 0) * weights[index], 0),
    pixel: { row: baseRow, column: baseColumn },
  };
}

function buildDistances(length: number, interval: number): number[] {
  const distances: number[] = [0];
  for (let distance = interval; distance < length; distance += interval) distances.push(distance);
  if (length > 0) distances.push(length);
  return distances;
}

export function splitValidSegments(samples: ProfileSample[]): number[][] {
  const segments: number[][] = [];
  let current: number[] = [];
  samples.forEach((sample) => {
    if (sample.elevation === undefined) {
      if (current.length) segments.push(current);
      current = [];
    } else {
      current.push(sample.index);
    }
  });
  if (current.length) segments.push(current);
  return segments;
}

function samplerFromTiles(tiles: readonly TerrainTile[]): ElevationSampler {
  if (tiles.length === 1) {
    const tile = tiles[0];
    return (x, y) => strictBilinearSample(tile.grid, tile.metadata, { x, y });
  }
  return (x, y) => {
    // First pass: strict domain containment. Second pass: half-pixel slack so
    // samples in the pixel-center gap between two adjacent tiles still resolve
    // instead of producing an artificial nodata break at the seam.
    for (let pass = 0; pass < 2; pass += 1) {
      const slack = pass === 0 ? 0 : 0.5 + 1e-9;
      for (let index = 0; index < tiles.length; index += 1) {
        const tile = tiles[index];
        if (!tileContainsPoint(tile, x, y, slack)) continue;
        return strictBilinearSample(tile.grid, tile.metadata, { x, y });
      }
    }
    return {};
  };
}

/**
 * Fill nodata runs by linearly interpolating between the nearest valid samples
 * on each side. Runs touching the line ends (no valid sample on one side) are
 * bridged from/to the single nearest valid sample (flat extrapolation) so the
 * measurement line remains connected. The samples are flagged `gapFilled` so
 * consumers can render them distinctly (e.g. dashed).
 */
export function fillNodataGaps(samples: ProfileSample[]): ProfileSample[] {
  const result = samples.map((sample) => ({ ...sample }));
  let index = 0;
  while (index < result.length) {
    if (result[index].elevation !== undefined) { index += 1; continue; }
    let runEnd = index;
    while (runEnd < result.length && result[runEnd].elevation === undefined) runEnd += 1;
    const before = index > 0 ? result[index - 1] : undefined;
    const after = runEnd < result.length ? result[runEnd] : undefined;
    if (before && after && before.elevation !== undefined && after.elevation !== undefined) {
      const span = after.distance - before.distance;
      for (let fill = index; fill < runEnd; fill += 1) {
        const ratio = span > 0 ? (result[fill].distance - before.distance) / span : 0;
        result[fill] = { ...result[fill], elevation: before.elevation + (after.elevation - before.elevation) * ratio, gapFilled: true };
      }
    } else {
      // Edge run: hold the nearest valid elevation so the line stays connected.
      const anchor = before ?? after;
      if (anchor?.elevation !== undefined) {
        for (let fill = index; fill < runEnd; fill += 1) {
          result[fill] = { ...result[fill], elevation: anchor.elevation, gapFilled: true };
        }
      }
    }
    index = runEnd;
  }
  return result;
}

export function createSurfaceProfile(
  gridOrTiles: Float32Array | readonly TerrainTile[],
  metadata: TerrainMetadata,
  start: ProjectedPoint,
  end: ProjectedPoint,
  sampleInterval: number,
): SurfaceProfile {
  if (!Number.isFinite(sampleInterval) || sampleInterval <= 0) throw new Error('sampleInterval must be greater than zero');
  const sampler: ElevationSampler = gridOrTiles instanceof Float32Array
    ? (x, y) => strictBilinearSample(gridOrTiles, metadata, { x, y })
    : samplerFromTiles(gridOrTiles);
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy);
  const azimuth = length === 0 ? 0 : (Math.atan2(dx, dy) * 180 / Math.PI + 360) % 360;
  const rawSamples = buildDistances(length, sampleInterval).map((distance, index) => {
    const ratio = length === 0 ? 0 : distance / length;
    const projected = { x: start.x + dx * ratio, y: start.y + dy * ratio };
    const sampled = sampler(projected.x, projected.y);
    return { index, distance, projected, elevation: sampled.elevation, pixel: sampled.pixel };
  });
  const samples = fillNodataGaps(rawSamples);
  return { start, end, length, azimuth, sampleInterval, samples, segments: splitValidSegments(samples) };
}
