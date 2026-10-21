import type { Locale, RoadSegment, ScenarioRoute } from '../../types/dear';
import { UiIcon } from '../../shared/ui/UiIcon';
import { accessMessages } from './locales';
import { kmRange } from './routeChainage';

const fill = (text: string, values: Record<string, string | number>) =>
  text.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ''));

/**
 * What a resident needs before leaving, in reading order: can I go, what to do,
 * how far and how long, and which sections to watch. Status is a dot and a word.
 */
export function CitizenRouteCard({
  route,
  avoided,
  problems,
  locale,
  chainage,
  origin,
  hazardCount,
  onShowMap,
  onShowSection
}: {
  route: ScenarioRoute;
  avoided: ScenarioRoute | null;
  problems: RoadSegment[];
  locale: Locale;
  chainage: Map<string, [number, number]>;
  origin?: string;
  hazardCount: (road: RoadSegment) => number;
  onShowMap: () => void;
  onShowSection: (road: RoadSegment) => void;
}) {
  const m = accessMessages[locale];
  const vi = locale !== 'en';
  const name = (value: [string, string]) => (vi ? value[0] : value[1]);
  // "1 giờ 15", "45 phút": short enough for a range on one line.
  const duration = (minutes: number) => {
    const total = Math.round(minutes), h = Math.floor(total / 60), n = total % 60;
    if (!h) return fill(m.minutes, { n });
    return n ? (vi ? `${h} giờ ${n}` : `${h} h ${n}`) : fill(m.hours, { h });
  };
  const eta = route.eta;
  const time = eta && (eta.minMinutes === eta.maxMinutes
    ? duration(eta.minMinutes)
    : `${duration(eta.minMinutes)} ${vi ? 'đến' : 'to'} ${duration(eta.maxMinutes)}`);
  const verdict = { open: m.routeOpen, uncertain: m.routeUncertain, blocked: m.routeBlocked }[route.status];
  const advice = { open: m.adviceOpen, uncertain: m.adviceUncertain, blocked: m.adviceBlocked }[route.status];
  const routeName = name(route.name);
  // A section is found on the road by its km from the start, not by an internal section number.
  const sectionName = (road: RoadSegment) => {
    const km = chainage.get(road.id);
    return km ? kmRange(km, locale) : name(road.name);
  };
  const km = new Intl.NumberFormat(vi ? 'vi-VN' : 'en-GB', { maximumFractionDigits: 1 }).format(route.lengthKm);
  return (
    <article className="citizen-route" data-status={route.status}>
      <p className="citizen-route-verdict">{verdict}</p>
      <h2>{routeName}</h2>
      <p className="citizen-route-advice">{advice}</p>
      <dl className="citizen-route-figures">
        <div><dt>{vi ? 'Quãng đường' : 'Distance'}</dt><dd>{km} km</dd></div>
        {time && <div><dt>{eta.mode === 'foot' ? (vi ? 'Đi bộ' : 'On foot') : (vi ? 'Đi xe' : 'By car')}</dt><dd>{time}</dd></div>}
      </dl>
      {problems.length > 0 && (
        <div className="citizen-route-problems">
          <h3>{m.watchOut}{origin && <small>{vi ? `Km tính từ ${origin}` : `Km from ${origin}`}</small>}</h3>
          <ul>
            {problems.map((road) => {
              const count = hazardCount(road);
              return (
                <li key={road.id} data-status={road.status}>
                  <button type="button" onClick={() => onShowSection(road)} aria-label={`${sectionName(road)}. ${vi ? 'Xem trên bản đồ' : 'Show on map'}`}>
                    <span className="citizen-route-problem-name">
                      <strong>{sectionName(road)}</strong>
                      {count > 0 && <small>{vi ? `${count} điểm sạt lở` : `${count} landslide ${count === 1 ? 'point' : 'points'}`}</small>}
                    </span>
                    <span className="citizen-route-problem-state">{road.status === 'blocked' ? (vi ? 'Bị chặn' : 'Blocked') : (vi ? 'Cần xác minh' : 'To verify')}</span>
                    <UiIcon name="next" size={16} />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
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
