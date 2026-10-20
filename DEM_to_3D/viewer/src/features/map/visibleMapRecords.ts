import type { GeometryRecord } from '../../geo/vector/types';
import type { Hazard } from '../../types/dear';
import { landslideAreaOf } from '../landslides/landslideAreas';
import { fieldAreaOwner } from '../observations/fieldAreas';
import { distinctSourceRecords, representedHazard } from './sourceRepresentation';

/** Mapped hazards belong to the situation, independently of imported reference data. */
export function visibleMapRecords(records: GeometryRecord[], layers: Record<string, boolean>, _networkVersion?: string, hazards: Hazard[] = [], selectedId: string | null = null): GeometryRecord[] {
  return distinctSourceRecords(records, selectedId).filter(record => {
    if (!record.visible) return false;
    const represented = representedHazard(record, hazards);
    if (represented && record.id !== selectedId && hazardLayerVisible(represented, layers)) return false;
    const area = landslideAreaOf(record);
    // A boundary remains valid when the road dataset changes. Only its road links
    // are scoped to a network version (checked by the road-link renderers).
    if (area) return layers.landslide !== false;
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
