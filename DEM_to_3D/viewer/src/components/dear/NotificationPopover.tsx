import type { Locale } from '../../types/dear';

type Props = { locale: Locale; updated: boolean; onOpenDetails: () => void };

export function NotificationPopover({ locale, updated, onOpenDetails }: Props): JSX.Element {
  const t = (vi: string, en: string) => locale === 'en' ? en : vi;
  return <section className="notification-popover" id="incident-notifications" data-popover role="dialog" aria-modal="false" aria-labelledby="notification-preview-title">
    <h2 id="notification-preview-title">{t('Thông báo', 'Notifications')}</h2>
    <div className="notification-preview">
      <time dateTime="2026-09-29T09:45:00+07:00">09:45</time>
      <strong>{t('Đường vòng vào Nậm Khắt bị chặn', 'Bypass to Nậm Khắt blocked')}</strong>
      <p>{t('Đất đá vùi lấp điểm vượt khe.', 'Debris blocks the gully crossing.')}</p>
      <span className="small">{updated ? t('Đã cập nhật bản đồ', 'Applied to map') : t('Chờ cập nhật bản đồ', 'Pending map update')}</span>
      <button className="text-button" onClick={onOpenDetails}>{t('Xem chi tiết', 'View details')}</button>
    </div>
  </section>;
}
