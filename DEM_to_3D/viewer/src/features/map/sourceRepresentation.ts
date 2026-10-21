import proj4 from 'proj4';
import type { GeometryRecord } from '../../geo/vector/types';
import type { Hazard } from '../../types/dear';
import { observationOf } from '../observations/model';

/** Only source survey stations can share an incident symbol. Nearby reports remain separate evidence. */
export function representedHazard(record: GeometryRecord, hazards: Hazard[]): Hazard | undefined {
  if (!record.feature.properties.sourceDatasetId || record.feature.geometry.type !== 'Point' || observationOf(record)) return;
  const [x, y] = proj4('EPSG:4326', 'EPSG:32648', record.feature.geometry.coordinates.slice(0, 2));
  // Prepared incident coordinates were rounded to metres; survey coordinates retain their precision.
  return hazards.find(hazard => hazard.kind === 'landslide' && Math.hypot(hazard.projected.x - x, hazard.projected.y - y) < 1);
}

/** Collapse repeated raw imports of a supplied feature; keep edited records and field reports. */
export function distinctSourceRecords(records: GeometryRecord[], selectedId: string | null = null): GeometryRecord[] {
  const keys = new Map<string, GeometryRecord>();
  const keyOf = (record: GeometryRecord) => JSON.stringify([record.feature.geometry, record.feature.properties.sourceName ?? record.name]);
  const plainReference = (record: GeometryRecord) => {
    if (record.role !== 'reference' || observationOf(record)) return false;
    // Additional properties may be an annotation, a linked area or evidence. Never collapse those.
    return Object.keys(record.feature.properties).every(key => ['name','altitudeMode','styleUrl'].includes(key));
  };
  for (const record of records) {
    if (observationOf(record)) continue;
    if (!plainReference(record) && !record.feature.properties.sourceDatasetId) continue;
    const key = keyOf(record), prior = keys.get(key);
    // A visible or explicitly selected copy wins over a hidden one.
    if (!prior || record.id === selectedId || (prior.id !== selectedId &&
        ((record.visible && !prior.visible) || (record.visible === prior.visible && record.feature.properties.sourceDatasetId && !prior.feature.properties.sourceDatasetId)))) keys.set(key, record);
  }
  return records.filter(record => {
    if (observationOf(record)) return true;
    if (!plainReference(record) && !record.feature.properties.sourceDatasetId) return true;
    const represented = keys.get(keyOf(record));
    return !represented || represented.id === record.id;
  });
}
