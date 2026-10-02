import React from 'react';
import type { Locale } from '../../types/dear';
import { UiIcon } from './UiIcon';

type Props = {
  locale: Locale;
  updated: boolean;
  onApplyReport: () => void;
  onClose: () => void;
  onSelectRoad: (roadId: string) => void;
  onSelectCommunity: (id: string) => void;
};

export const NotificationDialog: React.FC<Props> = ({
  locale,
  updated,
  onApplyReport,
  onClose,
  onSelectRoad,
  onSelectCommunity
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
                  {t('Đường vòng vào Nậm Khắt bị chặn tại điểm vượt khe', 'Mountain bypass to Nậm Khắt blocked at the gully crossing')}
                </strong>
                <small>
                  {t('Quan sát 09:40, nhận tin 09:45 ngày 29/09/2026', 'Observed 09:40, received 09:45 on 29 Sep 2026')}
                </small>
                {!updated && <small className="notification-pending">{t('Chưa áp dụng vào bản đồ', 'Not yet applied to the map')}</small>}
                <div className="notification-actions">
                  {!updated && <button className="button primary" onClick={() => { onApplyReport(); onSelectCommunity('NK'); onClose(); }}>{t('Cập nhật bản đồ', 'Update map')}</button>}
                  <button className="text-button" onClick={() => { onSelectRoad('road:E13'); onClose(); }}>{t('Xem đoạn đường', 'View road segment')}</button>
                </div>
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
};
