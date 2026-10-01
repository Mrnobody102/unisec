import React from 'react';
import type { IncidentModel, Locale } from '../../types/dear';

type Props = {
  incident: IncidentModel;
  locale: Locale;
  updated: boolean;
  communityCount: number;
  onOpenTimeline: () => void;
  onOpenData: () => void;
  onNext: () => void;
  onSelectObject: (obj: string) => void;
};

export const IncidentView: React.FC<Props> = ({
  incident,
  locale,
  updated,
  communityCount,
  onOpenTimeline,
  onOpenData,
  onNext,
  onSelectObject
}) => {
  const t = (vi: string, en: string) => (locale === 'en' ? en : vi);

  const asOfDate = new Date(updated ? incident.asOfUpdated : incident.asOf);

  return (
    <>
      <div className="sidebar-top">
        <div className="eyebrow">{incident.id}</div>
        <h1>{t('Sạt lở và lũ quét', 'Landslide & Flash Flood')}</h1>
        <div className="incident-status">
          <span className="tag blue">{t('Đang đánh giá ứng phó', 'Response assessment')}</span>
          <span className="small">{t('Nậm Kha, 29/09/2026', 'Nậm Kha, 29 Sep 2026')}</span>
        </div>
      </div>

      <div className="sidebar-scroll">
        <section className="workflow-section">
          <dl className="incident-facts">
            <div>
              <dt>{t('Kích hoạt', 'Triggered')}</dt>
              <dd>03:40 <small>UTC+7</small></dd>
            </div>
            <div>
              <dt>{t('Thời gian đã qua', 'Elapsed')}</dt>
              <dd>{updated ? '6h 05' : '5h 51'}</dd>
            </div>
            <div>
              <dt>{t('Vùng quan tâm', 'Area of interest')}</dt>
              <dd>
                <button
                  className="text-button"
                  onClick={() => onSelectObject('aoi:AOI')}
                  style={{ fontSize: '15px', fontWeight: 600 }}
                >
                  {incident.areaKm2} km² ↗
                </button>
              </dd>
            </div>
            <div>
              <dt>{t('Địa bàn theo dõi', 'Communities')}</dt>
              <dd>{communityCount} <small>{t('thôn, bản', 'villages')}</small></dd>
            </div>
          </dl>

          <button
            className="button primary"
            style={{ width: '100%', marginTop: '6px' }}
            onClick={onNext}
          >
            {t('Xem khu vực bị ảnh hưởng', 'Review affected area')} →
          </button>
        </section>

        <section className="workflow-section">
          <div className="section-line">
            <h3>{t('Diễn biến xử lý', 'Event timeline')}</h3>
            <button className="text-button" onClick={onOpenTimeline}>
              {t('Chi tiết', 'Details')}
            </button>
          </div>
          <ol className="event-timeline">
            {[incident.timeline[0], incident.timeline[3], incident.timeline[5]].map((x, idx) => (
              <li key={idx}>
                <time>{x[0]}</time>
                <span>{t(x[1], x[2])}</span>
              </li>
            ))}
            <li className="pending">
              <time>{updated ? '09:45' : t('Tiếp theo', 'Next')}</time>
              <span>
                {updated
                  ? t('Đường PR-7 bị chặn tại U-1; cần đánh giá lại', 'PR-7 blocked at U-1; reassessment needed')
                  : t('Xác minh tuyến và nhu cầu hỗ trợ', 'Verify access and relief needs')}
              </span>
            </li>
          </ol>
        </section>

        <section className="workflow-section">
          <div className="section-line">
            <h3>{t('Thời điểm dữ liệu', 'Data freshness')}</h3>
            <button className="text-button" onClick={onOpenData}>
              {t('Nguồn', 'Sources')}
            </button>
          </div>

          <div>
            {incident.sources.map((s) => {
              const isFieldChanged = updated && s.id === 'field';
              const observedTime = isFieldChanged ? '2026-09-29T09:40:00+07:00' : s.observedAt;
              const diffMin = Math.round(
                (asOfDate.getTime() - new Date(observedTime).getTime()) / 60000
              );
              const ageStr =
                diffMin < 60
                  ? `${diffMin} ${t('phút', 'min')}`
                  : `${Math.floor(diffMin / 60)}h ${diffMin % 60}`;

              return (
                <div key={s.id} className="freshness-row">
                  <span>
                    <strong>{t(s.name[0], s.name[1])}</strong>
                    <small>
                      {t(s.note[0], s.note[1])} {isFieldChanged ? '09:40' : s.time}
                    </small>
                  </span>
                  <span>{ageStr}</span>
                </div>
              );
            })}
            <p className="small" style={{ marginTop: '10px' }}>
              {t('Tuổi dữ liệu tính đến', 'Data age as of')}{' '}
              {updated ? '09:45' : '09:31'} (UTC+7).
            </p>
          </div>
        </section>
      </div>
    </>
  );
};
