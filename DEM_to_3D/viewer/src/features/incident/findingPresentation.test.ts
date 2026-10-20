import {findingStatesArea} from './findingPresentation';
import { describe, expect, it } from 'vitest';
import type { CommunityFinding } from '../../types/dear';
import { hazardObservationText, roadEvidence, contactAlreadySummarized, findingAddsDetail } from './findingPresentation';

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


describe('observation and road evidence', () => {
  it('keeps an image interpretation unconfirmed even when its linked road is blocked', () => {
    const hazard = {id:'scar',kind:'landslide',observation:'suspected'} as import('../../types/dear').Hazard;
    expect(hazardObservationText(hazard,'vi')).toBe('Chưa kiểm chứng thực địa');
    expect(hazardObservationText({...hazard,observation:'reported'},'vi')).toBe('Có báo cáo sạt lở');
    expect(hazardObservationText(hazard,'en',true)).toBe('Checked, not confirmed');
  });
  it('uses field evidence before interpretations regardless of input order and retains all records', () => {
    const road = {hazardIds:['scar','report']} as import('../../types/dear').RoadSegment;
    const image = {id:'image',hazardId:'scar',type:'image-analysis',observedAt:'2026-09-12T10:43:00Z'} as import('../../types/dear').IncidentEvidence;
    const field = {...image,id:'field',hazardId:'report',type:'field-report'} as import('../../types/dear').IncidentEvidence;
    const old = {...field,id:'old',observedAt:'2026-09-11T10:43:00Z'};
    const source = [image,old,field];
    expect(roadEvidence(road,source).map(record=>record.id)).toEqual(['field','old','image']);
    expect(source.map(record=>record.id)).toEqual(['image','old','field']);
  });
});

it('does not repeat a measured area already stated in hectares by the finding',()=>{
  expect(findingStatesArea('Vết sạt 1,5 ha cắt qua đường.',1.5)).toBe(true);
  expect(findingStatesArea('A 1.5 ha scar crosses the road.',1.5)).toBe(true);
  expect(findingStatesArea('Vết sạt 11,5 ha.',1.5)).toBe(false);
  expect(findingStatesArea('Vết sạt rộng 80 m.',.8)).toBe(false);
});
