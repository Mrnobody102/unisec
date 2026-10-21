import type { IncidentPacket } from '../../data/incidentPacket';
import type { Locale } from '../../types/dear';
import { localClock } from './sourceTime';
import { UiIcon } from '../../shared/ui/UiIcon';

type Props = {
  locale: Locale;
  expanded: boolean;
  onCollapse: () => void;
  packet: IncidentPacket;
  applied: boolean;
  historical: boolean;
  onRevision: (historical: boolean) => void;
  onReport: () => void;
  onJournal: () => void;
};

/** Only recorded assessments are selectable. Receiving a report does not publish it. */
export function AssessmentTimeline({ expanded, onCollapse, locale, packet, applied, historical, onRevision, onReport, onJournal }: Props) {
  const t = (vi: string, en: string) => locale === 'vi' ? vi : en;
  return <footer id="assessment-timeline" hidden={!expanded} className="assessment-timeline" aria-label={t('Diễn biến sự kiện', 'Incident timeline')}>
    <button className="icon-button assessment-collapse" onClick={onCollapse} aria-label={t('Thu gọn diễn biến', 'Collapse timeline')} title={t('Thu gọn diễn biến', 'Collapse timeline')}><UiIcon name="collapse" size={16}/></button>
    <span className="assessment-timeline-title">{t('Diễn biến', 'Timeline')}<small>UTC+7</small></span>
    <div className="assessment-timeline-track" role="group" aria-label={t('Các mốc sự kiện', 'Incident events')}>
      <button className="assessment-moment" aria-pressed={!applied || historical} onClick={() => onRevision(applied)}>
        <time dateTime={packet.incident.asOf}>{localClock(packet.incident.asOf)}</time>
        <span>{t('Đánh giá ban đầu', 'Initial assessment')}</span>
      </button>
      {applied ? <button className="assessment-moment" aria-pressed={!historical} onClick={() => onRevision(false)}>
        <time dateTime={packet.incident.asOfUpdated}>{localClock(packet.incident.asOfUpdated)}</time>
        <span>{t('Cập nhật thực địa', 'Field update')}</span>
      </button> : <button className="assessment-moment assessment-pending" title={t('Xem báo cáo hiện trường', 'View field report')} onClick={onReport}>
        <time dateTime={packet.report.evidence.receivedAt}>{localClock(packet.report.evidence.receivedAt)}</time>
        <span>{t('Nhận báo cáo', 'Report received')}</span>
      </button>}
    </div>
    <button className="icon-button" aria-label={t('Mở nhật ký', 'Open journal')} title={t('Nhật ký sự kiện', 'Incident journal')} onClick={onJournal}><UiIcon name="history" size={18}/></button>
  </footer>;
}
