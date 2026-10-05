import type { ScenarioRoutePair } from '../../types/dear';

/** Summarize only mapped access options; missing routes never imply isolation. */
export function communityAccessText(pair: ScenarioRoutePair | undefined): [string, string] {
  const routes = [pair?.direct, pair?.candidate].filter(route => route != null);
  if (!routes.length) return ['Chưa có tuyến để đánh giá', 'No mapped access route'];
  if (routes.every(route => route.status === 'blocked')) return routes.length > 1
    ? ['Các tuyến đã biết đều bị chặn', 'All mapped routes blocked']
    : ['Tuyến đã biết bị chặn', 'Mapped route blocked'];
  if (routes.some(route => route.status === 'blocked')) return ['Có tuyến bị chặn, tuyến khác cần xác minh', 'One route blocked, other access unverified'];
  if (routes.some(route => route.status === 'uncertain')) return ['Tuyến tiếp cận cần xác minh', 'Access route needs verification'];
  return ['Chưa xác minh khả năng đi qua', 'Passability unverified'];
}
