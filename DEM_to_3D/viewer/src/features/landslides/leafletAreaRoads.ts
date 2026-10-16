import * as L from 'leaflet';
import type { RoadSegment } from '../../types/dear';
import { roadGeographic } from '../routes/selectedRoadJourney';
import { roadAreaSection, landslideAreaStyle, type LandslideArea } from './landslideAreas';
/** A wide, translucent casing identifies only the linked interval; road status stays readable. */
export function addAreaRoadSections(group: L.LayerGroup, area: LandslideArea, roads: RoadSegment[], pane: string): void {
  for (const link of area.roadLinks) {
    const road = roads.find(r => r.id === link.roadId);
    if (!road) continue;
    const points = roadAreaSection(road, link).map(p => { const v = roadGeographic(p); return L.latLng(v.latitude, v.longitude); });
    if (points.length > 1) L.polyline(points, { pane, color: landslideAreaStyle(area).color, weight: 9, opacity: .3, dashArray: link.relation === 'threatens' ? '5 5' : undefined, interactive: false }).addTo(group);
  }
}
