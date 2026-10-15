import { describe, expect, it } from 'vitest';
import { findingAddsDetail } from './findingPresentation';

describe('finding presentation', () => {
  it('hides a finding that only restates the title', () => {
    expect(findingAddsDetail('Điểm nghi sạt lở gần Khau Mang', 'Điểm nghi sạt lở gần đường vào Khau Mang.')).toBe(false);
    expect(findingAddsDetail('Điểm nghi sạt lở gần Lao Mải', 'Điểm nghi sạt lở gần Lao Mải.')).toBe(false);
  });
  it('keeps a finding with real detail', () => {
    expect(findingAddsDetail('Sạt lở trên đường chính vào Nậm Khắt', 'Đất đá vùi lấp khoảng 80 m mặt đường. Xe cơ giới không thể qua.')).toBe(true);
  });
});
