import type { TerrainMetadata } from '../types/terrain';
import { pixelToProjected } from './coordinate';

/** Tile coverage only. This bounding frame is not a new DEM and carries no sampled elevations. */
export function basemapFrame(models: TerrainMetadata[]): TerrainMetadata {
  const reference = models[0];
  if (models.length < 2) return reference;
  const corners = models.flatMap(metadata => [0, metadata.grid.shape[1] - 1].flatMap(column =>
    [0, metadata.grid.shape[0] - 1].map(row => pixelToProjected(metadata, column, row))));
  const minX = Math.min(...corners.map(p => p.x)), maxX = Math.max(...corners.map(p => p.x));
  const minY = Math.min(...corners.map(p => p.y)), maxY = Math.max(...corners.map(p => p.y));
  const step = Math.hypot(reference.grid_transform.a, reference.grid_transform.d);
  const shape: [number, number] = [Math.ceil((maxY - minY) / step) + 1, Math.ceil((maxX - minX) / step) + 1];
  return {...reference, analysis_supported:false, grid:{...reference.grid,shape,byte_length:shape[0]*shape[1]*4},
    grid_transform:{...reference.grid_transform,a:step,b:0,c:minX-step/2,d:0,e:-step,f:maxY+step/2}};
}
