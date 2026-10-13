import type { IncidentEvidence, Locale, ScenarioRoute } from '../../types/dear';
import { localClock } from '../incident/sourceTime';

/** Reports describe points on a route; they are not a survey of full-route safety. */
export function RouteVerification({
  route,
  evidence,
  locale
}: {
  route: ScenarioRoute;
  evidence: IncidentEvidence[];
  locale: Locale;
}): JSX.Element | null {
  const t = (vi: string, en: string) => (locale === 'vi' ? vi : en);
  const records = evidence
    .filter((record) => route.segs.some((road) => road.hz === record.hazardId))
    .sort((a, b) => Date.parse(b.observedAt) - Date.parse(a.observedAt));
  if (!records[0]) return null;
  return (
    <dl className="route-verification">
      <div>
        <dt>{t('Ghi nhận mới nhất trên tuyến', 'Latest route observation')}</dt>
        <dd>
          <time dateTime={records[0].observedAt}>{localClock(records[0].observedAt)}</time>
        </dd>
      </div>
    </dl>
  );
}
