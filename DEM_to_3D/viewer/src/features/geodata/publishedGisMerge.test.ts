import { describe, expect, it } from 'vitest';
import type { GeometryRecord } from '../../geo/vector/types';
import { mergeRecords } from './publishedGis';

const record = (id: string, name = id): GeometryRecord => ({
  id, name, role: 'reference', visible: true,
  source: { name: 'test', format: 'drawing', importedAt: '2026-10-14T06:00:00Z' },
  feature: { type: 'Feature', geometry: { type: 'Point', coordinates: [104, 21.7] }, properties: { name } }
});

describe('concurrent GIS writes', () => {
  it('keeps a report another tab added while applying this tab\'s edit and removal', () => {
    const base = [record('a'), record('b')];
    const stored = [...base, record('resident-report')];
    const local = [record('a', 'a reviewed')];
    const out = mergeRecords(stored, base, local);
    expect(out.map(item => item.id)).toEqual(['a', 'resident-report']);
    expect(out[0].name).toBe('a reviewed');
  });

  it('adds new local records after the stored ones', () => {
    const base = [record('a')];
    expect(mergeRecords([record('a'), record('other')], base, [record('a'), record('mine')]).map(item => item.id))
      .toEqual(['a', 'other', 'mine']);
  });
});


it('does not overwrite another tab when an unchanged feature only has reordered JSON keys', () => {
  const base = record('a');
  const local = { ...base, feature: { properties: base.feature.properties, geometry: base.feature.geometry, type: base.feature.type } };
  expect(mergeRecords([record('a', 'Reviewed elsewhere')], [base], [local])[0].name).toBe('Reviewed elsewhere');
});
