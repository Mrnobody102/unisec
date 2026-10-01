import React, { useState } from 'react';
import type { Community, CommunityFilter, Locale } from '../../types/dear';

type Props = {
  communities: Community[];
  locale: Locale;
  filter: CommunityFilter;
  onChangeFilter: (f: CommunityFilter) => void;
  onSelectCommunity: (id: string) => void;
  selectedId: string | null;
};

export const CommunityListView: React.FC<Props> = ({
  communities,
  locale,
  filter,
  onChangeFilter,
  onSelectCommunity,
  selectedId
}) => {
  const [query, setQuery] = useState('');

  const t = (vi: string, en: string) => (locale === 'en' ? en : vi);

  const filtered = [...communities]
    .sort((a, b) => a.prio - b.prio)
    .filter((c) => {
      if (filter === 'priority') return c.prio === 1;
      if (filter === 'uncertain') return c.prio === 1 || c.prio === 2;
      return true;
    })
    .filter((c) => {
      const text = `${c.name} ${c.commune} ${c.desc[0]} ${c.desc[1]}`.toLowerCase();
      return text.includes(query.toLowerCase());
    });

  return (
    <>
      <div className="sidebar-top">
        <div className="eyebrow">{t('ĐỊA BÀN', 'COMMUNITIES')}</div>
        <h1 style={{ marginTop: '4px' }}>{t('Địa bàn cần chú ý', 'Communities to review')}</h1>
        <p className="sidebar-intro">
          {t('Chọn địa bàn để xem đường tiếp cận và căn cứ ưu tiên.', 'Select a community to review access and priority.')}
        </p>

        <div className="search-box">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="search"
            placeholder={t('Tìm thôn, bản…', 'Find village…')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="filters">
          <button
            className="filter"
            aria-pressed={filter === 'all'}
            onClick={() => onChangeFilter('all')}
          >
            {t('Tất cả', 'All')}
          </button>
          <button
            className="filter"
            aria-pressed={filter === 'priority'}
            onClick={() => onChangeFilter('priority')}
          >
            {t('Ưu tiên cao', 'High priority')}
          </button>
          <button
            className="filter"
            aria-pressed={filter === 'uncertain'}
            onClick={() => onChangeFilter('uncertain')}
          >
            {t('Cần xác minh', 'Uncertain')}
          </button>
        </div>
      </div>

      <div className="sidebar-scroll">
        <div className="list-label">
          <span>
            {filtered.length} {t('địa điểm', 'places')}
          </span>
          <span>{t('Theo mức ưu tiên', 'Ordered by priority')}</span>
        </div>

        {filtered.length === 0 ? (
          <p className="small" style={{ padding: '20px 0', color: 'var(--ws-muted)' }}>
            {t('Không tìm thấy địa điểm phù hợp.', 'No matching communities found.')}
          </p>
        ) : (
          filtered.map((c) => (
            <button
              key={c.id}
              className={`community ${selectedId === c.id ? 'active' : ''}`}
              onClick={() => onSelectCommunity(c.id)}
            >
              <span className="community-name">
                <span className={`priority-dot p${c.prio}`} />
                {c.name}
                <span className="arrow">↗</span>
              </span>
              <p>{t(c.desc[0], c.desc[1])}</p>
              <div className="community-meta">
                <span className={`tag ${c.prio === 1 ? 'danger' : 'warn'}`}>
                  {c.prio === 1 ? t('Ưu tiên cao', 'High priority') : t('Cần theo dõi', 'Monitor')}
                </span>
                <span className="small">
                  {c.pop} {t('người (tham chiếu)', 'residents (baseline)')}
                </span>
              </div>
            </button>
          ))
        )}
      </div>
    </>
  );
};
