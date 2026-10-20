import type { Locale, RoadSegment, ScenarioRoute } from '../../types/dear';
import { UiIcon } from '../../shared/ui/UiIcon';
import { accessMessages } from './locales';

const fill = (text: string, values: Record<string, string | number>) =>
  text.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ''));

/**
 * What a resident needs before leaving: can I go, which way, how long, what to watch out for.
 * Status is said in words and colour; open sections and technical labels stay out.
 */
export function CitizenRouteCard({
  route,
  avoided,
  problems,
  locale,
  onShowMap
}: {
  route: ScenarioRoute;
  avoided: ScenarioRoute | null;
  problems: RoadSegment[];
  locale: Locale;
  onShowMap: () => void;
}) {
  const m = accessMessages[locale];
  const name = (value: [string, string]) => (locale === 'en' ? value[1] : value[0]);
  const duration = (minutes: number) => {
    const h = Math.floor(minutes / 60), n = Math.round(minutes % 60);
    if (!h) return fill(m.minutes, { n });
    return n ? fill(m.hoursMinutes, { h, n }) : fill(m.hours, { h });
  };
  const eta = route.eta;
  const time = eta && (eta.minMinutes === eta.maxMinutes
    ? duration(eta.minMinutes)
    : locale === 'en' ? `${duration(eta.minMinutes)} to ${duration(eta.maxMinutes)}` : `${duration(eta.minMinutes)} đến ${duration(eta.maxMinutes)}`);
  const verdict = { open: m.routeOpen, uncertain: m.routeUncertain, blocked: m.routeBlocked }[route.status];
  const advice = { open: m.adviceOpen, uncertain: m.adviceUncertain, blocked: m.adviceBlocked }[route.status];
  const icon = route.status === 'open' ? 'check' : route.status;
  return (
    <article className="citizen-route" data-status={route.status}>
      <p className="citizen-route-verdict">
        <UiIcon name={icon} size={20} />
        {verdict}
      </p>
      <h2>{name(route.name)}</h2>
      <p className="citizen-route-facts">
        {route.lengthKm.toLocaleString(locale === 'en' ? 'en-GB' : 'vi-VN')} km
        {time && `, ${fill(eta.mode === 'foot' ? m.onFoot : m.byCar, { time })}`}
      </p>
      {problems.length > 0 && (
        <div className="citizen-route-problems">
          <strong>{m.watchOut}</strong>
          <ul>
            {problems.map((road) => (
              <li key={road.id} data-status={road.status}>
                {name(road.name)}: {road.status === 'blocked' ? m.roadBlocked : m.roadUnchecked}
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="citizen-route-advice">{advice}</p>
      {avoided && (
        <p className="citizen-route-why">
          {fill(avoided.status === 'blocked' ? m.avoidedBlocked : m.avoidedUncertain, { name: name(avoided.name) })}
        </p>
      )}
      <button className="button citizen-route-map" onClick={onShowMap}>
        <UiIcon name="map" size={16} />
        {m.showRouteOnMap}
      </button>
    </article>
  );
}
