import { describe, expect, it } from 'vitest';
import { photoSummary } from './photoSummary';
import { photoCaptureLabel } from './captureMetadata';
import type { FieldPhoto } from './model';
const photo: FieldPhoto = {
  id: 'photo-1',
  name: 'field.jpg',
  mime: 'image/jpeg',
  bytes: 100,
  width: 10,
  height: 10,
  preview: 'data:image/jpeg;base64,AA==',
  sha256: '0'.repeat(64),
  addedAt: '2026-09-29T01:30:15Z',
  exif: {
    DateTimeOriginal: '2026:09:29 08:30:15',
    OffsetTimeOriginal: '+07:00',
    latitude: 21.7833333,
    longitude: 104.05,
    Make: 'Test',
    Model: 'Camera'
  }
};
const reported = {
  observedAt: '2026-09-29T01:30:15Z',
  coordinates: [104.05, 21.783333]
};
describe('photo metadata in report context', () => {
  it('hides duplicate capture time and coordinates but keeps them in the photo source', () => {
    expect(photoSummary(photo, reported)).toMatchObject({
      showTime: false,
      showGps: false,
      showCamera: false,
      differentTime: false,
      differentLocation: false
    });
    expect(photo.exif.latitude).toBe(21.7833333);
    expect(photoSummary(photo)).toMatchObject({
      showTime: true,
      showGps: true,
      showCamera: true
    });
  });
  it('keeps differing capture time and coordinates visible for review', () => {
    expect(
      photoSummary(photo, {
        observedAt: '2026-09-29T02:30:15Z',
        coordinates: [104.06, 21.78]
      })
    ).toMatchObject({
      showTime: true,
      showGps: true,
      differentTime: true,
      differentLocation: true
    });
  });
  it('does not claim time equality when only one side has a timezone', () => {
    const unknownZone = {
      ...photo,
      exif: { ...photo.exif, OffsetTimeOriginal: '' }
    };
    expect(photoSummary(unknownZone, reported).showTime).toBe(true);
    expect(
      photoSummary(photo, { observedLocalTime: '2026-09-29T08:30:15' }).showTime
    ).toBe(true);
    expect(
      photoSummary(unknownZone, { observedLocalTime: '2026-09-29T08:30:15' })
        .showTime
    ).toBe(false);
  });
  it('retains an embedded camera offset rather than labeling its wall time UTC', () => {
    const embedded = {
      ...photo,
      exif: { DateTimeOriginal: '2026-09-29T08:30:15+07:00' }
    };
    expect(photoCaptureLabel(embedded, 'en')).toContain('+07:00');
    expect(photoCaptureLabel(embedded, 'en')).not.toContain('UTC');
    expect(
      photoCaptureLabel(
        { ...photo, exif: { DateTimeOriginal: '2026-09-29T08:30:15Z' } },
        'en'
      )
    ).toContain('UTC');
  });
});
