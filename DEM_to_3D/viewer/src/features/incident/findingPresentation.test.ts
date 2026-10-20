import { describe, expect, it } from 'vitest';
import type { CommunityFinding } from '../../types/dear';
import { contactAlreadySummarized, findingAddsDetail } from './findingPresentation';

describe('finding presentation', () => {
  it('hides a finding that only restates the title', () => {
    expect(findingAddsDetail('Điểm nghi sạt lở gần Khau Mang', 'Điểm nghi sạt lở gần đường vào Khau Mang.')).toBe(false);
    expect(findingAddsDetail('Điểm nghi sạt lở gần Lao Mải', 'Điểm nghi sạt lở gần Lao Mải.')).toBe(false);
  });
  it('keeps a finding with real detail', () => {
    expect(findingAddsDetail('Sạt lở trên đường chính vào Nậm Khắt', 'Đất đá vùi lấp khoảng 80 m mặt đường. Xe cơ giới không thể qua.')).toBe(true);
  });
});


describe('contact summaries', () => {
  const finding: CommunityFinding = {kind: 'report', label: ['Liên lạc', 'Communications'], value: ['Mất liên lạc với bản.', 'Contact with the village lost.'], source: ['Tin từ xã', 'Commune focal point']};
  it('collapses only the same contact state already shown in the header', () => {
    expect(contactAlreadySummarized(finding, 'lost')).toBe(true);
    expect(contactAlreadySummarized(finding, 'available')).toBe(false);
    expect(contactAlreadySummarized(finding, 'unknown')).toBe(false);
    expect(contactAlreadySummarized({...finding, source: undefined}, 'lost')).toBe(false);
    expect(contactAlreadySummarized({...finding, value: ['Mất liên lạc với bản. Có người bị thương.', 'Contact lost. Injuries reported.']}, 'lost')).toBe(false);
  });
});
