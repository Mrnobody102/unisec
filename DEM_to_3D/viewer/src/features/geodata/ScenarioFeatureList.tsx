import { useState } from 'react';
import type { Locale } from '../../types/dear';
import { roadStatusLabels } from '../routes/roadStatus';
import { scenarioKindLabel, type ScenarioOverlay, type ScenarioTarget } from './scenarioOverlay';

export function ScenarioFeatureList({ scenario, selected, locale, onSelect, onCreate, types, disabled = false }: {
  scenario: ScenarioOverlay;
  selected: ScenarioTarget | null;
  locale: Locale;
  onSelect: (target: ScenarioTarget) => void;
  onCreate?: (type: 'hazard' | 'site') => void;
  types?: ScenarioTarget['type'][];
  disabled?: boolean;
}): JSX.Element {
  const t = (vi: string, en: string) => locale === 'vi' ? vi : en;
  const [reviewOnly, setReviewOnly] = useState(false);
  const [query, setQuery] = useState('');
  const groups = [
    { type: 'hazard' as const, label: ['Điểm ghi nhận', 'Point reports'] as const, items: scenario.hazards },
    { type: 'site' as const, label: ['Điểm tập kết, bãi đáp', 'Staging and landing sites'] as const, items: scenario.responseSites },
    { type: 'community' as const, label: scenarioKindLabel.community, items: scenario.communities },
    { type: 'road' as const, label: ['Đánh giá đường', 'Road assessment'] as const, items: scenario.roads }
  ].filter(group => !types || types.includes(group.type));
  const single = groups.length === 1;
  const heading = single ? groups[0].label[locale === 'vi' ? 0 : 1] : t('Điểm cứu trợ và thôn bản', 'Relief sites and communities');
  const total = groups.reduce((sum, group) => sum + group.items.length, 0);
  const isReview = (type: string, item: ScenarioOverlay['hazards'][number] | ScenarioOverlay['responseSites'][number] | ScenarioOverlay['communities'][number] | ScenarioOverlay['roads'][number]) =>
    type === 'hazard' ? 'observation' in item && item.observation === 'suspected'
      : type === 'road' ? 'status' in item && item.status === 'uncertain'
      : type === 'site' && 'assessment' in item && item.kind === 'hlz' && item.assessment === 'candidate';
  const reviewCount = groups.reduce((sum, group) => sum + group.items.filter(item => isReview(group.type, item)).length, 0);
  const needle = query.trim().toLocaleLowerCase(locale);
  return <section className="scenario-feature-list" aria-label={heading}>
    <div className="scenario-feature-heading"><h2>{heading}</h2><span>{total}</span></div>
    {onCreate && <div className="scenario-create-actions">
      {(!types || types.includes('hazard')) && <button className="button" disabled={disabled} onClick={() => onCreate('hazard')}>{t('Thêm điểm ghi nhận', 'Add point report')}</button>}
      {(!types || types.includes('site')) && <button className="button" disabled={disabled} onClick={() => onCreate('site')}>{t('Thêm bãi đáp', 'Add landing site')}</button>}
    </div>}
    {(total > 8 || types?.includes('road')) && <label className="scenario-feature-search">{t('Tìm theo tên', 'Find by name')}
      <input type="search" value={query} onChange={event => setQuery(event.target.value)} />
    </label>}
    {reviewCount > 0 && <label className="scenario-review-filter">
      <input type="checkbox" checked={reviewOnly} onChange={event => setReviewOnly(event.target.checked)} />
      {types?.length === 1 && types[0] !== 'site' ? t('Chỉ hiện mục cần xác minh', 'Needs verification only') : t('Cần xác minh hoặc khảo sát', 'Needs verification or survey')} <span>{reviewCount}</span>
    </label>}
    {groups.map(group => {
      const items = group.items.filter(item => (!reviewOnly || isReview(group.type, item)) &&
        (!needle || (typeof item.name === 'string' ? item.name : item.name[locale === 'vi' ? 0 : 1]).toLocaleLowerCase(locale).includes(needle)));
      const rows = <>{items.map(item => <button data-map-preview={(group.type === 'site' ? 'poi' : group.type) + ':' + item.id} key={item.id} className="scenario-feature-row"
        disabled={disabled} aria-pressed={selected?.type === group.type && selected.id === item.id}
        onClick={() => onSelect({ type: group.type, id: item.id })}>
        <span>{typeof item.name === 'string' ? item.name : item.name[locale === 'vi' ? 0 : 1]}</span>
        {'status' in item && group.type === 'road' ? <small>{roadStatusLabels[item.status][locale === 'vi' ? 0 : 1]}</small> : isReview(group.type, item) && <small>{group.type === 'hazard' ? t('Chưa xác minh', 'Unverified') : t('Chưa khảo sát', 'Not surveyed')}</small>}
      </button>)}{!items.length && <p className="geodata-empty">{t('Không có đối tượng phù hợp.', 'No matching features.')}</p>}</>;
      return single ? <div key={group.type}>{rows}</div> : <details key={group.type} open={selected?.type === group.type || undefined}>
        <summary>{group.label[locale === 'vi' ? 0 : 1]} <span>{items.length}</span></summary>{rows}
      </details>;
    })}
  </section>;
}
