import { describe, expect, it } from 'vitest';
import { localClock, observationTime, sourceObservedAt } from './sourceTime';

describe('incident observation times', () => {
  it('shows UTC+7 regardless of the input timezone, including midnight rollover', () => {
    expect(localClock('2026-09-29T01:58:00+00:00')).toBe('08:58');
    expect(localClock('2026-09-29T17:10:00+00:00')).toBe('00:10');
  });
  it('changes a source time only when its update is applied', () => {
    const source = { id: 'field', name: ['Field', 'Field'] as [string, string], note: ['Observation', 'Observation'] as [string, string],
      observedAt: '2026-09-29T08:58:00+07:00', observedAtUpdated: '2026-09-29T09:40:00+07:00' };
    expect(sourceObservedAt(source, false)).toBe(source.observedAt);
    expect(sourceObservedAt(source, true)).toBe(source.observedAtUpdated);
    expect(sourceObservedAt({ ...source, observedAtUpdated: undefined }, true)).toBe(source.observedAt);
  });
  it('preserves the observation date when UTC+7 crosses midnight', () => {
    const display = observationTime('2026-09-29T17:10:00+00:00', 'vi');
    expect(display).toContain('00:10');
    expect(display).toContain('30/09/2026');
  });
});
