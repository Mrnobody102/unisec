import React from 'react';
import type { Locale, ScenarioRoute } from '../../types/dear';
import { UiIcon } from './UiIcon';
import { StatusText } from '../../shared/ui/StatusText';

type Props = {
  route: ScenarioRoute;
  locale: Locale;
  onClose: () => void;
  onSelectEvidence: (hzId: string) => void;
};

export const SegmentAnalysisDialog: React.FC<Props> = ({
  route,
  locale,
  onClose,
  onSelectEvidence
}) => {
  const t = (vi: string, en: string) => (locale === 'en' ? en : vi);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="segment-analysis-title" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2 id="segment-analysis-title">{t('Phân tích từng đoạn tuyến', 'Route segment analysis')}</h2>
          <button className="icon-button" onClick={onClose} aria-label={t('Đóng', 'Close')}>
            <UiIcon name="close" />
          </button>
        </div>

        <div className="modal-body">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
            <strong>{t(route.name[0], route.name[1])}</strong>
            <span className="small">{route.lengthKm} km</span>
          </div>

          <div style={{ display: 'grid', gap: '8px' }}>
            {route.segs.map((seg) => (
              <div
                key={seg.id}
                style={{
                  padding: '10px 12px',
                  border: '1px solid var(--ws-line)',
                  borderRadius: '8px',
                  background: 'var(--ws-bg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <strong>{t(seg.name[0], seg.name[1])}</strong>
                  <div style={{ fontSize: '11px', color: 'var(--ws-muted)', marginTop: '2px' }}>
                    {seg.scenarioRoadCode ? `${t('Mã kịch bản', 'Scenario code')} ${seg.scenarioRoadCode}, ` : ''}
                    {seg.fromKm !== undefined && seg.toKm !== undefined
                      ? `${t('Từ km', 'From km')} ${seg.fromKm.toFixed(1)} ${t('đến', 'to')} ${seg.toKm.toFixed(1)}`
                      : `${seg.len} km`}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <StatusText tone={seg.status === 'blocked' ? 'critical' : seg.status === 'uncertain' ? 'warning' : 'neutral'} icon={seg.status === 'blocked' ? 'blocked' : seg.status === 'uncertain' ? 'uncertain' : undefined}>
                    {seg.status === 'blocked'
                      ? t('Bị chặn', 'Blocked')
                      : seg.status === 'uncertain'
                      ? t('Chưa rõ', 'Uncertain')
                      : t('Chưa ghi nhận chặn', 'No blockage reported')}
                  </StatusText>

                  {seg.hz && (
                    <button
                      className="button"
                      style={{ padding: '4px 8px', fontSize: '11px' }}
                      onClick={() => {
                        onSelectEvidence(seg.hz!);
                      }}
                    >
                      {t('Căn cứ', 'Evidence')}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
};
