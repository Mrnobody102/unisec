import React from 'react';
import type { Locale } from '../../types/dear';

type Props = {
  locale: Locale;
  updated: boolean;
  onSimulateUpdate: () => void;
  onClose: () => void;
  onSelectRoad: (roadId: string) => void;
  onOpenIncident: () => void;
};

export const NotificationDialog: React.FC<Props> = ({
  locale,
  updated,
  onSimulateUpdate,
  onClose,
  onSelectRoad,
  onOpenIncident
}) => {
  const t = (vi: string, en: string) => (locale === 'en' ? en : vi);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{t('Thông báo sự kiện', 'Incident notifications')}</h2>
          <button className="icon-button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-body">
          <div className="notification-list">
            <button
              className="notification-item"
              onClick={() => {
                onOpenIncident();
                onClose();
              }}
            >
              <span className="notification-marker" />
              <span>
                <strong>{t('Sạt lở và lũ quét tại thung lũng Nậm Kha', 'Landslide & flash flood in Nậm Kha')}</strong>
                <small>{t('Kích hoạt lúc 03:40, 29/09/2026', 'Triggered at 03:40, 29 Sep 2026')}</small>
              </span>
              <span style={{ marginLeft: 'auto', color: 'var(--select-ink)' }}>↗</span>
            </button>

            {updated ? (
              <button
                className="notification-item"
                onClick={() => {
                  onSelectRoad('road:E13');
                  onClose();
                }}
              >
                <span className="notification-marker critical" />
                <span>
                  <strong style={{ color: 'var(--critical-ink)' }}>
                    {t('Đường PR-7 bị chặn tại U-1', 'PR-7 blocked at U-1')}
                  </strong>
                  <small>
                    {t('Hiện trường quan sát 09:40 · nhận tin 09:45', 'Observed 09:40 · received 09:45')}
                  </small>
                </span>
                <span style={{ marginLeft: 'auto', color: 'var(--select-ink)' }}>↗</span>
              </button>
            ) : (
              <p className="small" style={{ padding: '12px 6px', color: 'var(--ws-muted)' }}>
                {t('Chưa có bản tin mới sau mốc 09:31.', 'No new report since 09:31 snapshot.')}
              </p>
            )}
          </div>

          <div className="notification-demo">
            <div>
              <strong>{t('Diễn tập tình huống SIC', 'SIC Demo Scenario')}</strong>
              <div style={{ fontSize: '11.5px', color: 'var(--ws-muted)', marginTop: '2px' }}>
                {t(
                  'Mô phỏng tin hiện trường báo sạt lở mới làm chặn tuyến PR-7.',
                  'Simulate incoming field report blocking ridge route PR-7.'
                )}
              </div>
            </div>

            <button
              className="button primary"
              disabled={updated}
              onClick={onSimulateUpdate}
            >
              {updated
                ? t('Đã nhận bản tin U-1', 'U-1 Report Received')
                : t('Nhận bản tin U-1', 'Receive U-1 Report')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
