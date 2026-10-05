import { useState } from 'react';
import type { Locale, ScenarioRoute } from '../../types/dear';
import type { ResponseAssessment } from '../incident/responseAssessment';
import { UiIcon } from '../../shared/ui/UiIcon';
import { StatusText } from '../../shared/ui/StatusText';
import { communityAccessText } from './accessAssessment';
import { RouteOption } from './RouteOption';

type Props = {
  assessment: ResponseAssessment; locale: Locale;
  candidate: ScenarioRoute | null; direct: ScenarioRoute | null;
  selected: 'candidate' | 'direct'; onSelectRoute: (type: 'candidate' | 'direct') => void;
  hasProfile: boolean; onProfile: () => void; onInspect: (id: string) => void;
  onFindings: () => void; onExport: () => void;
};

/** One access review: selected route, its constraints, then optional comparisons. */
export function AccessPanel({ assessment, locale, candidate, direct, selected, onSelectRoute, hasProfile, onProfile, onInspect, onFindings, onExport }: Props): JSX.Element {
  const [compare, setCompare] = useState(false), [allSections, setAllSections] = useState(false);
  const t = (vi: string, en: string) => locale === 'vi' ? vi : en;
  const active = selected === 'direct' && direct ? direct : candidate;
  const constraints = active?.segs.filter(road => road.status !== 'open') ?? [];
  const blocked = active?.status === 'blocked';
  const other = active === direct ? candidate : direct;
  const canCompare = Boolean(candidate && direct);
  const needsOtherRoute = Boolean(blocked && other && other.status !== 'blocked');
  const action = needsOtherRoute
    ? t('Tuyến đang xem bị chặn. Kiểm tra phương án còn lại.', 'This route is blocked. Review the other option.')
    : t(...assessment.nextAction);
  const firstConstraint = constraints.find(road => road.status === 'blocked') ?? constraints[0];
  const inspect = (id: string) => onInspect(`road:${id}`);
  const primaryAction = () => {
    if (needsOtherRoute) onSelectRoute(active === direct ? 'candidate' : 'direct');
    else if (firstConstraint) inspect(firstConstraint.id);
    else if (active) setAllSections(true);
    else onFindings();
  };
  const roadRows = (roads: ScenarioRoute['segs']) => roads.map(road => <button key={road.id} className="object-row impact-row" onClick={() => inspect(road.id)}>
    <span><strong>{t(...road.name)}</strong><small>{road.len} km</small></span>
    <StatusText tone={road.status === 'blocked' ? 'critical' : road.status === 'uncertain' ? 'warning' : 'neutral'} icon={road.status === 'blocked' ? 'blocked' : road.status === 'uncertain' ? 'uncertain' : undefined}>
      {road.status === 'blocked' ? t('Bị chặn', 'Blocked') : road.status === 'uncertain' ? t('Chưa rõ', 'Uncertain') : t('Chưa ghi nhận chặn', 'No blockage reported')}
    </StatusText>
  </button>);
  return <>
    <div className="decision-overview"><small>{t('Tiếp cận địa bàn', 'Community access')}</small><strong>{t(...communityAccessText({ candidate, direct }))}</strong></div>
    {active && <section className="decision-route">
      <div className="section-line"><h3>{t('Tuyến đang xem', 'Selected route')}</h3>{blocked && <StatusText tone="critical" icon="blocked">{t('Bị chặn', 'Blocked')}</StatusText>}</div>
      <strong>{t(...active.name)}</strong>
      <p className="route-summary-distance">{active.lengthKm} km · {t('từ điểm tập kết Nậm Kha', 'from Nậm Kha staging point')}</p>
      {active.eta && <p className="route-travel-estimate">{active.eta.minMinutes} {t('đến', 'to')} {active.eta.maxMinutes} {t('phút', 'min')}<small>{active.eta.mode === 'foot' ? t('Đi bộ, nếu thông tuyến', 'On foot, assuming passage') : t('Xe 4x4, nếu thông tuyến', '4WD, assuming passage')}</small></p>}
    </section>}
    <div className="assessment-action"><strong>{t('Cần xử lý', 'Next action')}</strong><span>{action}</span></div>
    {constraints.length > 0 && <section className="access-issues" aria-label={t('Đoạn ảnh hưởng tiếp cận', 'Access constraints')}>
      <h3>{t('Đoạn cần kiểm tra trên tuyến', 'Selected route constraints')}</h3>{roadRows(constraints)}
    </section>}
    <button className="button primary access-primary" onClick={primaryAction}>
      {needsOtherRoute ? t('Xem tuyến khác', 'Review other route') : firstConstraint ? t('Xem đoạn cần kiểm tra', 'Inspect road constraint') : active ? t('Xem các đoạn đường', 'Review road sections') : t('Xem thông tin địa bàn', 'Review community findings')}
    </button>
    {active && <div className="access-supplementary">
      {canCompare && <>
        <button className="access-disclosure" aria-expanded={compare} aria-controls="access-route-options" onClick={() => setCompare(open => !open)}>{t('So sánh tuyến', 'Compare routes')}<UiIcon name={compare ? 'collapse' : 'expand'} size={16}/></button>
        {compare && <div id="access-route-options" className="route-options" role="group" aria-label={t('Chọn tuyến tiếp cận', 'Select access route')}>
          <RouteOption route={candidate!} selected={active === candidate} locale={locale} onSelect={() => onSelectRoute('candidate')}/>
          <RouteOption route={direct!} selected={active === direct} locale={locale} onSelect={() => onSelectRoute('direct')}/>
        </div>}
      </>}
      <button className="access-disclosure" aria-expanded={allSections} aria-controls="access-route-sections" onClick={() => setAllSections(open => !open)}><span>{t('Các đoạn trên tuyến', 'Route sections')} ({active.segs.length})</span><UiIcon name={allSections ? 'collapse' : 'expand'} size={16}/></button>
      {allSections && <div id="access-route-sections">{roadRows(active.segs)}</div>}
      {active.eta && <button className="access-disclosure" onClick={onFindings}>{t('Căn cứ ước tính thời gian', 'Travel estimate basis')}<UiIcon name="info" size={16}/></button>}
    </div>}
    <div className="route-tools access-tools">
      {active && <button className="button" onClick={onProfile} disabled={!hasProfile} title={!hasProfile ? t('Chưa có DEM cho tuyến này', 'DEM unavailable for this route') : undefined}><UiIcon name="profile" size={16}/>{t('Mặt cắt địa hình', 'Terrain section')}</button>}
      <button className="button decision-save" onClick={onExport}><UiIcon name="download" size={16}/>{t('Lưu đánh giá', 'Save assessment')}</button>
    </div>
  </>;
}
