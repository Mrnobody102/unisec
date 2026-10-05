import * as L from 'leaflet';
import type { RoadSegment } from '../../types/dear';
import { roadColors } from '../../terrain/roadStyle';
import { mapPane } from './mapLayerOrder';

type Props = {
  road: RoadSegment; points: L.LatLng[]; layer: L.LayerGroup;
  selected: boolean; inspected: boolean; warning: boolean; imagery: boolean;
  networkOpacity: number; onSelect: () => void;
};

/** Selection tolerance is independent of the cartographic stroke width. */
export function addRoadLayers({ road, points, layer, selected, inspected, warning, imagery, networkOpacity, onSelect }: Props) {
  const pane = mapPane(warning ? 'roadStatus' : selected ? 'route' : 'roads');
  const color = warning ? roadColors[road.status as 'blocked' | 'uncertain']
    : selected ? roadColors.selected : imagery ? roadColors.networkImagery : roadColors.networkTerrain;
  const weight = selected || inspected ? 4 : 2.5;
  const opacity = selected || inspected || warning ? 1 : networkOpacity;
  const casingColor = inspected ? roadColors.inspectedCasing : selected && !warning ? roadColors.selectedCasing : roadColors.neutralCasing;
  const casing = L.polyline(points, { pane, color: casingColor, weight: weight + (inspected ? 4 : 2), opacity: opacity * 0.8, interactive: false }).addTo(layer);
  L.polyline(points, { pane, color, weight, opacity, interactive: false,
    dashArray: warning && road.status === 'uncertain' ? '7 5' : undefined }).addTo(layer);
  const touch = window.matchMedia('(pointer: coarse)').matches;
  const target = L.polyline(points, { pane, color: 'transparent', weight: touch ? 24 : 16,
    opacity: 1, bubblingMouseEvents: false, className: 'map-road-target' }).addTo(layer);
  target.getElement()?.setAttribute('data-road-id', road.id);
  target.on('click', onSelect);
  target.on('mouseover', () => casing.setStyle({ color: roadColors.inspectedCasing, opacity: 0.85, weight: weight + 4 }));
  target.on('mouseout', () => casing.setStyle({ color: casingColor, opacity: opacity * 0.8, weight: weight + (inspected ? 4 : 2) }));
}
