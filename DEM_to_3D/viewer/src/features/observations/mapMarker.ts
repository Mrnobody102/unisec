import * as L from 'leaflet';
import type { GeometryRecord } from '../../geo/vector/types';
import type { FieldObservation } from './model';
import './observations.css';

/** One marker vocabulary for the GIS workspace and the response map. */
export function observationMarker(
  position: L.LatLng,
  record: GeometryRecord,
  observation: FieldObservation,
  options: { pane: string; selected: boolean; interactive: boolean }
): L.Marker {
  const icon = document.createElement('span');
  icon.textContent = observation.kind === 'survey' ? 'i' : '!';
  icon.setAttribute('aria-hidden', 'true');
  icon.dataset.fieldId = record.id;
  return L.marker(position, {
    pane: options.pane,
    title: record.name,
    keyboard: options.interactive,
    interactive: options.interactive,
    icon: L.divIcon({
      html: icon,
      className:
        'field-map-marker' +
        (observation.kind === 'survey' ? ' is-survey' : '') +
        (options.selected ? ' is-selected' : ''),
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    })
  });
}
