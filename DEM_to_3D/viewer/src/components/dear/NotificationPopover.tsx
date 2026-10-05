import type { IncidentModel, Locale, RoadSegment } from '../../types/dear';
import type { IncidentPacket } from '../../data/incidentPacket';
import { localClock } from '../../features/incident/sourceTime';

type Props = { locale: Locale; incident: IncidentModel; report: IncidentPacket['report']; road?: RoadSegment; updated: boolean; onOpenDetails: () => void; onOpenIncident: () => void; onOpenAll: () => void };

export function NotificationPopover({ locale, incident, report, road, updated, onOpenDetails, onOpenIncident, onOpenAll }: Props): JSX.Element {
  const t = (vi: string, en: string) => locale === 'en' ? en : vi;
  return <section className="notification-popover" id="incident-notifications" data-popover role="dialog" aria-modal="false" aria-labelledby="notification-preview-title">
    <h2 id="notification-preview-title">{t('Thông báo', 'Notifications')}</h2>
    <div className="notification-preview">
      <time dateTime={report.evidence.receivedAt}>{localClock(report.evidence.receivedAt)}</time>
      <strong className="notification-critical-title">{t(...report.hazard.name)}</strong>
      {road && <span className="notification-road-name">{t(...road.name)}</span>}
      <p>{t(...report.evidence.finding)}</p>
      <span className="small">{updated ? t('Đã cập nhật bản đồ', 'Applied to map') : t('Chờ cập nhật bản đồ', 'Pending map update')}</span>
      <button className="text-button" onClick={onOpenDetails}>{t('Xem chi tiết', 'View details')}</button>
    </div>
    <div className="notification-preview notification-incident">
      <time dateTime={incident.triggeredAt}>{localClock(incident.triggeredAt)}</time>
      <strong>{t('Sự kiện được kích hoạt tại Nậm Kha', 'Incident triggered in Nậm Kha')}</strong>
      <button className="text-button" onClick={onOpenIncident}>{t('Mở sự kiện', 'Open incident')}</button>
    </div>
    <button className="text-button notification-all" onClick={onOpenAll}>{t('Tất cả thông báo', 'All notifications')}</button>
  </section>;
}
