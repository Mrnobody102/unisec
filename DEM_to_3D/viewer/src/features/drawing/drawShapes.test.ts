import { describe, expect, it } from 'vitest';
import { projectedMeasurementPoint } from '../measurement/core/geometry';
import { drawingRecord, drawnFeature } from './drawShapes';

const a = projectedMeasurementPoint(400000, 2400000)!;
const b = projectedMeasurementPoint(400100, 2400000)!;
const c = projectedMeasurementPoint(400100, 2400100)!;

describe('drawn shapes as GIS features', () => {
  it('keeps a circle as a closed polygon with its centre and radius', () => {
    const feature = drawnFeature('circle', [a, b], 'Circle 1')!;
    expect(feature.geometry.type).toBe('Polygon');
    const ring = (feature.geometry as GeoJSON.Polygon).coordinates[0];
    expect(ring[0]).toEqual(ring.at(-1));
    expect(feature.properties).toMatchObject({ shape: 'circle', center: [a.lng, a.lat], radius_m: 100 });
  });
  it('keeps a rectangle and its two construction corners', () => {
    const feature = drawnFeature('rectangle', [a, c], 'Box')!;
    expect((feature.geometry as GeoJSON.Polygon).coordinates[0]).toHaveLength(5);
    expect(feature.properties.corners).toEqual([[a.lng, a.lat], [c.lng, c.lat]]);
  });
  it('writes lines, areas, points and notes, and rejects incomplete shapes', () => {
    expect(drawnFeature('line', [a, b], 'Line')!.geometry).toEqual({ type: 'LineString', coordinates: [[a.lng, a.lat], [b.lng, b.lat]] });
    expect((drawnFeature('polygon', [a, b, c], 'Area')!.geometry as GeoJSON.Polygon).coordinates[0]).toHaveLength(4);
    expect(drawnFeature('note', [a], 'Bridge damaged', 'Bridge damaged\nNo trucks')!.properties).toMatchObject({ shape: 'note', note: 'Bridge damaged\nNo trucks' });
    expect(drawnFeature('polygon', [a, b], 'Area')).toBeNull();
  });
  it('stores a drawing as reference data from the drawing source', () => {
    const record = drawingRecord(drawnFeature('point', [a], 'P')!, 'P', 'Drawn on map');
    expect(record).toMatchObject({ role: 'reference', visible: true, source: { format: 'drawing', name: 'Drawn on map' } });
  });
});
