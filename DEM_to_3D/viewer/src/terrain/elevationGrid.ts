import type { TerrainMetadata } from '../types/terrain';
import { projectedToPixel } from './coordinate';

export function gridValue(grid: Float32Array, metadata: TerrainMetadata, row: number, column: number): number | undefined {
  const [rows, cols] = metadata.grid.shape;
  if (row < 0 || column < 0 || row >= rows || column >= cols) return undefined;
  const value = grid[row * cols + column];
  return Number.isFinite(value) ? value : undefined;
}

export function bilinearElevation(grid: Float32Array, metadata: TerrainMetadata, x: number, y: number): { elevation?: number; row: number; column: number; interpolated: boolean } {
  const pixel = projectedToPixel(metadata, x, y);
  const column = Math.floor(pixel.column);
  const row = Math.floor(pixel.row);
  const fx = pixel.column - column;
  const fy = pixel.row - row;
  const values = [gridValue(grid, metadata, row, column), gridValue(grid, metadata, row, column + 1), gridValue(grid, metadata, row + 1, column), gridValue(grid, metadata, row + 1, column + 1)];
  if (values.every((value) => value !== undefined)) {
    const [v00, v10, v01, v11] = values as number[];
    return { elevation: (1 - fy) * ((1 - fx) * v00 + fx * v10) + fy * ((1 - fx) * v01 + fx * v11), row, column, interpolated: true };
  }
  const nearest = gridValue(grid, metadata, Math.round(pixel.row), Math.round(pixel.column));
  return { elevation: nearest, row: Math.round(pixel.row), column: Math.round(pixel.column), interpolated: false };
}

export function nearestPixel(metadata: TerrainMetadata, x: number, y: number): { row: number; column: number } {
  const pixel = projectedToPixel(metadata, x, y);
  return { row: Math.round(pixel.row), column: Math.round(pixel.column) };
}
