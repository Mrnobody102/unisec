import React from 'react';
import type {
  Community,
  Hazard,
  Locale,
  RoadSegment,
  ScenarioRoutePair
} from '../../types/dear';
import { UiIcon } from './UiIcon';
import { StatusText } from '../../shared/ui/StatusText';

type Props = {
  objectId: string;
  parentName?: string;
  locale: Locale;
  roads: RoadSegment[];
  hazards: Hazard[];
  communities: Community[];
  routes: Map<string, ScenarioRoutePair>;
  onBack: () => void;
  onSelectCommunity: (id: string) => void;
  onOpenEvidence: (id: string) => void;
  onOpenPriority: () => void;
};

export const ObjectDetailView: React.FC<Props> = ({
  objectId,
  parentName,
  locale,
  roads,
  hazards,
  communities,
  routes,
  onBack,
  onSelectCommunity,
  onOpenEvidence,
  onOpenPriority
}) => {
  const t = (vi: string, en: string) => (locale === 'en' ? en : vi);

  const [kind, id] = objectId.split(':');

  const road = kind === 'road' ? roads.find((r) => r.id === id) : undefined;
  const hazard = kind === 'hazard' ? hazards.find((h) => h.id === id) : undefined;
  const relatedHazard = road?.hz ? hazards.find(item => item.id === road.hz) : undefined;

  let title = id;
  if (kind === 'road' && road) title = t(road.name[0], road.name[1]);
  else if (kind === 'hazard' && hazard) title = t(hazard.name[0], hazard.name[1]);
  else if (kind === 'poi') title = t('Điểm tập kết Nậm Kha', 'Nậm Kha staging point');

  return (
    <>
      <div className="sidebar-top">
        {parentName && <button className="text-button back panel-parent" onClick={onBack}>
          <UiIcon name="back" size={16} /> {parentName}
        </button>}
        <div className="eyebrow">{kind === 'road' ? t('Đoạn đường', 'Road segment') : kind === 'hazard' ? t('Điểm ảnh hưởng', 'Affected site') : t('Khu vực', 'Location')}</div>
        <div className="detail-title"><h1 id="object-title">{title}</h1><button className="icon-button panel-close" onClick={onBack} aria-label={t('Đóng chi tiết đối tượng', 'Close feature details')} title={t('Đóng chi tiết đối tượng', 'Close feature details')}><UiIcon name="close" /></button></div>
      </div>

      <div className="sidebar-scroll">
        {kind === 'road' && road && (
          <section className="workflow-section" style={{ borderTop: 0 }}>
            <StatusText tone={road.status === 'blocked' ? 'critical' : road.status === 'uncertain' ? 'warning' : 'neutral'} icon={road.status === 'blocked' ? 'blocked' : road.status === 'uncertain' ? 'uncertain' : undefined}>
              {road.status === 'blocked'
                ? t('Bị chặn', 'Blocked')
                : road.status === 'uncertain'
                ? t('Chưa rõ', 'Uncertain')
                : t('Chưa ghi nhận chặn', 'No blockage reported')}
            </StatusText>

            <dl className="incident-facts" style={{ marginTop: '14px' }}>
              <div>
                <dt>{t('Chiều dài đoạn', 'Segment length')}</dt>
                <dd>{road.len} km</dd>
              </div>
              {relatedHazard && <div>
                <dt>{t('Ảnh hưởng liên quan', 'Related hazard')}</dt>
                <dd>{relatedHazard
                  ? t(relatedHazard.name[0], relatedHazard.name[1])
                  : road.hz || t('Chưa ghi nhận', 'None')}</dd>
              </div>}
            </dl>

            {relatedHazard && <p className="small">
              {t('Căn cứ', 'Source')}: {t(relatedHazard.src[0], relatedHazard.src[1])}. {t('Ghi nhận', 'Observed')}: {relatedHazard.detected}.
            </p>}

            <p style={{ marginTop: '10px' }}>
              {road.note
                ? t(road.note[0], road.note[1])
                : t(
                    'Chưa có báo cáo xác minh khả năng phương tiện đi qua đoạn này.',
                    'Vehicle access on this segment has not been verified.'
                  )}
            </p>

            {road.hz && (
              <button
                className="button soft"
                style={{ width: '100%', marginTop: '14px' }}
                onClick={() => onOpenEvidence(road.hz!)}
              >
                {t('Xem nguồn thông tin', 'View evidence')}
              </button>
            )}

            <details className="feature-reference"><summary>{t('Thông tin tham chiếu', 'Reference information')}</summary><dl className="incident-facts">
              <div><dt>{t('Mã đoạn', 'Segment ID')}</dt><dd>{id}</dd></div>
              {road.scenarioRoadCode && <div><dt>{t('Mã tuyến mô phỏng', 'Simulated route code')}</dt><dd>{road.scenarioRoadCode}</dd></div>}
            </dl></details>
            {communities.some(c => { const pair = routes.get(c.id); return pair?.candidate?.segs.some(s => s.id === road.id) || pair?.direct?.segs.some(s => s.id === road.id); }) && <section className="workflow-section" style={{ marginTop: '16px' }}>
              <h3>{t('Địa bàn có tuyến đi qua', 'Communities using this segment')}</h3>
              {communities
                .filter((c) => {
                  const pair = routes.get(c.id);
                  if (!pair) return false;
                  return (
                    pair.candidate?.segs.some((s) => s.id === road.id) ||
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
                  </button>
                ))}
            </section>}
          </section>
        )}

        {kind === 'hazard' && hazard && (
          <section className="workflow-section" style={{ borderTop: 0 }}>
            <StatusText tone="warning" icon="uncertain">
              {hazard.kind === 'landslide'
                ? hazard.observation === 'reported' ? t('Sạt lở được báo từ hiện trường', 'Landslide reported from field') : t('Nghi sạt lở, cần xác minh', 'Suspected landslide, verification needed')
                : hazard.kind === 'bridge' ? t('Cầu cần xác minh', 'Bridge to verify')
                : hazard.kind === 'crossing' ? t('Điểm vượt khe cần xác minh', 'Gully crossing to verify')
                : t('Nghi ngập', 'Flood indication')}
            </StatusText>

            <dl className="incident-facts" style={{ marginTop: '14px' }}>
              <div><dt>{t('Mã tham chiếu', 'Reference ID')}</dt><dd>{id}</dd></div>
              {(hazard.kind === 'landslide' || hazard.kind === 'flood') && <div>
                <dt>{t('Diện tích ước tính', 'Estimated area')}</dt>
                <dd>{hazard.area == null ? t('Chưa xác định', 'Unknown') : `${hazard.area} ha`}</dd>
              </div>}
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
              {t('Chi tiết nguồn', 'Source details')}
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
              {t('Chọn địa bàn cần tiếp cận', 'Choose destination community')}
            </button>
          </section>
        )}

      </div>
    </>
  );
};
