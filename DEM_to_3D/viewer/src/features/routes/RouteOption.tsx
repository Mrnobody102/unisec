import type { Locale, ScenarioRoute } from '../../types/dear';
import { StatusText } from '../../shared/ui/StatusText';

export function RouteOption({ route, selected, locale, onSelect }: {
  route: ScenarioRoute; selected: boolean; locale: Locale; onSelect: () => void;
}): JSX.Element {
  const t = (vi: string, en: string) => locale === 'vi' ? vi : en;
  const blocked = route.status === 'blocked';
  return <button className="route-card" aria-pressed={selected} onClick={onSelect}>
    <span className="route-option-heading">
      <span className="route-option-selector" aria-hidden="true">{selected && <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="m3 8 3 3 7-7"/></svg>}</span>
      <strong>{t(route.name[0], route.name[1])}</strong>
    </span>
    <span className="route-option-meta">
      <span>{route.lengthKm} km</span>
      {route.eta && <span>{route.eta.minMinutes} {t('đến', 'to')} {route.eta.maxMinutes} {t('phút nếu thông tuyến', 'min assuming passage')}</span>}
    </span>
    <span className="route-bottom">
      <StatusText tone={blocked ? 'critical' : 'warning'} icon={blocked ? 'blocked' : 'uncertain'}>
        {blocked ? t('Bị chặn', 'Blocked') : t('Cần xác minh', 'Verify access')}
      </StatusText>
    </span>
  </button>;
}
