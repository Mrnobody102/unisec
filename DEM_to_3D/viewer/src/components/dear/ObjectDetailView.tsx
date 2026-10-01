import React from 'react';
import type {
  Community,
  Hazard,
  Locale,
  RoadSegment,
  ScenarioRoute
} from '../../types/dear';

type Props = {
  objectId: string;
  locale: Locale;
  roads: RoadSegment[];
  hazards: Hazard[];
  communities: Community[];
  routes: Map<string, { candidate: ScenarioRoute; direct: ScenarioRoute | null }>;
  onBack: () => void;
  onSelectCommunity: (id: string) => void;
  onOpenEvidence: (id: string) => void;
  onOpenImpact: () => void;
  onOpenPriority: () => void;
};

export const ObjectDetailView: React.FC<Props> = ({
  objectId,
  locale,
  roads,
  hazards,
  communities,
  routes,
  onBack,
  onSelectCommunity,
  onOpenEvidence,
  onOpenImpact,
  onOpenPriority
}) => {
  const t = (vi: string, en: string) => (locale === 'en' ? en : vi);

  const [kind, id] = objectId.split(':');

  const road = kind === 'road' ? roads.find((r) => r.id === id) : undefined;
  const hazard = kind === 'hazard' ? hazards.find((h) => h.id === id) : undefined;

  let title = id;
  if (kind === 'road' && road) title = `${road.ref[0]} (${road.id})`;
  else if (kind === 'hazard') title = `${hazard?.id || id}`;
  else if (kind === 'poi') title = t('Sở chỉ huy tiền phương Nậm Kha', 'Nậm Kha FOB staging point');
  else if (kind === 'aoi') title = t('Vùng quan tâm thung lũng Nậm Kha', 'Nậm Kha AOI boundary');

  return (
    <>
      <div className="sidebar-top">
        <button className="text-button back" onClick={onBack}>
          ← {t('Quay lại', 'Back')}
        </button>
        <div className="eyebrow">{t('ĐỐI TƯỢNG BẢN ĐỒ', 'MAP OBJECT')}</div>
        <h1 id="object-title" style={{ marginTop: '4px' }}>{title}</h1>
      </div>

      <div className="sidebar-scroll">
        {kind === 'road' && road && (
          <section className="workflow-section" style={{ borderTop: 0 }}>
            <span
              className={`tag ${
                road.status === 'blocked' ? 'danger' : road.status === 'uncertain' ? 'warn' : ''
              }`}
            >
              {road.status === 'blocked'
                ? t('Bị chặn', 'Blocked')
                : road.status === 'uncertain'
                ? t('Chưa rõ', 'Uncertain')
                : t('Thông', 'Open')}
            </span>

            <dl className="incident-facts" style={{ marginTop: '14px' }}>
              <div>
                <dt>{t('Chiều dài đoạn', 'Segment length')}</dt>
                <dd>{road.len} km</dd>
              </div>
              <div>
                <dt>{t('Ảnh hưởng liên quan', 'Related hazard')}</dt>
                <dd>{road.hz || t('Chưa ghi nhận', 'None')}</dd>
              </div>
            </dl>

            <p style={{ marginTop: '10px' }}>
              {road.note
                ? t(road.note[0], road.note[1])
                : t(
                    'Chưa có báo cáo xác minh tải trọng cho phép của phương tiện.',
                    'No axle load or bridge clearance verification report.'
                  )}
            </p>

            {road.hz && (
              <button
                className="button soft"
                style={{ width: '100%', marginTop: '14px' }}
                onClick={() => onOpenEvidence(road.hz!)}
              >
                {t('Xem nguồn thông tin', 'View evidence')} ({road.hz})
              </button>
            )}

            <section className="workflow-section" style={{ marginTop: '16px' }}>
              <h3>{t('Địa bàn có tuyến đi qua', 'Communities using this segment')}</h3>
              {communities
                .filter((c) => {
                  const pair = routes.get(c.id);
                  if (!pair) return false;
                  return (
                    pair.candidate.segs.some((s) => s.id === road.id) ||
                    pair.direct?.segs.some((s) => s.id === road.id)
                  );
                })
                .map((c) => (
                  <button
                    key={c.id}
                    className="object-row"
                    onClick={() => onSelectCommunity(c.id)}
                  >
                    <strong>{c.name}</strong>
                    <span style={{ color: 'var(--ws-muted)' }}>↗</span>
                  </button>
                ))}
            </section>
          </section>
        )}

        {kind === 'hazard' && hazard && (
          <section className="workflow-section" style={{ borderTop: 0 }}>
            <span className="tag danger">
              {hazard.kind === 'landslide' ? t('Vết sạt lở', 'Landslide') : t('Nghi ngập', 'Flood indication')}
            </span>

            <dl className="incident-facts" style={{ marginTop: '14px' }}>
              <div>
                <dt>{t('Diện tích', 'Area')}</dt>
                <dd>{hazard.area} ha</dd>
              </div>
              <div>
                <dt>{t('Thời điểm phát hiện', 'Detected')}</dt>
                <dd style={{ fontSize: '13px' }}>{hazard.detected}</dd>
              </div>
            </dl>

            <p style={{ marginTop: '8px' }}>
              {t('Nguồn căn cứ: ', 'Source basis: ')}
              <strong>{t(hazard.src[0], hazard.src[1])}</strong>
            </p>

            <button
              className="button soft"
              style={{ width: '100%', marginTop: '14px' }}
              onClick={() => onOpenEvidence(hazard.id)}
            >
              {t('Chi tiết nguồn và ảnh vệ tinh', 'Satellite & source details')}
            </button>
          </section>
        )}

        {kind === 'poi' && (
          <section className="workflow-section" style={{ borderTop: 0 }}>
            <p>
              {t(
                'Điểm xuất phát của các phương án tiếp cận trong sự kiện thung lũng Nậm Kha.',
                'Starting staging point for all access options in the Nậm Kha incident.'
              )}
            </p>
            <button
              className="button primary"
              style={{ width: '100%', marginTop: '16px' }}
              onClick={onOpenPriority}
            >
              {t('Chọn địa bàn cần tiếp cận', 'Choose destination community')} →
            </button>
          </section>
        )}

        {kind === 'aoi' && (
          <section className="workflow-section" style={{ borderTop: 0 }}>
            <dl className="incident-facts">
              <div>
                <dt>{t('Diện tích kịch bản', 'Scenario area')}</dt>
                <dd>214 km²</dd>
              </div>
              <div>
                <dt>{t('Địa bàn', 'Communities')}</dt>
                <dd>7 {t('thôn bản', 'villages')}</dd>
              </div>
            </dl>
            <button
              className="button primary"
              style={{ width: '100%', marginTop: '16px' }}
              onClick={onOpenImpact}
            >
              {t('Xem tác động trong vùng', 'Review impacts in this area')} →
            </button>
          </section>
        )}
      </div>
    </>
  );
};
