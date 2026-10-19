import type { IncidentPacket } from '../../data/incidentPacket';
import type { Locale } from '../../types/dear';
import { localClock } from './sourceTime';
import { UiIcon } from '../../shared/ui/UiIcon';

type Props = {
  locale: Locale;
  packet: IncidentPacket;
  applied: boolean;
  historical: boolean;
  onRevision: (historical: boolean) => void;
  onReport: () => void;
  onJournal: () => void;
};

/** Only recorded assessments are selectable. Receiving a report does not publish it. */
export function AssessmentTimeline({ locale, packet, applied, historical, onRevision, onReport, onJournal }: Props) {
  const t = (vi: string, en: string) => locale === 'vi' ? vi : en;
  return <footer className="assessment-timeline" aria-label={t('Diễn biến sự kiện', 'Incident timeline')}>
    <span className="assessment-timeline-title">{t('Diễn biến', 'Timeline')}</span>
    <div className="assessment-timeline-track" role="group" aria-label={t('Bản đánh giá', 'Assessments')}>
      <button className="assessment-moment" aria-pressed={!applied || historical} onClick={() => onRevision(applied)}>
        <time dateTime={packet.incident.asOf}>{localClock(packet.incident.asOf)}</time>
        <span>{t('Đánh giá ban đầu', 'Initial assessment')}</span>
      </button>
      {applied ? <button className="assessment-moment" aria-pressed={!historical} onClick={() => onRevision(false)}>
        <time dateTime={packet.incident.asOfUpdated}>{localClock(packet.incident.asOfUpdated)}</time>
        <span>{t('Cập nhật thực địa', 'Field update')}</span>
      </button> : <button className="assessment-moment assessment-pending" onClick={onReport}>
        <time dateTime={packet.report.evidence.receivedAt}>{localClock(packet.report.evidence.receivedAt)}</time>
        <span>{t('Báo cáo chờ kiểm tra', 'Report awaiting review')}</span>
      </button>}
    </div>
    <button className="icon-button" aria-label={t('Mở nhật ký', 'Open journal')} title={t('Nhật ký sự kiện', 'Incident journal')} onClick={onJournal}><UiIcon name="history" size={18}/></button>
  </footer>;
}
