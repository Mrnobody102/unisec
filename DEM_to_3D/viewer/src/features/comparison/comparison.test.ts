import { describe, expect, it } from 'vitest';
import { validateComparisonPair, type ComparisonPair } from './comparison';

const pair: ComparisonPair = {
  before: { url: 'before', filename: 'before.tif', bounds: [[21, 104], [22, 105]], source: 'Satellite A', acquiredAt: '2026-09-28T01:00:00Z', crs: 'EPSG:4326' },
  after: { url: 'after', filename: 'after.tif', bounds: [[21.5, 104.5], [22.5, 105.5]], source: 'Satellite A', acquiredAt: '2026-09-29T01:00:00Z', crs: 'EPSG:4326' }
};
describe('imagery comparison boundary', () => {
  it('accepts distinct dates with an overlapping footprint', () => expect(() => validateComparisonPair(pair)).not.toThrow());
  it('allows two acquisitions on the same day and checks the event boundary', () => {
    const sameDay = { ...pair, before: { ...pair.before, acquiredAt: '2026-09-29T02:00:00+07:00' }, after: { ...pair.after, acquiredAt: '2026-09-29T06:00:00+07:00' } };
    expect(() => validateComparisonPair(sameDay, '2026-09-29T04:00:00+07:00')).not.toThrow();
    expect(() => validateComparisonPair(sameDay, '2026-09-29T07:00:00+07:00')).toThrow('event-time');
    const invalid: ComparisonPair = structuredClone(sameDay); invalid.before.bounds[0][0] = NaN;
    expect(() => validateComparisonPair(invalid)).toThrow('georef');
  });
  it('rejects reversed dates, missing source and non-overlapping images', () => {
    expect(() => validateComparisonPair({ ...pair, after: { ...pair.after, acquiredAt: pair.before.acquiredAt } })).toThrow('dates');
    expect(() => validateComparisonPair({ ...pair, before: { ...pair.before, source: '' } })).toThrow('source');
    expect(() => validateComparisonPair({ ...pair, after: { ...pair.after, bounds: [[25, 110], [26, 111]] } })).toThrow('overlap');
  });
});
