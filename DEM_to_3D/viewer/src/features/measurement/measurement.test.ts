import { describe, expect, it } from 'vitest';
import { canFinish, gridBearing, interiorAngle, horizontalArea, horizontalLength, measurementPoint, measurementPreviewPoints, projectedMeasurementPoint, radiusRing } from './measurement';
import { formatArea, formatDistance, defaultMeasureUnits } from './measurementResults';
import { snapMeasurement } from './measurementGeometry';

describe('operator grid measurements', () => {
  const p = (x: number, y: number) => ({ x: x + 400000, y: y + 2400000, lat: 21.72, lng: 104.03 });
  it('measures horizontal segments and a closed perimeter in metres', () => {
    expect(horizontalLength([p(0, 0), p(300, 400), p(600, 0)])).toBe(1000);
    expect(horizontalLength([p(0, 0), p(100, 0), p(100, 100), p(0, 100)], true)).toBe(400);
  });
  it('measures polygon area independently of winding and rejects crossings', () => {
    const square = [p(0, 0), p(100, 0), p(100, 100), p(0, 100)];
    expect(horizontalArea(square)).toBe(10000);
    expect(horizontalArea([...square].reverse())).toBe(10000);
    expect(horizontalArea([square[0], square[2], square[1], square[3]])).toBeNull();
    expect(horizontalArea([p(0, 0), p(100, 0), p(200, 0)])).toBeNull();
  });
  it('projects actual geographic coordinates and refuses points outside UTM 48N', () => {
    expect(measurementPoint(0, 105)?.x).toBeCloseTo(500000, 3);
    expect(measurementPoint(21.72, 104.03)?.y).toBeGreaterThan(2400000);
    expect(measurementPoint(21, 115)).toBeNull();
    expect(measurementPoint(NaN, 105)).toBeNull();
  });
  it('uses grid north for bearing and the middle point for interior angle', () => {
    expect(gridBearing(p(0, 0), p(0, 100))).toBe(0);
    expect(gridBearing(p(0, 0), p(100, 0))).toBe(90);
    expect(gridBearing(p(0, 0), p(0, -100))).toBe(180);
    expect(gridBearing(p(0, 0), p(-100, 0))).toBe(270);
    expect(gridBearing(p(0, 0), p(0, 0))).toBeNull();
    expect(interiorAngle([p(0, 0), p(100, 0), p(100, 100)])).toBe(90);
    expect(interiorAngle([p(0, 0), p(100, 0), p(200, 0)])).toBe(180);
    expect(canFinish('angle', [p(0, 0), p(0, 0), p(100, 0)])).toBe(false);
  });
  it('constructs circles in the projected grid and validates fixed-point tools', () => {
    const center = projectedMeasurementPoint(400000, 2400000)!;
    const edge = projectedMeasurementPoint(400100, 2400000)!;
    const ring = radiusRing([center, edge]);
    expect(ring).toHaveLength(72);
    ring.forEach(point => expect(horizontalLength([center, point])).toBeCloseTo(100, 6));
    expect(canFinish('radius', [center, edge])).toBe(true);
    expect(canFinish('radius', [center, center])).toBe(false);
    expect(canFinish('bearing', [center, edge, center])).toBe(false);
    expect(canFinish('location', [center, edge])).toBe(false);
    const boundary = measurementPoint(0.00001, 105)!;
    expect(canFinish('radius', [boundary, projectedMeasurementPoint(boundary.x + 100, boundary.y)!])).toBe(false);
  });
  it('converts units without changing the measured geometry', () => {
    expect(formatDistance(1500, defaultMeasureUnits, 'en')).toBe('1.5 km');
    expect(formatDistance(1500, { ...defaultMeasureUnits, distance: 'm' }, 'en')).toBe('1,500 m');
    expect(formatArea(10000, defaultMeasureUnits, 'en')).toBe('1 ha');
    expect(formatArea(1000000, defaultMeasureUnits, 'en')).toBe('1 km²');
    expect(formatArea(10000, { ...defaultMeasureUnits, area: 'm2' }, 'en')).toBe('10,000 m²');
  });
  it('does not invalidate a polygon preview when hovering its last or first vertex', () => {
    const points = [p(0, 0), p(100, 0), p(100, 100)];
    expect(measurementPreviewPoints('area', points, points.at(-1))).toBe(points);
    expect(measurementPreviewPoints('area', points, points[0])).toBe(points);
    expect(horizontalArea(measurementPreviewPoints('area', points, points[0]))).toBe(5000);
  });
  it('snaps to edges within a screen-pixel tolerance that follows zoom', () => {
    const a = projectedMeasurementPoint(400000, 2400000)!;
    const b = projectedMeasurementPoint(400100, 2400000)!;
    const cursor = projectedMeasurementPoint(400050, 2400005)!;
    const sources = [{ name: 'Road', points: [a, b] }];
    const hit = snapMeasurement(cursor, sources, point => ({ x: point.x, y: point.y }));
    expect(hit.name).toBe('Road'); expect(hit.point.y).toBe(2400000); expect(hit.point.x).toBe(400050);
    expect(snapMeasurement(cursor, sources, point => ({ x: point.x * 4, y: point.y * 4 })).name).toBeUndefined();
    expect(snapMeasurement(cursor, [], point => point).point).toBe(cursor);
  });
});
