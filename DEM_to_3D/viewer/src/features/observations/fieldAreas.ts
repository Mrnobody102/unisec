import type { GeometryRecord, VectorGeometry } from '../../geo/vector/types';
import { isPolygon } from '../../geo/vector/types';
import { validateGeometry } from '../../geo/vector/validateGeometry';

export const fieldAreaKey = 'dearFieldArea';
export const recordIdKey = 'dearRecordId';
export type FieldArea = {
  schema: 'field-area/v1';
  observationId: string;
  status: 'unreviewed';
  createdAt: string;
};
export function fieldAreaOf(record: GeometryRecord): FieldArea | null {
  if (!isPolygon(record.feature.geometry) || record.role !== 'reference')
    return null;
  try {
    const raw = record.feature.properties[fieldAreaKey];
    const value = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (
      value?.schema !== 'field-area/v1' ||
      typeof value.observationId !== 'string' ||
      !value.observationId ||
      value.observationId.length > 160 ||
      value.status !== 'unreviewed' ||
      typeof value.createdAt !== 'string' ||
      !Number.isFinite(Date.parse(value.createdAt))
    )
      return null;
    return value as FieldArea;
  } catch {
    return null;
  }
}
export function fieldAreaOwner(
  record: GeometryRecord,
  records: GeometryRecord[]
): GeometryRecord | undefined {
  const value = fieldAreaOf(record);
  return value
    ? records.find(
        (r) =>
          r.id === value.observationId && r.feature.geometry.type === 'Point'
      )
    : undefined;
}
export function linkedFieldAreas(
  records: GeometryRecord[],
  pointId: string
): GeometryRecord[] {
  return records.filter((r) => fieldAreaOwner(r, records)?.id === pointId);
}
export function createFieldArea(
  point: GeometryRecord,
  raw: VectorGeometry,
  name: string
): GeometryRecord {
  const geometry = validateGeometry(raw);
  if (point.feature.geometry.type !== 'Point' || !isPolygon(geometry))
    throw new Error('Field area requires a point and polygon');
  const createdAt = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name,
    role: 'reference',
    visible: true,
    source: { name: point.name, format: 'drawing', importedAt: createdAt },
    feature: {
      type: 'Feature',
      geometry,
      properties: {
        name,
        [fieldAreaKey]: {
          schema: 'field-area/v1',
          observationId: point.id,
          status: 'unreviewed',
          createdAt
        } satisfies FieldArea
      }
    }
  };
}
export function removeWithFieldAreas(
  records: GeometryRecord[],
  id: string
): GeometryRecord[] {
  const ids = new Set([id, ...linkedFieldAreas(records, id).map((r) => r.id)]);
  return records.filter((r) => !ids.has(r.id));
}
/** Exports identify originals; imports assign fresh IDs and remap only owners in this batch. */
export function remapFieldAreas(records: GeometryRecord[]): GeometryRecord[] {
  const ids = new Map<string, string>();
  for (const r of records) {
    const old = r.feature.properties[recordIdKey];
    if (typeof old === 'string') {
      if (ids.has(old)) throw new Error('Duplicate exported record ID');
      ids.set(old, r.id);
    }
  }
  return records.map((r) => {
    const value = fieldAreaOf(r);
    if (!value) return r;
    const owner = ids.get(value.observationId);
    return {
      ...r,
      feature: {
        ...r.feature,
        properties: {
          ...r.feature.properties,
          [fieldAreaKey]: {
            ...value,
            observationId: owner ?? 'missing:' + r.id
          }
        }
      }
    };
  });
}
