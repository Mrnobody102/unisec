import { isSelectPickerEvent } from '../../shared/ui/selectKeyboard';
import { useEffect } from 'react';
import { journeyMessages } from './locales';
import type {
  Locale,
  Community,
  ResponseSite,
  RoadSegment
} from '../../types/dear';
import type { useRoadJourney } from './useRoadJourney';
import { roadGeographic, roadProjected } from './selectedRoadJourney';
import type { JourneyPlace } from './journeyPlaces';
import { UiIcon } from '../../shared/ui/UiIcon';
import './road-journey.css';

const sides = ['start', 'end'] as const;

export function RoadJourneyPanel({
  locale,
  journey,
  communities,
  sites,
  roads,
  places = [],
  onProfile
}: {
  locale: Locale;
  journey: ReturnType<typeof useRoadJourney>;
  communities: Community[];
  sites: ResponseSite[];
  roads: RoadSegment[];
  /** Extra endpoints such as imported GIS points and areas. */
  places?: JourneyPlace[];
  onProfile?: () => void;
}): JSX.Element {
  const m = journeyMessages[locale];
  const t = (vi: string, en: string) => (locale === 'vi' ? vi : en);
  const number = (value: number, digits = 2) =>
    new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-GB', {
      maximumFractionDigits: digits
    }).format(value);
  const length = (metres: number) =>
    metres < 1000 ? `${Math.round(metres)} m` : `${number(metres / 1000)} km`;
  const { picking } = journey;
  useEffect(() => {
    if (!picking) return;
    const cancel = (event: KeyboardEvent) => {
      if (
        event.key === 'Escape' &&
        !event.defaultPrevented &&
        !isSelectPickerEvent(event)
      ) journey.setPicking(null);
    };
    document.addEventListener('keydown', cancel);
    return () => document.removeEventListener('keydown', cancel);
  }, [picking]);

  const choose = (side: 'start' | 'end', key: string) => {
    if (key === 'pick') {
      journey.setPicking(side);
      return;
    }
    const [kind, ...rest] = key.split(':'),
      id = rest.join(':');
    if (kind === 'site') {
      const site = sites.find((s) => s.id === id);
      if (site) journey.setPoint(side, site.projected, key, t(...site.name));
    } else if (kind === 'community') {
      const community = communities.find((c) => c.id === id);
      if (community)
        journey.setPoint(side, community.projected, key, community.name);
    } else {
      const place = places.find((p) => p.key === key);
      if (place)
        journey.setPoint(
          side,
          roadProjected(place.latitude, place.longitude),
          key,
          place.label
        );
    }
  };
  const groups = [...new Set(places.map((p) => p.group))];
  /** Only what the select cannot show: map coordinates and any off-road leg. */
  const meta = (side: 'start' | 'end') => {
    if (picking === side)
      return side === 'start' ? m.clickMapStart : m.clickMapEnd;
    const endpoint = journey[side];
    if (!endpoint) return '';
    const geo = roadGeographic(endpoint.origin);
    return [
      endpoint.source === 'map' &&
        `${geo.latitude.toFixed(5)}°, ${geo.longitude.toFixed(5)}°`,
      endpoint.distance > 1 &&
        m.accessDistance.replace('{d}', length(endpoint.distance))
    ]
      .filter(Boolean)
      .join(' · ');
  };
  const route = journey.route,
    access = (journey.start?.distance ?? 0) + (journey.end?.distance ?? 0);
  const status = route?.status ?? 'open';

  return (
    <section
      className="road-journey-panel"
      aria-label={m.journeyBetweenTwoPoints}
    >
      <header>
        <h2>{m.journeyBetweenTwoPoints}</h2>
        <button
          className="icon-button"
          aria-label={m.closeJourney}
          onClick={journey.close}
        >
          <UiIcon name="close" />
        </button>
      </header>
      <div className="road-journey-content">
        <div className="journey-stops">
          {sides.map((side) => {
            const endpoint = journey[side],
              letter = side === 'start' ? 'A' : 'B',
              active = picking === side;
            const road =
              endpoint && roads.find((r) => r.id === endpoint.roadId);
            return (
              <div
                key={side}
                className="journey-stop"
                data-active={active || undefined}
              >
                <span
                  className={'journey-pin is-' + letter.toLowerCase()}
                  aria-hidden="true"
                >
                  {letter}
                </span>
                <div className="journey-stop-field">
                  <select
                    aria-label={side === 'start' ? m.presetStart : m.presetEnd}
                    value={endpoint?.source ?? ''}
                    onChange={(event) => choose(side, event.target.value)}
                  >
                    <option value="" disabled>
                      {side === 'start' ? m.chooseStart : m.chooseEnd}
                    </option>
                    {endpoint?.source === 'map' && (
                      <option value="map">{m.pickedOnMap}</option>
                    )}
                    <option value="pick">{m.chooseOnMapEllipsis}</option>
                    <optgroup label={m.responseSites}>
                      {sites.map((s) => (
                        <option key={s.id} value={'site:' + s.id}>
                          {t(...s.name)}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label={m.areas}>
                      {communities.map((c) => (
                        <option key={c.id} value={'community:' + c.id}>
                          {c.name}
                        </option>
                      ))}
                    </optgroup>
                    {groups.map((group) => (
                      <optgroup key={group} label={`${m.gisData} · ${group}`}>
                        {places
                          .filter((p) => p.group === group)
                          .map((p) => (
                            <option key={p.key} value={p.key}>
                              {p.label}
                            </option>
                          ))}
                      </optgroup>
                    ))}
                  </select>
                  {meta(side) && (
                    <small
                      className="journey-stop-meta"
                      title={
                        road ? road.name[locale === 'vi' ? 0 : 1] : undefined
                      }
                      data-far={
                        endpoint && endpoint.distance > 250 ? true : undefined
                      }
                    >
                      {meta(side)}
                    </small>
                  )}
                </div>
                <button
                  type="button"
                  className="icon-button journey-pick"
                  aria-pressed={active}
                  aria-label={`${m.chooseOnMap} (${letter})`}
                  title={`${m.chooseOnMap} (${letter})`}
                  onClick={() => journey.setPicking(active ? null : side)}
                >
                  <UiIcon name="location" />
                </button>
              </div>
            );
          })}
          <button
            type="button"
            className="icon-button journey-swap"
            aria-label={m.swap}
            title={m.swap}
            disabled={!journey.start && !journey.end}
            onClick={journey.swap}
          >
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m21 16-4 4-4-4" />
              <path d="M17 20V4" />
              <path d="m3 8 4-4 4 4" />
              <path d="M7 4v16" />
            </svg>
          </button>
        </div>

        <label className="journey-option">
          <input
            type="checkbox"
            checked={journey.avoidBlocked}
            onChange={(event) => journey.setAvoidBlocked(event.target.checked)}
          />
          {m.avoidBlockedSections}
        </label>

        {journey.error && (
          <p role="alert" className="journey-message is-error">
            {m.tooFarFromRoads}
          </p>
        )}
        {!journey.start || !journey.end ? null : route ? (
          <section className="journey-result" aria-live="polite">
            <div className="journey-total">
              <strong>
                {number(route.lengthKm)}
                <span> km</span>
              </strong>
              <span className={'journey-status is-' + status}>
                {status === 'blocked'
                  ? m.statusBlocked
                  : status === 'uncertain'
                    ? m.statusUncertain
                    : m.statusOpen}
              </span>
            </div>
            {access > 1 && (
              <dl className="journey-breakdown">
                <div>
                  <dt>{m.alongRoads}</dt>
                  <dd>{length(route.lengthKm * 1000)}</dd>
                </div>
                <div>
                  <dt>{m.offRoadAccess}</dt>
                  <dd>{length(access)}</dd>
                </div>
              </dl>
            )}
            <p className="journey-message">{m.networkNote}</p>
            {onProfile && (
              <button className="button journey-profile" onClick={onProfile}>
                <UiIcon name="route" />
                {m.journeyElevationProfile}
              </button>
            )}
          </section>
        ) : (
          <p role="status" className="journey-message is-error">
            {Math.hypot(journey.start.point.x - journey.end.point.x, journey.start.point.y - journey.end.point.y) < 1
              ? m.samePoint
              : m.theseLocationsCannotBeConnectedUnderThe}
          </p>
        )}
      </div>
    </section>
  );
}
