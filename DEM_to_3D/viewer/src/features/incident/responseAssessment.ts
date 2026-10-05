import type { Hazard, ScenarioRoutePair } from '../../types/dear';

export type CommunitySignal = { communication: 'lost' | 'available' | 'unknown'; urgentNeed: boolean };
export type ResponseAssessment = {
  priority: 1 | 2 | 3;
  access: 'blocked' | 'uncertain' | 'unverified' | 'unmapped';
  reason: [vi: string, en: string];
  nextAction: [vi: string, en: string];
  hazardIds: string[];
  methodVersion: 'access-v1';
};

/** Prepared assessment policy. No LLM, isolation score, or inferred safe route.
 * Unknown coverage remains unknown. Operational thresholds require PO/RS review.
 */
export function assessCommunity(pair: ScenarioRoutePair | undefined, hazards: Hazard[], signal: CommunitySignal): ResponseAssessment {
  const routes = [pair?.direct, pair?.candidate].filter(route => route != null);
  const affected = [...new Map(routes.flatMap(route => route.segs).filter(road => road.status !== 'open').map(road => [road.id, road])).values()];
  const hazardIds = [...new Set(affected.flatMap(road => road.hz ? [road.hz] : []))];
  const reportedImpact = hazardIds.some(id => hazards.find(hazard => hazard.id === id)?.observation === 'reported');
  const access = !routes.length ? 'unmapped' : routes.every(route => route.status === 'blocked') ? 'blocked'
    : routes.some(route => route.status === 'uncertain') ? 'uncertain' : 'unverified';
  const priority = signal.urgentNeed || reportedImpact || (signal.communication === 'lost' && affected.length > 0) ? 1
    : access === 'unverified' && signal.communication === 'available' ? 3 : 2;
  const reason: ResponseAssessment['reason'] = signal.urgentNeed
    ? ['Có yêu cầu hỗ trợ khẩn cấp', 'Urgent assistance requested']
    : signal.communication === 'lost' && affected.some(road => road.status === 'blocked')
    ? ['Có đường bị chặn và mất liên lạc với địa bàn', 'Access road blocked and community contact lost']
    : reportedImpact
    ? ['Có báo cáo ảnh hưởng trên đường tiếp cận', 'Reported impact on the access route']
    : access === 'unmapped'
    ? ['Chưa đủ dữ liệu đường vào để đánh giá tiếp cận', 'Insufficient road data to assess access']
    : access === 'uncertain'
    ? ['Có đoạn đường chưa xác minh khả năng đi qua', 'An access section has unverified passability']
    : ['Chưa ghi nhận đoạn bị chặn trên tuyến đã biết', 'No blockage reported on mapped routes'];
  const nextAction: ResponseAssessment['nextAction'] = access === 'blocked'
    ? ['Xác minh phương án tiếp cận khác', 'Verify another access option']
    : access === 'unmapped'
    ? ['Bổ sung tuyến đường và tin hiện trường', 'Obtain road geometry and field observations']
    : access === 'uncertain'
    ? ['Kiểm tra đoạn chưa rõ trước khi sử dụng tuyến', 'Verify uncertain sections before using the route']
    : ['Xác minh khả năng đi qua toàn tuyến', 'Verify full-route passability'];
  return { priority, access, reason, nextAction, hazardIds, methodVersion: 'access-v1' };
}
