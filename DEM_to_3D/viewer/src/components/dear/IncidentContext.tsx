import { useId, useRef, useState } from 'react';
import type { IncidentModel, Locale } from '../../types/dear';
import { useDismissiblePopover } from '../../shared/hooks/useDismissiblePopover';
import { UiIcon } from './UiIcon';

type Props = {
  locale: Locale;
  incident: IncidentModel;
  areaName: [string, string];
  snapshot: string;
  snapshotDisplay?: 'full' | 'date';
  available: boolean;
  onOpenTimeline: () => void;
  onOpenData: () => void;
};

/** One place for the active area, data revision and its supporting context. */
export function IncidentContext({
  locale,
  incident,
  areaName,
  snapshot,
  snapshotDisplay = 'full',
  available,
  onOpenTimeline,
  onOpenData
}: Props): JSX.Element {
  const t = (vi: string, en: string) => (locale === 'vi' ? vi : en);
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const id = useId();
  useDismissiblePopover(root, open, () => setOpen(false));
  const date = new Date(snapshot);
  const time = date.toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-GB', {
    timeZone: 'Asia/Bangkok',
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  const run = (action: () => void) => {
    root.current?.querySelector<HTMLButtonElement>('[aria-expanded]')?.focus();
    setOpen(false);
    action();
  };
  return (
    <div className="incident-context incident-badge-group" ref={root}>
      <button
        type="button"
        className="incident-context-trigger"
        aria-label={t('Sự kiện đang xem', 'Current incident')}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={id}
        title={t(...areaName)}
        onClick={() => setOpen(!open)}
      >
        <span className="incident-context-copy">
          <strong>{t(...areaName)}</strong>
          <span className="incident-context-revision">
            {available ? (
              <>
                {snapshotDisplay === 'full' && t('Dữ liệu đến ', 'Data as of ')}
                <time dateTime={snapshot}>{snapshotDisplay === 'full' ? time : date.toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-GB', { timeZone: 'Asia/Bangkok', day: '2-digit', month: '2-digit', year: 'numeric' })}</time>
              </>
            ) : (
              t('Chưa tải dữ liệu', 'Data not loaded')
            )}
          </span>
        </span>
        <span className="incident-context-chevron" aria-hidden="true">
          <UiIcon name="next" size={14} />
        </span>
      </button>
      {open && (
        <section
          className="header-context-popover"
          id={id}
          role="dialog"
          aria-label={t('Sự kiện đang xem', 'Current incident')}
          data-popover
        >
          <header>
            <strong>
              {incident.title
                ? t(...incident.title)
                : t('Cứu trợ', 'Relief')}
            </strong>
            <button
              className="icon-button"
              aria-label={t(
                'Đóng thông tin sự kiện',
                'Close incident information'
              )}
              onClick={() => setOpen(false)}
            >
              <UiIcon name="close" />
            </button>
          </header>
          <p>{t(...areaName)}</p>
          <dl>
            <div>
              <dt>{t('Mã sự kiện', 'Incident ID')}</dt>
              <dd>{incident.id}</dd>
            </div>
            <div>
              <dt>{t('Dữ liệu đến', 'Data as of')}</dt>
              <dd>
                <time dateTime={snapshot}>{time}</time> UTC+7
              </dd>
            </div>
          </dl>
          <div className="header-context-links">
            <button
              disabled={!available}
              onClick={() => run(onOpenTimeline)}
            >
              <UiIcon name="history" />
              <span>{t('Nhật ký sự kiện', 'Incident journal')}</span>
              <UiIcon name="next" size={14} />
            </button>
            <button
              disabled={!available}
              onClick={() => run(onOpenData)}
            >
              <UiIcon name="info" />
              <span>{t('Nguồn dữ liệu', 'Data sources')}</span>
              <UiIcon name="next" size={14} />
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
