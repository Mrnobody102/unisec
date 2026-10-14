import { describe, expect, it } from 'vitest';
import { captureTime } from './captureMetadata';
import { validateObservation } from './model';
const observation = {
  schema: 'field-observation/v1',
  kind: 'survey',
  note: '',
  observer: '',
  observedAt: '',
  accuracyM: null,
  status: 'unreviewed',
  photos: [],
  updatedAt: '2026-10-12T00:00:00Z'
};
describe('capture time provenance', () => {
  it('retains unknown-zone EXIF wall time without inventing an instant', () => {
    expect(captureTime('2026:09:29 08:30:15')).toEqual({
      local: '2026-09-29T08:30:15',
      instant: '',
      source: ''
    });
    expect(
      validateObservation({
        ...observation,
        observedLocalTime: '2026-09-29T08:30:15'
      }).observedAt
    ).toBe('');
  });
  it('resolves a recorded EXIF offset and embedded ISO offset', () => {
    expect(captureTime('2026:09:29 08:30:15', '+07:00')?.instant).toBe(
      '2026-09-29T01:30:15.000Z'
    );
    expect(captureTime('2026-09-29T08:30:15.123+07:00')?.instant).toBe('2026-09-29T01:30:15.123Z');
    expect(captureTime('2026-09-29T08:30:15+07:00')?.instant).toBe(
      '2026-09-29T01:30:15.000Z'
    );
  });
  it('rejects invalid days, offsets and ambiguous or date-only input', () => {
    for (const value of [
      '2026:02:29 08:00:00',
      '2026-09-31T12:00:00Z',
      '2026-09-29T24:00:00',
      '09/29/2026',
      '2026-09-29'
    ])
      expect(captureTime(value)).toBeNull();
    expect(captureTime('2024:02:29 08:00:00')).not.toBeNull();
    expect(captureTime('2026:09:29 08:30:15', '+14:30')).toBeNull();
    expect(captureTime('2026:09:29 08:30:15', '+24:00')).toBeNull();
  });
  it('rejects conflicting instant and unknown-zone time', () => {
    expect(() =>
      validateObservation({
        ...observation,
        observedLocalTime: '2026-09-29T08:30:15Z'
      })
    ).toThrow();
    expect(() =>
      validateObservation({ ...observation, observedAt: '2026-09-29T08:30:15' })
    ).toThrow();
    expect(() =>
      validateObservation({
        ...observation,
        observedAt: '2026-09-29T01:30:15Z',
        observedLocalTime: '2026-09-29T08:30:15'
      })
    ).toThrow();
  });
});
