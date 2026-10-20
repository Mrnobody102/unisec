import {roadHazardIds} from '../incident/roadHazards';
import { roadEvidence } from '../incident/findingPresentation';
import { useLayoutEffect, useRef, useState } from 'react';
import type { IncidentEvidence, Hazard, Locale, ScenarioRoute } from '../../types/dear';
import { UiIcon } from '../../shared/ui/UiIcon';
import { StatusText } from '../../shared/ui/StatusText';
import { EvidenceMetadata } from '../incident/EvidenceMetadata';
import { evidencePresentation } from '../incident/evidencePresentation';
import { formatRoadLength, roadStatusLabels } from './roadStatus';

export function RouteSections({ route, evidence, hazards, locale, selectedId, onSelect, onEvidence, onProfile, hasProfile }: {
  route: ScenarioRoute; evidence: IncidentEvidence[]; hazards: Hazard[]; locale: Locale; selectedId: string | null;
  onSelect: (id: string | null) => void;
  onEvidence: (id: string) => void; onProfile: () => void; hasProfile: boolean;
}): JSX.Element {
  const t = (vi: string, en: string) => locale === 'vi' ? vi : en;
  const routeName = t(...route.name);
  const measured = route.segs.every(road => road.fromKm !== undefined);
  let distanceKm = 0;
  const [listOpen, setListOpen] = useState(true);
  const expandedList = listOpen || selectedId !== null;
  const sectionRef = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const row = sectionRef.current?.querySelector('.is-selected > .route-section-row');
    const scroll = sectionRef.current?.closest('.sidebar-scroll');
    if (!row || !scroll) return;
    const detail = row.nextElementSibling;
    const bounds = scroll.getBoundingClientRect(), top = row.getBoundingClientRect().top;
    const bottom = (detail ?? row).getBoundingClientRect().bottom;
    const available = bounds.height - 24;
    // Reveal the inline finding and tools, not just the row that was clicked.
    if (bottom - top > available || top < bounds.top + 12) scroll.scrollTop += top - bounds.top - 12;
    else if (bottom > bounds.bottom - 12) scroll.scrollTop += bottom - bounds.bottom + 12;
  }, [route.id, selectedId]);
  return <section ref={sectionRef} className="route-sections" aria-labelledby="route-sections-title">
    <h3><button id="route-sections-title" className="route-sections-toggle" type="button" aria-expanded={expandedList} onClick={() => {setListOpen(!expandedList);if (expandedList && selectedId) onSelect(null);}}>
      <span>{t('Các đoạn trên tuyến', 'Route sections')} <small>({route.segs.length})</small></span><UiIcon name={expandedList ? 'collapse' : 'expand'} size={16}/>
    </button></h3>
    {expandedList && measured && <p className="route-chainage-note">{t('Khoảng cách ước tính từ điểm xuất phát', 'Approximate distance from the starting point')}</p>}
    {expandedList && <ol className="route-section-list">
      {route.segs.map((road, index) => {
        const startKm = distanceKm; distanceKm += road.len;
        const name = t(...road.name);
        const title = measured ? `Km ${startKm.toLocaleString(locale,{maximumFractionDigits:1})}–${distanceKm.toLocaleString(locale,{maximumFractionDigits:1})} km`
          : name.startsWith(routeName + ', ') ? name.slice(routeName.length + 2).replace(/^./, c => c.toLocaleUpperCase()) : name;
        const ids=roadHazardIds(road),records=roadEvidence(road,evidence),record=records[0];
        const expanded = selectedId === road.id;
        return <li key={road.id} className={expanded ? 'is-selected' : ''} data-road-id={road.id}>
          <button className="route-section-row" aria-expanded={expanded} aria-controls={`section-${road.id}`} onClick={() => onSelect(expanded ? null : road.id)}>
            <span className="route-section-number" aria-hidden="true">{index + 1}</span>
            <strong className="route-section-name" title={name}>{title}</strong>
            <span className="route-section-meta"><small>{formatRoadLength(road.len,locale)} km</small>{road.status !== 'open' && <StatusText tone={road.status === 'blocked' ? 'critical' : 'warning'} icon={road.status === 'blocked' ? 'blocked' : 'uncertain'}>
              {t(...roadStatusLabels[road.status])}
            </StatusText>}</span>
            <UiIcon name={expanded ? 'collapse' : 'expand'} size={14}/>
          </button>
          {expanded && <div id={`section-${road.id}`} className="route-section-detail">
            <p className={record || road.note ? 'route-section-finding' : 'route-section-empty'}>{record ? t(...record.finding) : road.note ? t(...road.note) : t('Chưa có báo cáo hiện trường.', 'No field report available.')}</p>
            {record && <EvidenceMetadata evidence={record} locale={locale}/>}
            <div className="route-section-tools">
              {ids.map(id => {
                const item = records.find(record => record.hazardId === id);
                const label = item ? evidencePresentation(item.type,locale).action : t('Thông tin sự cố','Hazard details');
                const subject = hazards.find(hazard => hazard.id === id)?.name[locale === 'vi' ? 0 : 1] ?? id;
                return <button key={id} className={ids.length > 1 ? 'text-button route-evidence-link' : 'button'} onClick={() => onEvidence(id)}>
                  <UiIcon name="info" size={14}/>{ids.length > 1 ? <span><strong>{subject}</strong><small>{label}</small></span> : label}
                </button>;
              })}
              <button className="button" onClick={onProfile} disabled={!hasProfile}><UiIcon name="profile" size={14}/>{t('Mặt cắt địa hình', 'Elevation profile')}</button>
            </div>
            {!hasProfile && <p className="route-section-empty profile-unavailable">{t('Chưa có dữ liệu độ cao cho đoạn này.', 'No elevation data for this section.')}</p>}
          </div>}
        </li>;
      })}
    </ol>}
  </section>;
}
