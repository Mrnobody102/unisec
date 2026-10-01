import React from 'react';
import type { Locale, ScenarioRoute } from '../../types/dear';

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
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{t('Phân tích chi tiết từng đoạn tuyến', 'Route Segment Breakdown')}</h2>
          <button className="icon-button" onClick={onClose}>
            ×
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
                  <strong>{t(seg.ref[0], seg.ref[1])}</strong>
                  <div style={{ fontSize: '11px', color: 'var(--ws-muted)', marginTop: '2px' }}>
                    {seg.fromKm !== undefined && seg.toKm !== undefined
                      ? `Km ${seg.fromKm.toFixed(1)} – ${seg.toKm.toFixed(1)}`
                      : `${seg.len} km`}
                    {seg.hz ? ` · ${seg.hz}` : ''}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    className={`tag ${
                      seg.status === 'blocked' ? 'danger' : seg.status === 'uncertain' ? 'warn' : ''
                    }`}
                  >
                    {seg.status === 'blocked'
                      ? t('Bị chặn', 'Blocked')
                      : seg.status === 'uncertain'
                      ? t('Chưa rõ', 'Uncertain')
                      : t('Thông', 'Open')}
                  </span>

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

          <div style={{ marginTop: '20px' }}>
            <button className="button primary" style={{ width: '100%' }} onClick={onClose}>
              {t('Đóng', 'Close')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
