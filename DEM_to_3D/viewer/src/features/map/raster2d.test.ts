import { describe, expect, it } from 'vitest';
import proj4 from 'proj4';
import metadata from '../../../public/terrain/che_tao_v2_tex.terrain.json';
import type { TerrainData } from '../../types/terrain';
import { rasterPosition } from './raster2d';
import { pixelToProjected, projectedToPixel } from '../../terrain/coordinate';
import { validateMetadata } from '../../terrain/validation';

describe('2D raster georeferencing', () => {
  it('preserves raster positions through the UTM to map projection round trip', () => {
    const data: TerrainData = { metadata: validateMetadata(metadata), grid: new Float32Array(), gridBuffer: new ArrayBuffer(0) };
    for (const [col, row] of [[0, 0], [839, 501], [400.5, 225.25]]) {
      const map = rasterPosition(data, col, row);
      const [x, y] = proj4('EPSG:3857', metadata.crs.proj4, [map.x, map.y]);
      const p = pixelToProjected(data.metadata, col, row);
      expect(Math.hypot(x - p.x, y - p.y)).toBeLessThan(0.01);
      const pixel = projectedToPixel(data.metadata, x, y);
      expect(pixel.column).toBeCloseTo(col, 5); expect(pixel.row).toBeCloseTo(row, 5);
    }
  });
});
