import { useEffect, useRef } from 'react';
import * as L from 'leaflet';
import type { GeometryRecord } from '../../geo/vector/types';
import { observationOf } from './model';
import { observationColor } from './labels';
import { observationMarker } from './mapMarker';
import { mapPane } from '../map/mapLayerOrder';
import './observations.css';

/** WGS84 reference overlays keep their IDs. They never enter the incident hazard/road assessment. */
export function ResponseGisLayer({
  mapRef,
  records,
  selectedId,
  request,
  enabled,
  interactive,
  onSelect
}: {
  mapRef: React.MutableRefObject<L.Map | null>;
  records: GeometryRecord[];
  selectedId: string | null;
  request: { version: number; id: string | null };
  enabled: boolean;
  interactive: boolean;
  onSelect: (id: string) => void;
}): null {
  const action = useRef(onSelect);
  action.current = onSelect;
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !enabled) return;
    const group = L.layerGroup().addTo(map);
    for (const record of records.filter((r) => r.visible)) {
      const observation = observationOf(record),
        selected = record.id === selectedId;
      const color = observation
        ? observationColor(observation.kind)
        : record.role === 'aoi'
          ? '#219a7d'
          : record.role === 'footprint'
            ? '#3186bc'
            : '#b87919';
      const layer = L.geoJSON(record.feature, {
        pane: mapPane('boundary'),
        interactive,
        style: {
          color,
          weight: selected ? 3 : 1.5,
          fillOpacity: 0.03,
          dashArray: record.role === 'footprint' ? '7 4' : undefined
        },
        pointToLayer: (_, position) => {
          if (!observation)
            return L.circleMarker(position, {
              pane: mapPane('selection'),
              radius: selected ? 6 : 4,
              color: '#fff',
              weight: 1.5,
              fillColor: color,
              fillOpacity: 1,
              interactive
            });
          return observationMarker(position, record, observation, {
            pane: mapPane('selection'),
            selected,
            interactive
          });
        }
      }).addTo(group);
      const label = document.createElement('span');
      label.textContent = record.name;
      layer.bindTooltip(label, {
        direction: 'top',
        permanent: selected,
        className: 'field-map-tooltip'
      });
      if (interactive)
        layer.on('click', (event) => {
          L.DomEvent.stopPropagation(event.originalEvent);
          action.current(record.id);
        });
    }
    return () => {
      group.remove();
    };
  }, [mapRef, records, selectedId, enabled, interactive]);
  const last = useRef(0);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !enabled || request.version === last.current) return;
    last.current = request.version;
    // Only an explicit cross-screen request changes the response map view.
    if (!request.id) return;
    const record = records.find((r) => r.id === request.id);
    if (!record) return;
    const bounds = L.geoJSON(record.feature).getBounds();
    if (bounds.isValid())
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 16, animate: false });
  }, [mapRef, request, records, enabled]);
  return null;
}
