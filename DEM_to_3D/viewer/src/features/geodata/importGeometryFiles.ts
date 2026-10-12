import { GEOMETRY_LIMITS } from '../../geo/vector/limits';
import { validateGeometryBudget } from '../../geo/vector/geometryBudget';
import { GeometryError, type GeometryRecord } from '../../geo/vector/types';
import { createGeometryRecords, type ImportRole } from './geometrySession';
import { parseSpatialInput } from './parseSpatialInput';

/** Read the whole batch before committing anything to the active workspace. */
export async function importGeometryFiles(files: File[], role: ImportRole): Promise<GeometryRecord[]> {
  if (files.length > GEOMETRY_LIMITS.filesPerBatch) throw new GeometryError('batch-files');
  if (files.reduce((sum, file) => sum + file.size, 0) > GEOMETRY_LIMITS.batchBytes)
    throw new GeometryError('batch-bytes');
  for (const file of files) {
    if (file.size > GEOMETRY_LIMITS.inputBytes) throw new GeometryError('file-limit', file.name);
    if (!/\.(kml|geojson|json|wkt|txt)$/i.test(file.name)) throw new GeometryError('file', file.name);
  }
  const additions: GeometryRecord[] = [];
  for (const file of files) {
    try {
      const text = new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer());
      additions.push(...createGeometryRecords(parseSpatialInput(text), file.name, role));
      validateGeometryBudget(additions.map(record => record.feature.geometry));
    } catch (error) {
      throw new GeometryError(error instanceof GeometryError ? error.code : 'file', file.name);
    }
  }
  return additions;
}
