import { useState } from 'react';
import type { Locale } from '../../types/dear';
import { scenarioKindLabel, type ScenarioOverlay, type ScenarioTarget } from './scenarioOverlay';

export function ScenarioFeatureList({ scenario, selected, locale, onSelect, onCreate }: {
  scenario: ScenarioOverlay;
  selected: ScenarioTarget | null;
  locale: Locale;
  onSelect: (target: ScenarioTarget) => void;
  onCreate?: (type: 'hazard' | 'site') => void;
}): JSX.Element {
  const t = (vi: string, en: string) => locale === 'vi' ? vi : en;
  const [reviewOnly, setReviewOnly] = useState(false);
  const groups = [
    { type: 'hazard' as const, label: scenarioKindLabel.hazard, items: scenario.hazards },
    { type: 'site' as const, label: ['Điểm tập kết, bãi đáp', 'Staging and landing sites'] as const, items: scenario.responseSites },
    { type: 'community' as const, label: scenarioKindLabel.community, items: scenario.communities },
    { type: 'road' as const, label: scenarioKindLabel.road, items: scenario.roads }
  ];
  const reviewCount = scenario.hazards.filter(item => item.observation === 'suspected').length +
    scenario.responseSites.filter(item => item.kind === 'hlz' && item.assessment === 'candidate').length;
  const isReview = (type: string, item: ScenarioOverlay['hazards'][number] | ScenarioOverlay['responseSites'][number] | ScenarioOverlay['communities'][number] | ScenarioOverlay['roads'][number]) =>
    type === 'hazard' ? 'observation' in item && item.observation === 'suspected'
      : type === 'site' && 'assessment' in item && item.kind === 'hlz' && item.assessment === 'candidate';
  return <section className="scenario-feature-list" aria-label={t('Đối tượng ứng phó', 'Response features')}>
    <div className="scenario-feature-heading">
      <h2>{t('Đối tượng ứng phó', 'Response features')}</h2>
      <span>{scenario.hazards.length + scenario.responseSites.length + scenario.communities.length + scenario.roads.length}</span>
    </div>
    {onCreate && <div className="scenario-create-actions">
      <button className="button" onClick={() => onCreate('hazard')}>{t('Thêm sự cố', 'Add hazard')}</button>
      <button className="button" onClick={() => onCreate('site')}>{t('Thêm bãi đáp', 'Add landing site')}</button>
    </div>}
    {reviewCount > 0 && <label className="scenario-review-filter">
      <input type="checkbox" checked={reviewOnly} onChange={event => setReviewOnly(event.target.checked)} />
      {t('Cần xác minh hoặc khảo sát', 'Needs verification or survey')} <span>{reviewCount}</span>
    </label>}
    {groups.filter(group => !reviewOnly || group.type === 'hazard' || group.type === 'site').map(group => {
      const items = reviewOnly ? group.items.filter(item => isReview(group.type, item)) : group.items;
      return <details key={group.type} open={selected?.type === group.type || undefined}>
        <summary>{group.label[locale === 'vi' ? 0 : 1]} <span>{items.length}</span></summary>
        {items.map(item => <button data-map-preview={(group.type==="site"?"poi":group.type)+":"+item.id} key={item.id} className="scenario-feature-row"
          aria-pressed={selected?.type === group.type && selected.id === item.id}
          onClick={() => onSelect({ type: group.type, id: item.id })}>
          <span>{typeof item.name === 'string' ? item.name : item.name[locale === 'vi' ? 0 : 1]}</span>
          {isReview(group.type, item) && <small>{group.type === 'hazard'
            ? t('Chưa xác minh', 'Unverified')
            : t('Chưa khảo sát', 'Not surveyed')}</small>}
        </button>)}
      </details>;
    })}
  </section>;
}
