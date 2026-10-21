import type { Locale, ScenarioRoute } from '../../types/dear';
import { StatusText } from '../../shared/ui/StatusText';
import { formatRoadLength, roadStatusIcon, roadStatusLabels, roadStatusTone } from './roadStatus';

export function RouteOption({ route, selected, locale, onSelect }: {
  route: ScenarioRoute; selected: boolean; locale: Locale; onSelect: () => void;
}): JSX.Element {
  const t = (vi: string, en: string) => locale === 'vi' ? vi : en;
  return <button className="route-card" aria-pressed={selected} onClick={onSelect}>
    <span className="route-option-heading">
      <span className="route-option-selector" aria-hidden="true"/>
      <strong>{t(route.name[0], route.name[1])}</strong>
    </span>
    <span className="route-option-meta">
      <span>{formatRoadLength(route.lengthKm,locale)} km</span>
    </span>
    <span className="route-bottom">
      <StatusText tone={roadStatusTone(route.status)} icon={roadStatusIcon(route.status)}>
        {t(...roadStatusLabels[route.status])}
      </StatusText>
    </span>
  </button>;
}
