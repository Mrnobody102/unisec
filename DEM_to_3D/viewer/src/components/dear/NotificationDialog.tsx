import React from 'react';
import type { Locale, RoadSegment } from '../../types/dear';
import type { IncidentPacket } from '../../data/incidentPacket';
import { EvidenceMetadata } from '../../features/incident/EvidenceMetadata';
import { UiIcon } from './UiIcon';
import { StatusText } from '../../shared/ui/StatusText';

type Props = {
  locale: Locale;
  report: IncidentPacket['report'];
  road?: RoadSegment;
  updated: boolean;
  historical?: boolean;
  onApplyReport: () => void;
  onClose: () => void;
  onSelectRoad: (roadId: string) => void;
};

export const NotificationDialog: React.FC<Props> = ({
  locale,
  report,
  road,
  updated,
  historical,
  onApplyReport,
  onClose,
  onSelectRoad
}) => {
  const t = (vi: string, en: string) => (locale === 'en' ? en : vi);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog report-dialog" role="dialog" aria-modal="true" aria-label={t('Báo cáo hiện trường', 'Field report')} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="detail-name">
            <p className="sheet-kind">{t('Báo cáo hiện trường', 'Field report')}</p>
            <h2 id="notification-dialog-title">{t(...report.hazard.name)}</h2>
            {road && <p className="report-road">{t(...road.name)}</p>}
          </div>
          <button className="icon-button" onClick={onClose} aria-label={t('Đóng', 'Close')}>
            <UiIcon name="close" />
          </button>
        </div>

        <div className="modal-body">
          <p className="report-finding">{t(...report.evidence.finding)}</p>
          <section className="workflow-section">
            <EvidenceMetadata evidence={report.evidence} locale={locale} className="fact-rows report-facts"/>
          </section>
        </div>

        <div className="report-foot">
          {!updated && <StatusText tone="warning" icon="uncertain">{t('Chưa áp dụng vào bản đồ', 'Not yet applied to the map')}</StatusText>}
          <div className="report-actions">
            <button className="button" onClick={() => { onSelectRoad(`road:${report.roadId}`); onClose(); }}>{t('Xem đoạn đường', 'View road segment')}</button>
            {!updated && <button className="button primary" onClick={() => { onApplyReport(); onClose(); }}>{t('Cập nhật bản đồ', 'Update map')}</button>}
            {updated && historical && <button className="button primary" onClick={onApplyReport}>{t('Mở bản đồ cập nhật', 'Open updated map')}</button>}
          </div>
        </div>
      </div>
    </div>
  );
};
