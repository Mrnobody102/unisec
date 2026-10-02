import React from 'react';
import type { Locale } from '../../types/dear';
import type { IncidentPacket } from '../../data/incidentPacket';
import { localClock } from '../../features/incident/sourceTime';
import { UiIcon } from './UiIcon';

type Props = {
  locale: Locale;
  report: IncidentPacket['report'];
  updated: boolean;
  onApplyReport: () => void;
  onClose: () => void;
  onSelectRoad: (roadId: string) => void;
};

export const NotificationDialog: React.FC<Props> = ({
  locale,
  report,
  updated,
  onApplyReport,
  onClose,
  onSelectRoad
}) => {
  const t = (vi: string, en: string) => (locale === 'en' ? en : vi);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="notification-dialog-title" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2 id="notification-dialog-title">{t('Tin hiện trường', 'Field report')}</h2>
          <button className="icon-button" onClick={onClose} aria-label={t('Đóng', 'Close')}>
            <UiIcon name="close" />
          </button>
        </div>

        <div className="modal-body">
          <div className="notification-list">
            <div
              className="notification-item"
            >
              <span className="notification-marker critical" />
              <div>
                <strong style={{ color: 'var(--critical-ink)' }}>
                  {t(...report.hazard.name)}
                </strong>
                <small>
                  {t('Quan sát', 'Observed')} {localClock(report.evidence.observedAt)}, {t('nhận tin', 'received')} {localClock(report.evidence.receivedAt)}
                </small>
                {!updated && <small className="notification-pending">{t('Chưa áp dụng vào bản đồ', 'Not yet applied to the map')}</small>}
                <div className="notification-actions">
                  {!updated && <button className="button primary" onClick={() => { onApplyReport(); onClose(); }}>{t('Cập nhật bản đồ', 'Update map')}</button>}
                  <button className="text-button" onClick={() => { onSelectRoad(`road:${report.roadId}`); onClose(); }}>{t('Xem đoạn đường', 'View road segment')}</button>
                </div>
              </div>
            </div>

          </div>
          <p className="notification-finding">{t(...report.evidence.finding)}</p>

        </div>
      </div>
    </div>
  );
};
