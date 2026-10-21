import {roadHazardIds} from '../../features/incident/roadHazards';
import { UiIcon } from './UiIcon';
import React from 'react';
import type {
  Hazard,
  ImpactTab,
  Locale,
  RoadFilter,
  RoadSegment
} from '../../types/dear';
import { StatusText } from '../../shared/ui/StatusText';
import { normalizeSearch } from '../../features/search/searchIndex';
import { formatRoadLength, roadStatusLabels } from '../../features/routes/roadStatus';

type Props = {
  roads: RoadSegment[];
  hazards: Hazard[];
  locale: Locale;
  roadFilter: RoadFilter;
  query: string;
  onChangeQuery: (query: string) => void;
  tab: ImpactTab;
  onChangeTab: (tab: ImpactTab) => void;
  onChangeRoadFilter: (filter: RoadFilter) => void;
  onSelectObject: (obj: string) => void;
  selectedId?: string | null;
};

export const ImpactView: React.FC<Props> = ({
  roads,
  hazards,
  locale,
  roadFilter,
  query,
  onChangeQuery,
  tab,
  onChangeTab,
  onChangeRoadFilter,
  onSelectObject,
  selectedId
}) => {
  const t = (vi: string, en: string) => (locale === 'en' ? en : vi);

  const blockedCount = roads.filter((r) => r.status === 'blocked').length;
  const uncertainCount = roads.filter((r) => r.status === 'uncertain').length;

  const filteredRoads = roads
    .filter((r) => {
      if (roadFilter === 'blocked') return r.status === 'blocked';
      if (roadFilter === 'uncertain') return r.status === 'uncertain';
      return true;
    })
    .filter((r) => {
      const text =
        `${r.name[0]} ${r.name[1]} ${r.scenarioRoadCode || ''} ${r.id} ${roadHazardIds(r).join(' ')} ${hazards.filter(h=>roadHazardIds(r).includes(h.id)).flatMap(h=>h.name).join(' ')}`.toLowerCase();
      return normalizeSearch(text).includes(normalizeSearch(query));
    })
    .sort((a, b) => {
      const rank = { blocked: 0, uncertain: 1, open: 2 };
      return rank[a.status] - rank[b.status];
    });

  // Along-road order, as on the incident overview.
  const order = roads.flatMap(roadHazardIds);
  const filteredHazards = [...hazards].sort((a, b) => (order.indexOf(a.id) + 1 || 1e9) - (order.indexOf(b.id) + 1 || 1e9)).filter((h) => {
    const text =
      `${h.name[0]} ${h.name[1]} ${h.id} ${h.src[0]} ${h.src[1]} ${roads.filter(r=>roadHazardIds(r).includes(h.id)).flatMap(r=>r.name).join(' ')}`.toLowerCase();
    return normalizeSearch(text).includes(normalizeSearch(query)) && (roadFilter==='all' || roads.some(r=>r.status===roadFilter && roadHazardIds(r).includes(h.id)));
  });

  return (
    <>
      <div className="sidebar-top">
        <h1>{t('Tình trạng đường', 'Road conditions')}</h1>

        <div className="search-box">
          <UiIcon name="search" size={18} />
          <input
            type="search"
            aria-label={t(
              'Tìm đường hoặc điểm ảnh hưởng',
              'Find roads or affected sites'
            )}
            placeholder={t('Tìm đường hoặc địa điểm', 'Find road or place')}
            value={query}
            onChange={(e) => onChangeQuery(e.target.value)}
          />
        </div>

        {<div
          className="filters impact-metrics"
          role="group"
          aria-label={t('Lọc theo tình trạng đường', 'Filter by road status')}
        >
          {(
            [
              ['all', t('Tất cả', 'All'), roads.length],
              ['blocked', t('Bị chặn', 'Blocked'), blockedCount],
              ['uncertain', t('Cần xác minh', 'To verify'), uncertainCount]
            ] as const
          ).map(([value, label, count]) => (
            <button
              key={value}
              className="filter"
              data-road-filter={value}
              data-empty={count === 0 || undefined}
              aria-pressed={roadFilter === value}
              onClick={() => {
                onChangeRoadFilter(
                  value !== 'all' && roadFilter === value
                    ? 'all'
                    : value
                );
              }}
            >
              {label}
              {value !== 'all' && <span className="filter-count">{count}</span>}
            </button>
          ))}
        </div>}

        <div className="decision-tabs" role="group">
          <button
            aria-pressed={tab === 'roads'}
            onClick={() => onChangeTab('roads')}
          >
            {t('Đoạn đường', 'Roads')}
          </button>
          <button
            aria-pressed={tab === 'hazards'}
            onClick={() => onChangeTab('hazards')}
          >
            {t('Điểm ảnh hưởng', 'Affected sites')}
          </button>
        </div>
      </div>

      <div className="sidebar-scroll">
        {tab === 'roads' ? (
          <div>
            {filteredRoads.length === 0 ? (
              <p
                className="small"
                style={{ padding: '16px 0', color: 'var(--ws-muted)' }}
              >
                {t(
                  'Không có đoạn đường phù hợp bộ lọc.',
                  'No road segments match the filter.'
                )}
              </p>
            ) : (
              filteredRoads.map((road) => (
                <button
                  data-map-preview={'road:'+road.id}
                  key={road.id}
                  className="object-row impact-row"
                  aria-pressed={selectedId === `road:${road.id}`}
                  onClick={() => onSelectObject(`road:${road.id}`)}
                >
                  <span>
                    <strong>{t(road.name[0], road.name[1])}</strong>
                    <small>
                      <i
                        className={'road-swatch is-' + road.status}
                        aria-hidden="true"
                      />
                      {formatRoadLength(road.len,locale)} km
                    </small>
                  </span>
                  {road.status !== 'open' && (
                    <StatusText
                      tone={road.status === 'blocked' ? 'critical' : 'warning'}
                      icon={road.status === 'blocked' ? 'blocked' : 'uncertain'}
                    >
                      {t(...roadStatusLabels[road.status])}
                    </StatusText>
                  )}
                </button>
              ))
            )}
          </div>
        ) : (
          <div>
            {filteredHazards.length === 0 ? (
              <p
                className="small"
                style={{ padding: '16px 0', color: 'var(--ws-muted)' }}
              >
                {t(
                  'Không tìm thấy điểm ảnh hưởng.',
                  'No matching impact sites.'
                )}
              </p>
            ) : (
              filteredHazards.map((hz) => (
                <button
                  data-map-preview={'hazard:'+hz.id}
                  key={hz.id}
                  className="object-row impact-row"
                  aria-pressed={selectedId === `hazard:${hz.id}`}
                  onClick={() => onSelectObject(`hazard:${hz.id}`)}
                >
                  <span>
                    <strong>{t(hz.name[0], hz.name[1])}</strong>
                    <small>{[hz.area != null ? `${hz.area.toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-GB')} ha` : '', t(hz.src[0], hz.src[1])].filter(Boolean).join(', ')}</small>
                  </span>
                  <StatusText tone={hz.observation === 'reported' ? 'critical' : 'warning'} icon="uncertain">
                    {hz.observation === 'reported' ? t('Có báo cáo', 'Reported') : t('Chưa kiểm chứng', 'Unverified')}
                  </StatusText>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </>
  );
};
