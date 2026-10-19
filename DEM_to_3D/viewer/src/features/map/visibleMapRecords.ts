import type { GeometryRecord } from '../../geo/vector/types';
import type { Hazard } from '../../types/dear';
import { landslideAreaOf } from '../landslides/landslideAreas';
import { fieldAreaOwner } from '../observations/fieldAreas';

/** Mapped hazards belong to the situation, independently of imported reference data. */
export function visibleMapRecords(records: GeometryRecord[], layers: Record<string, boolean>, networkVersion?: string): GeometryRecord[] {
  return records.filter(record => {
    if (!record.visible) return false;
    const area = landslideAreaOf(record);
    if (area) return layers.landslide !== false && (!area.networkVersion || area.networkVersion === networkVersion);
    if (record.feature.properties.sourceDatasetId && record.feature.geometry.type === 'Point') return layers.landslide !== false;
    if (layers.gis === false) return false;
    const owner = fieldAreaOwner(record, records);
    return !owner || owner.visible;
  });
}

export function hazardLayerVisible(hazard: Pick<Hazard, 'kind'>, layers: Record<string, boolean>): boolean {
  return hazard.kind === 'landslide' ? Boolean(layers.landslide)
    : hazard.kind === 'flood' ? Boolean(layers.flood)
    : Boolean(layers.crossings ?? layers.status);
}
