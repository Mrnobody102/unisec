import { describe, it, expect } from 'vitest';
import {
  annotateRecord,
  observationOf,
  validateObservation,
  validPhoto,
  observationKey,
  type FieldObservation
} from './model';
import {
  createGeometryRecords,
  restoreGeometryRecords
} from '../geodata/geometrySession';
import {
  exportGeometryGeoJSON,
  exportGeometryKml
} from '../geodata/geometryExports';
const original = createGeometryRecords(
  {
    features: [
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [104.053554, 21.782919, 12] },
        properties: { name: 'Survey', description: 'Source note', sample: 42 }
      }
    ],
    format: 'KML'
  },
  'survey.kml',
  'reference'
)[0];
const observation: FieldObservation = {
  schema: 'field-observation/v1',
  kind: 'suspected-landslide',
  note: 'Rock fall observed',
  observer: 'Survey team',
  observedAt: '2026-10-12T01:00:00Z',
  accuracyM: 8,
  status: 'unreviewed',
  updatedAt: '2026-10-12T01:10:00Z',
  photos: []
};
describe('field observation contract', () => {
  it('retains imported coordinates, altitude, ID, provenance and attributes while annotating', () => {
    const record = annotateRecord(original, observation);
    expect(record.id).toBe(original.id);
    expect(record.source).toEqual(original.source);
    expect(record.feature.geometry).toEqual(original.feature.geometry);
    expect(record.feature.properties.sample).toBe(42);
    expect(original.feature.properties[observationKey]).toBeUndefined();
    expect(observationOf(restoreGeometryRecords([record])[0])).toEqual(
      observation
    );
    const exported = JSON.parse(exportGeometryGeoJSON([record]));
    expect(exported.features[0].properties[observationKey]).toEqual(
      observation
    );
    expect(exportGeometryKml([record])).toContain('dearObservation');
    expect(
      observationOf({
        ...record,
        feature: {
          ...record.feature,
          properties: { dearObservation: JSON.stringify(observation) }
        }
      })
    ).toEqual(observation);
  });
  it('does not promote an unreviewed observation to an incident hazard or AOI', () => {
    const record = annotateRecord(original, observation);
    expect(record.role).toBe('reference');
    expect(() =>
      validateObservation({ ...observation, status: 'confirmed' })
    ).toThrow();
    expect(() =>
      annotateRecord(
        {
          ...original,
          feature: {
            ...original.feature,
            geometry: {
              type: 'LineString',
              coordinates: [
                [104, 21],
                [104.1, 21.1]
              ]
            }
          }
        },
        observation
      )
    ).toThrow();
  });
  it('rejects remote or active-content photo previews and invalid metadata', () => {
    const photo = {
      id: 'p',
      name: 'photo.jpg',
      mime: 'image/jpeg',
      bytes: 100,
      width: 20,
      height: 20,
      preview: 'data:image/jpeg;base64,/9j/',
      sha256: 'a'.repeat(64),
      addedAt: observation.updatedAt,
      exif: { latitude: 21, longitude: 104 }
    };
    expect(validPhoto(photo)).toBe(true);
    for (const preview of [
      'https://example.com/track.jpg',
      'data:image/svg+xml,<svg/>',
      'javascript:alert(1)'
    ])
      expect(validPhoto({ ...photo, preview })).toBe(false);
    expect(validPhoto({ ...photo, exif: { ISO: Infinity } })).toBe(false);
    expect(() =>
      validateObservation({ ...observation, accuracyM: -1 })
    ).toThrow();
    expect(() =>
      validateObservation({ ...observation, photos: [photo, photo] })
    ).toThrow();
  });
  it('treats malformed imported observation metadata as plain reference data', () => {
    expect(
      observationOf({
        ...original,
        feature: {
          ...original.feature,
          properties: {
            dearObservation: {
              ...observation,
              photos: [{ preview: 'https://example.com/x' }]
            }
          }
        }
      })
    ).toBeNull();
  });
});
