import type { IncidentModel, Locale } from '../../types/dear';
import type { IncidentPacket } from '../../data/incidentPacket';
import { localClock } from '../../features/incident/sourceTime';

type Props = { locale: Locale; incident: IncidentModel; report: IncidentPacket['report']; updated: boolean; onOpenDetails: () => void; onOpenIncident: () => void };

export function NotificationPopover({ locale, incident, report, updated, onOpenDetails, onOpenIncident }: Props): JSX.Element {
  const t = (vi: string, en: string) => locale === 'en' ? en : vi;
  return <section className="notification-popover" id="incident-notifications" data-popover role="dialog" aria-modal="false" aria-labelledby="notification-preview-title">
    <h2 id="notification-preview-title">{t('Thông báo', 'Notifications')}</h2>
    <div className="notification-preview">
      <time dateTime={report.evidence.receivedAt}>{localClock(report.evidence.receivedAt)}</time>
      <strong>{t(...report.hazard.name)}</strong>
      <p>{t(...report.evidence.finding)}</p>
      <span className="small">{updated ? t('Đã cập nhật bản đồ', 'Applied to map') : t('Chờ cập nhật bản đồ', 'Pending map update')}</span>
      <button className="text-button" onClick={onOpenDetails}>{t('Xem chi tiết', 'View details')}</button>
    </div>
    <div className="notification-preview notification-incident">
      <time dateTime={incident.triggeredAt}>{localClock(incident.triggeredAt)}</time>
      <strong>{t('Sự kiện được kích hoạt tại Nậm Kha', 'Incident triggered in Nậm Kha')}</strong>
      <button className="text-button" onClick={onOpenIncident}>{t('Mở sự kiện', 'Open incident')}</button>
    </div>
  </section>;
}
