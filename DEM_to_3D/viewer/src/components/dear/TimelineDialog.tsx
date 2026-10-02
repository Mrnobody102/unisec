import { useEffect, useRef } from 'react';
import type { IncidentModel, Locale } from '../../types/dear';
import { UiIcon } from './UiIcon';

export function TimelineDialog({ incident, locale, updated, onClose }: { incident: IncidentModel; locale: Locale; updated: boolean; onClose: () => void }): JSX.Element {
  const ref = useRef<HTMLDialogElement>(null);
  const t = (vi: string, en: string) => locale === 'vi' ? vi : en;
  useEffect(() => {
    const dialog = ref.current;
    const trigger = document.activeElement as HTMLElement | null;
    dialog?.showModal();
    return () => { dialog?.close(); trigger?.focus(); };
  }, []);
  return <dialog ref={ref} className="modal-dialog timeline-dialog" aria-labelledby="timeline-title" onCancel={onClose} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="modal-head"><h2 id="timeline-title">{t('Diễn biến xử lý', 'Event timeline')}</h2><button className="icon-button" aria-label={t('Đóng', 'Close')} onClick={onClose}><UiIcon name="close" /></button></div>
    <div className="modal-body">
      <p className="data-context">29/09/2026 (UTC+7)</p>
      <ol className="event-timeline">{incident.timeline.map(([time, vi, en]) => <li key={time}><time>{time}</time><span>{t(vi, en)}</span></li>)}
        {updated && <li><time>09:45</time><span>{t('Đường vòng vào Nậm Khắt bị chặn tại điểm vượt khe. Cần đánh giá lại phương án tiếp cận.', 'Mountain bypass to Nậm Khắt blocked at the gully crossing. Reassess access options.')}</span></li>}
      </ol>
    </div>
  </dialog>;
}
