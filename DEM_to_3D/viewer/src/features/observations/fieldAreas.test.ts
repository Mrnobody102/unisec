import { formatArea } from '../geodata/geometryPresentation';
import { describe, expect, it } from 'vitest';
import { createGeometryRecords } from '../geodata/geometrySession';
import { parseSpatialInput } from '../geodata/parseSpatialInput';
import {
  exportGeometryGeoJSON,
  exportGeometryKml
} from '../geodata/geometryExports';
import {
  createFieldArea,
  linkedFieldAreas,
  removeWithFieldAreas,
  fieldAreaOf
} from './fieldAreas';
const point = () =>
  createGeometryRecords(
    {
      format: 'coordinate',
      features: [
        {
          type: 'Feature',
          properties: { name: 'Field point' },
          geometry: { type: 'Point', coordinates: [104, 21] }
        }
      ]
    },
    'GPS',
    'reference'
  )[0];
const polygon = {
  type: 'Polygon' as const,
  coordinates: [
    [
      [104, 21],
      [104.001, 21],
      [104.001, 21.001],
      [104, 21]
    ]
  ]
};
it('keeps small manually drawn areas readable instead of rounding to zero km²', () => {
  expect(formatArea(124.5, 'en')).toBe('124.5 m²');
  expect(formatArea(20_000, 'en')).toBe('2 ha');
  expect(formatArea(2_000_000, 'en')).toBe('2 km²');
});

describe('field point and manual suspected areas', () => {
  it('stores multiple areas as references and cascades point removal in one edit', () => {
    const p = point(),
      a = createFieldArea(p, polygon, 'A'),
      b = createFieldArea(p, polygon, 'B');
    const unrelated = point();
    const all = [p, a, b, unrelated];
    expect(linkedFieldAreas(all, p.id)).toEqual([a, b]);
    expect(a.role).toBe('reference');
    expect(fieldAreaOf(a)?.status).toBe('unreviewed');
    expect(removeWithFieldAreas(all, p.id)).toEqual([unrelated]);
    expect(removeWithFieldAreas(all, a.id)).toEqual([p, b, unrelated]);
  });
  for (const format of ['GeoJSON'])
    it(`remaps ${format} associations with fresh IDs on import`, () => {
      const p = point(),
        a = createFieldArea(p, polygon, 'A');
      const text =
        format === 'GeoJSON'
          ? exportGeometryGeoJSON([p, a])
          : exportGeometryKml([p, a]);
      const restored = createGeometryRecords(
        parseSpatialInput(text),
        format,
        'auto'
      );
      expect(restored[0].id).not.toBe(p.id);
      expect(linkedFieldAreas(restored, restored[0].id)).toHaveLength(1);
      expect(linkedFieldAreas([p, a, ...restored], p.id)).toHaveLength(1);
    });
  it('does not bind an imported orphan area to an existing point', () => {
    const p = point(),
      a = createFieldArea(p, polygon, 'A');
    const imported = createGeometryRecords(
      parseSpatialInput(exportGeometryGeoJSON([a])),
      'GeoJSON',
      'auto'
    );
    expect(linkedFieldAreas([p, ...imported], p.id)).toHaveLength(0);
  });
  it('requires valid polygon and point geometries', () => {
    const p = point();
    expect(() =>
      createFieldArea(p, { type: 'Point', coordinates: [104, 21] }, 'A')
    ).toThrow();
    expect(() =>
      createFieldArea(createFieldArea(p, polygon, 'A'), polygon, 'B')
    ).toThrow();
  });
});
