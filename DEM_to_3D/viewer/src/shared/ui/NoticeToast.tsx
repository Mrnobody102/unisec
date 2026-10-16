import type { Locale } from '../../types/dear';
import type { Notice } from '../hooks/useNotice';
import { UiIcon } from './UiIcon';
import './action-feedback.css';

export function NoticeToast({ notice, locale, onDismiss }: { notice: Notice | null; locale: Locale; onDismiss: () => void }): JSX.Element {
  return <div className={notice ? 'notice-toast' : 'notice-live'}>
    <div role="status" aria-live="polite" aria-atomic="true">
      {notice && <span key={notice.id}>{notice.text[locale === 'vi' ? 0 : 1]}</span>}
    </div>
    {notice && <button type="button" className="icon-button" aria-label={locale === 'vi' ? 'Đóng thông báo' : 'Dismiss notification'} onClick={onDismiss}><UiIcon name="close" size={16}/></button>}
  </div>;
}
