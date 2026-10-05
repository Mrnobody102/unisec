import { describe, expect, it } from 'vitest';
import { resolveCommunityFindings } from './resolveCommunityFindings';
import { initialEvidence, scenarioEvidence } from '../../data/cheTaoEvidence';
import type { CommunityFinding } from '../../types/dear';

describe('community observations', () => {
  it('updates the observation, source and time together when a new report replaces a record', () => {
    const fact: CommunityFinding = { kind: 'report', label: ['Vượt khe', 'Crossing'], value: ['Nội dung cũ', 'Old finding'], hazardId: 'U-1' };
    const initial = resolveCommunityFindings([fact], initialEvidence)[0];
    const updated = resolveCommunityFindings([fact], scenarioEvidence(true))[0];
    expect(initial.observedAt).toBe('2026-09-29T08:58:00+07:00');
    expect(updated.observedAt).toBe('2026-09-29T09:40:00+07:00');
    expect(updated.receivedAt).toBe('2026-09-29T09:45:00+07:00');
    expect(updated.value[0]).toContain('không thể qua');
    expect(fact.value[0]).toBe('Nội dung cũ');
  });
  it('keeps an information gap separate from observations and their sources', () => {
    const gap: CommunityFinding = { kind: 'gap', label: ['Hộ bị ảnh hưởng', 'Affected households'], value: ['Chưa có thống kê', 'Unknown'] };
    expect(resolveCommunityFindings([gap], initialEvidence)).toEqual([gap]);
  });
  it('accepts earlier tuple records without inventing a timestamp or hazard relationship', () => {
    const legacy = resolveCommunityFindings([['Ghi nhận cũ', 'Legacy observation', 'Nguồn cũ', 'Legacy source']], initialEvidence)[0];
    expect(legacy.kind).toBe('context');
    expect(legacy.source).toEqual(['Nguồn cũ', 'Legacy source']);
    expect(legacy.observedAt).toBeUndefined();
    expect(legacy.hazardId).toBeUndefined();
  });
});
