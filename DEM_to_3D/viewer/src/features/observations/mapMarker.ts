import * as L from 'leaflet';
import type { GeometryRecord } from '../../geo/vector/types';
import { PIN, teardropPinSvg } from '../../terrain/pinShape';
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
  const glyph = document.createElement('b');
  glyph.textContent = observation.kind === 'survey' ? 'i' : '!';
  icon.setAttribute('aria-hidden', 'true');
  icon.dataset.fieldId = record.id;
  // Selected record rises into a teardrop pin whose tip stays on the coordinate.
  if (options.selected) icon.innerHTML = teardropPinSvg();
  icon.append(glyph);
  return L.marker(position, {
    pane: options.pane,
    title: record.name,
    keyboard: options.interactive,
    interactive: options.interactive,
    zIndexOffset: options.selected ? 1000 : 0,
    icon: L.divIcon({
      html: icon,
      className:
        'field-map-marker' +
        (observation.kind === 'survey' ? ' is-survey' : '') +
        (options.selected ? ' is-selected' : ''),
      iconSize: options.selected ? [PIN.width, PIN.height] : [24, 24],
      iconAnchor: options.selected ? [PIN.tipX, PIN.tipY] : [12, 12],
      tooltipAnchor: options.selected ? [0, -PIN.tipY + 4] : [0, -10]
    })
  });
}
