import type { GeometryRecord, VectorFeature, VectorGeometry } from '../../geo/vector/types';
import { canFinish, horizontalLength, radiusRing, rectangleRing, type MeasurePoint, type SketchMode } from '../measurement/core';

export type DrawKind = 'point' | 'line' | 'polygon' | 'rectangle' | 'circle' | 'note';
export const drawKinds: DrawKind[] = ['point', 'line', 'polygon', 'rectangle', 'circle', 'note'];
/** Each shape is sketched with the matching measurement mode, so it shares vertex editing. */
export const kindMode: Record<DrawKind, SketchMode> = {
  point: 'location', line: 'distance', polygon: 'area', rectangle: 'rectangle', circle: 'radius', note: 'location'
};

const position = (point: MeasurePoint): [number, number] => [point.lng, point.lat];
const closedRing = (points: MeasurePoint[]) => [...points, points[0]].map(position);

/**
 * GeoJSON for a finished drawing. RFC 7946 has no circle: circles and rectangles are Polygons
 * whose `shape`, `center`, `radius_m` and `corners` keep the original construction.
 */
export function drawnFeature(kind: DrawKind, points: MeasurePoint[], name: string, note = ''): VectorFeature | null {
  if (!canFinish(kindMode[kind], points)) return null;
  const properties: Record<string, unknown> = { name, shape: kind };
  let geometry: VectorGeometry;
  if (kind === 'point' || kind === 'note') {
    geometry = { type: 'Point', coordinates: position(points[0]) };
    if (kind === 'note') properties.note = note;
  } else if (kind === 'line') geometry = { type: 'LineString', coordinates: points.map(position) };
  else if (kind === 'polygon') geometry = { type: 'Polygon', coordinates: [closedRing(points)] };
  else if (kind === 'rectangle') {
    geometry = { type: 'Polygon', coordinates: [closedRing(rectangleRing(points))] };
    properties.corners = points.map(position);
  } else {
    geometry = { type: 'Polygon', coordinates: [closedRing(radiusRing(points))] };
    properties.center = position(points[0]);
    properties.radius_m = Math.round(horizontalLength(points) * 10) / 10;
  }
  return { type: 'Feature', geometry, properties };
}

/** A reference record for the GIS session; drawings are never an assessment area by themselves. */
export function drawingRecord(feature: VectorFeature, name: string, sourceName: string): GeometryRecord {
  return { id: crypto.randomUUID(), name: name.slice(0, 160), feature, role: 'reference', visible: true,
    source: { name: sourceName, format: 'drawing', importedAt: new Date().toISOString() } };
}
