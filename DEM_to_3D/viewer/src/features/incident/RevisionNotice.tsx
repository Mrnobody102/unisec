import type { Locale } from '../../types/dear';
import { localClock } from './sourceTime';

export function RevisionNotice({ locale, timestamp, onLatest }: { locale: Locale; timestamp: string; onLatest: () => void }): JSX.Element {
  return <div className="revision-notice" role="status">
    <span>{locale === 'vi' ? 'Đang xem bản đồ lúc' : 'Viewing map at'} <time dateTime={timestamp}>{localClock(timestamp)}</time></span>
    <button className="text-button" onClick={onLatest}>{locale === 'vi' ? 'Về dữ liệu mới nhất' : 'Return to latest'}</button>
  </div>;
}
