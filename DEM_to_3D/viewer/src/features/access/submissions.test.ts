import { describe, expect, it } from 'vitest';
import { validIdentity, type DemoIdentity } from './demoSession';
import { newSubmission, canEditSubmission, submissionKey } from './submissions';
import type { GeometryRecord } from '../../geo/vector/types';
const resident: DemoIdentity = {
  id: 'resident:a',
  role: 'resident',
  name: 'A',
  communityId: null
};
const record: GeometryRecord = {
  id: 'point',
  name: 'A',
  visible: true,
  role: 'reference',
  source: {
    name: 'GPS',
    format: 'coordinate',
    importedAt: '2026-10-12T00:00:00Z'
  },
  feature: {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [104, 21] },
    properties: { [submissionKey]: newSubmission(resident, 'photo') }
  }
};
describe('demo personas and field report ownership', () => {
  it('does not accept unknown roles or empty identities', () => {
    expect(validIdentity(resident)).toBe(true);
    expect(validIdentity({ ...resident, role: 'admin' })).toBe(false);
    expect(validIdentity({ ...resident, name: ' ' })).toBe(false);
  });
  it('allows managers and the owner of a pending report, not other residents', () => {
    expect(canEditSubmission(resident, record)).toBe(true);
    expect(canEditSubmission({ ...resident, id: 'other' }, record)).toBe(false);
    expect(
      canEditSubmission({ ...resident, id: 'manager', role: 'manager' }, record)
    ).toBe(true);
  });
  it('requires a reviewed report to be amended by a coordinator', () => {
    const checked = {
      ...record,
      feature: {
        ...record.feature,
        properties: {
          [submissionKey]: {
            ...newSubmission(resident, 'photo'),
            review: {
              status: 'checked',
              note: 'Checked',
              reviewer: 'M',
              reviewedAt: '2026-10-12T00:00:00Z'
            }
          }
        }
      }
    };
    expect(canEditSubmission(resident, checked)).toBe(false);
  });
});
