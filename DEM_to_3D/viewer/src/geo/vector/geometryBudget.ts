import { GEOMETRY_LIMITS } from './limits';
import { GeometryError, geometryPositions, type VectorGeometry } from './types';

/** Reject oversized batches before running quadratic polygon topology checks. */
export function validateGeometryBudget(geometries: VectorGeometry[]): void {
  if (geometries.length > GEOMETRY_LIMITS.features) throw new GeometryError('feature-limit');
  let total = 0;
  for (const geometry of geometries) {
    let positions: number[][];
    try { positions = geometryPositions(geometry); }
    catch { throw new GeometryError('coordinates'); }
    if (!Array.isArray(positions)) throw new GeometryError('geometry-type');
    total += positions.length;
    if (positions.length > GEOMETRY_LIMITS.verticesPerFeature || total > GEOMETRY_LIMITS.verticesPerWorkspace)
      throw new GeometryError('vertex-limit');
  }
}
