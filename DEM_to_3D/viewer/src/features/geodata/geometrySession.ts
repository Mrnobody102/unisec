import {
  GeometryError,
  isPolygon,
  type GeometryRecord,
  type GeometryRole
} from '../../geo/vector/types';
import { GEOMETRY_LIMITS, textBytes } from '../../geo/vector/limits';
import { validateGeometryBudget } from '../../geo/vector/geometryBudget';
import { validateGeometry } from '../../geo/vector/validateGeometry';
import type { parseSpatialInput } from './parseSpatialInput';

export type ImportRole = GeometryRole | 'auto';

export function createGeometryRecords(
  parsed: ReturnType<typeof parseSpatialInput>,
  sourceName: string,
  role: ImportRole
): GeometryRecord[] {
  const importedAt = new Date().toISOString();
  const firstPolygon = parsed.features.findIndex((feature) => isPolygon(feature.geometry));
  return parsed.features.map((feature, index) => ({
    id: crypto.randomUUID(),
    name: String(feature.properties.name || `${sourceName} ${index + 1}`).slice(0, 160),
    feature,
    role: !isPolygon(feature.geometry)
      ? 'reference'
      : role === 'auto'
        ? ['aoi', 'footprint'].includes(String(feature.properties.geometryRole))
          ? (feature.properties.geometryRole as GeometryRole)
          : 'reference'
        : role === 'aoi' && index !== firstPolygon
          ? 'reference'
          : role,
    visible: true,
    source: { name: sourceName, format: parsed.format, importedAt }
  }));
}

/** Check each record separately so repeated KML metadata cannot allocate a huge JSON string. */
export function validateGeometryStorageBudget(records: GeometryRecord[]): void {
  let bytes = 2; // JSON array brackets.
  for (const [index, record] of records.entries()) {
    bytes += textBytes(JSON.stringify(record)) + (index ? 1 : 0);
    if (bytes > GEOMETRY_LIMITS.storageBytes) throw new GeometryError('workspace-limit');
  }
}

export function addGeometryRecords(
  previous: GeometryRecord[],
  additions: GeometryRecord[]
): GeometryRecord[] {
  const ids = [...previous, ...additions].map((record) => record.id);
  if (new Set(ids).size !== ids.length) throw new GeometryError('storage');
  validateGeometryBudget([...previous, ...additions].map(record => record.feature.geometry));
  const replacesAoi = additions.some((record) => record.role === 'aoi');
  let aoiFound = false;
  const combined = [
    ...previous.map((record) =>
      replacesAoi && record.role === 'aoi' ? { ...record, role: 'reference' as const } : record
    ),
    ...additions
  ].map((record) => {
    if (record.role !== 'aoi') return record;
    if (aoiFound) return { ...record, role: 'reference' as const };
    aoiFound = true;
    return record;
  });
  validateGeometryStorageBudget(combined);
  return combined;
}

export function restoreGeometryRecords(raw: unknown): GeometryRecord[] {
  if (!Array.isArray(raw) || raw.length > GEOMETRY_LIMITS.features) throw new GeometryError('storage');
  validateGeometryBudget(raw.map(record => record?.feature?.geometry));
  const ids = new Set<string>();
  let aois = 0;
  const records = raw.map((record) => {
    if (
      !record ||
      typeof record.id !== 'string' ||
      ids.has(record.id) ||
      typeof record.name !== 'string' ||
      !['aoi', 'reference', 'footprint'].includes(record.role) ||
      typeof record.visible !== 'boolean' ||
      typeof record.source?.name !== 'string' ||
      !['KML', 'WKT', 'GeoJSON', 'coordinate', 'drawing'].includes(record.source?.format) ||
      typeof record.source?.importedAt !== 'string' ||
      !Number.isFinite(Date.parse(record.source.importedAt))
    )
      throw new GeometryError('storage');
    ids.add(record.id);
    const geometry = validateGeometry(record.feature?.geometry);
    if (record.role !== 'reference' && !isPolygon(geometry)) throw new GeometryError('storage');
    if (record.role === 'aoi' && ++aois > 1) throw new GeometryError('storage');
    const properties = record.feature?.properties;
    if (!properties || typeof properties !== 'object' || Array.isArray(properties))
      throw new GeometryError('storage');
    return {
      ...record,
      feature: { type: 'Feature' as const, geometry, properties }
    };
  });
  return records;
}
