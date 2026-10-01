import React, { useState } from 'react';
import type { Hazard, Locale, RoadFilter, RoadSegment } from '../../types/dear';

type Props = {
  roads: RoadSegment[];
  hazards: Hazard[];
  locale: Locale;
  roadFilter: RoadFilter;
  onChangeRoadFilter: (filter: RoadFilter) => void;
  onSelectObject: (obj: string) => void;
  onNext: () => void;
};

export const ImpactView: React.FC<Props> = ({
  roads,
  hazards,
  locale,
  roadFilter,
  onChangeRoadFilter,
  onSelectObject,
  onNext
}) => {
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<'roads' | 'hazards'>('roads');

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
      const text = `${r.ref[0]} ${r.ref[1]} ${r.id} ${r.hz || ''}`.toLowerCase();
      return text.includes(query.toLowerCase());
    });

  const filteredHazards = hazards.filter((h) => {
    const text = `${h.id} ${h.src[0]} ${h.src[1]}`.toLowerCase();
    return text.includes(query.toLowerCase());
  });

  return (
    <>
      <div className="sidebar-top">
        <div className="eyebrow">{t('TÁC ĐỘNG THIÊN TAI', 'DISASTER IMPACT')}</div>
        <h1 style={{ marginTop: '4px' }}>{t('Đường và vùng ảnh hưởng', 'Roads & Affected Areas')}</h1>

        <div className="impact-metrics">
          <button
            data-road-filter="blocked"
            aria-pressed={roadFilter === 'blocked'}
            onClick={() => onChangeRoadFilter(roadFilter === 'blocked' ? 'all' : 'blocked')}
          >
            <strong>{blockedCount}</strong>
            <span>{t('Bị chặn', 'Blocked')}</span>
          </button>

          <button
            data-road-filter="uncertain"
            aria-pressed={roadFilter === 'uncertain'}
            onClick={() => onChangeRoadFilter(roadFilter === 'uncertain' ? 'all' : 'uncertain')}
          >
            <strong>{uncertainCount}</strong>
            <span>{t('Chưa rõ', 'Uncertain')}</span>
          </button>

          <button
            data-road-filter="all"
            aria-pressed={roadFilter === 'all'}
            onClick={() => onChangeRoadFilter('all')}
          >
            <strong>{roads.length}</strong>
            <span>{t('Tất cả', 'All roads')}</span>
          </button>
        </div>

        <div className="search-box">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="search"
            placeholder={t('Tìm đoạn đường, vết sạt lở…', 'Find road, landslide…')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="decision-tabs" role="group">
          <button
            aria-pressed={tab === 'roads'}
            onClick={() => setTab('roads')}
          >
            {t('Đoạn đường', 'Roads')} ({filteredRoads.length})
          </button>
          <button
            aria-pressed={tab === 'hazards'}
            onClick={() => setTab('hazards')}
          >
            {t('Vùng thiên tai', 'Hazard areas')} ({filteredHazards.length})
          </button>
        </div>
      </div>

      <div className="sidebar-scroll">
        {tab === 'roads' ? (
          <div>
            {filteredRoads.length === 0 ? (
              <p className="small" style={{ padding: '16px 0', color: 'var(--ws-muted)' }}>
                {t('Không có đoạn đường phù hợp bộ lọc.', 'No road segments match the filter.')}
              </p>
            ) : (
              filteredRoads.map((road) => (
                <button
                  key={road.id}
                  className="object-row"
                  onClick={() => onSelectObject(`road:${road.id}`)}
                >
                  <span>
                    <strong>{t(road.ref[0], road.ref[1])}</strong>
                    <small>
                      {road.id} · {road.len} km {road.hz ? `· ${road.hz}` : ''}
                    </small>
                  </span>
                  <span
                    className={`tag ${
                      road.status === 'blocked' ? 'danger' : road.status === 'uncertain' ? 'warn' : ''
                    }`}
                  >
                    {road.status === 'blocked'
                      ? t('Bị chặn', 'Blocked')
                      : road.status === 'uncertain'
                      ? t('Chưa rõ', 'Uncertain')
                      : t('Chưa ghi nhận', 'Open')}
                  </span>
                  <span style={{ color: 'var(--ws-muted)', marginLeft: '4px' }}>↗</span>
                </button>
              ))
            )}
          </div>
        ) : (
          <div>
            {filteredHazards.length === 0 ? (
              <p className="small" style={{ padding: '16px 0', color: 'var(--ws-muted)' }}>
                {t('Không có vùng ảnh hưởng phù hợp.', 'No hazard areas match the filter.')}
              </p>
            ) : (
              filteredHazards.map((hz) => (
                <button
                  key={hz.id}
                  className="object-row"
                  onClick={() => onSelectObject(`hazard:${hz.id}`)}
                >
                  <span>
                    <strong>{hz.id}</strong>
                    <small>{t(hz.src[0], hz.src[1])}</small>
                  </span>
                  <span className="tag warn">
                    {hz.area ? `${hz.area} ha` : hz.kind}
                  </span>
                  <span style={{ color: 'var(--ws-muted)', marginLeft: '4px' }}>↗</span>
                </button>
              ))
            )}
          </div>
        )}

        <button
          className="button primary"
          style={{ width: '100%', marginTop: '20px' }}
          onClick={onNext}
        >
          {t('Xem địa bàn ưu tiên', 'Review community priorities')} →
        </button>
      </div>
    </>
  );
};
