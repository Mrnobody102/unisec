import { communityNeedTopic } from './communityNeeds';
import { describe, expect, it } from 'vitest';
import { resolveCommunityFindings } from './resolveCommunityFindings';
import { initialEvidence, scenarioEvidence } from '../../data/fixtures/networkScenario';
import type { CommunityFinding } from '../../types/dear';

describe('community observations', () => {
  it('updates the observation, source and time together when a new report replaces a record', () => {
    const fact: CommunityFinding = { kind: 'report', label: ['Vượt khe', 'Crossing'], value: ['Nội dung cũ', 'Old finding'], hazardId: 'U-1' };
    const initial = resolveCommunityFindings([fact], initialEvidence)[0];
    const updated = resolveCommunityFindings([fact], scenarioEvidence(true))[0];
    expect(initial.observedAt).toBe('2026-09-12T13:29:00+07:00');
    expect(updated.observedAt).toBe('2026-09-12T14:11:00+07:00');
    expect(updated.receivedAt).toBe('2026-09-12T14:16:00+07:00');
    expect(updated.value[0]).toContain('Không thể đi qua');
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

describe('community needs', () => {
  it('separates an assistance request from household counts and access evidence', () => {
    const finding: CommunityFinding = {kind: 'report', label: ['Nhu cầu hỗ trợ', 'Assistance needs'], value: ['Cần thuốc', 'Medication needed']};
    expect(communityNeedTopic(finding)).toBe('assistance');
    expect(communityNeedTopic({...finding, label: ['Hộ bị ảnh hưởng', 'Affected households']})).toBe('households');
    expect(communityNeedTopic({...finding, label: ['Đường bị chặn', 'Blocked road']})).toBeNull();
    expect(communityNeedTopic({...finding, label: ['Dân cư', 'Residents']})).toBeNull();
  });
});
