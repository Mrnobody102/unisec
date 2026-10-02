import type { ScenarioRoutePair } from '../../types/dear';

/** Summarize only mapped access options; missing routes never imply isolation. */
export function communityAccessText(pair: ScenarioRoutePair | undefined): [string, string] {
  const routes = [pair?.direct, pair?.candidate].filter(route => route != null);
  if (!routes.length) return ['Chưa có tuyến để đánh giá', 'No mapped access route'];
  if (routes.every(route => route.status === 'blocked')) return routes.length > 1
    ? ['Các tuyến đã biết đều bị chặn', 'All mapped routes blocked']
    : ['Tuyến đã biết bị chặn', 'Mapped route blocked'];
  if (pair?.direct?.status === 'blocked') return ['Đường chính bị chặn, đường vòng cần xác minh', 'Main road blocked; bypass needs verification'];
  if (routes.some(route => route.status === 'uncertain')) return ['Tuyến tiếp cận cần xác minh', 'Access route needs verification'];
  return ['Chưa xác minh khả năng đi qua', 'Passability unverified'];
}
