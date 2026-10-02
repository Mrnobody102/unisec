import React, { useEffect, useRef, useState } from 'react';
import type { FontChoice, IncidentModel, Locale } from '../../types/dear';
import type { IncidentPacket } from '../../data/incidentPacket';
import { NotificationPopover } from './NotificationPopover';
import { useDismissiblePopover } from '../../shared/hooks/useDismissiblePopover';

type Props = {
  locale: Locale;
  incident: IncidentModel;
  report: IncidentPacket['report'];
  dataAvailable: boolean;
  theme: 'light' | 'dark';
  fontChoice: FontChoice;
  updated: boolean;
  alertRead: boolean;
  onToggleTheme: () => void;
  onToggleLocale: () => void;
  onChangeFontChoice: (font: FontChoice) => void;
  onOpenAlerts: () => void;
  onOpenIncident: () => void;
  onOpenData: () => void;
  onOpenUpload: () => void;
  activeModelName?: string;
};

export const AppHeader: React.FC<Props> = ({
  locale,
  incident,
  report,
  dataAvailable,
  theme,
  fontChoice,
  updated,
  alertRead,
  onToggleTheme,
  onToggleLocale,
  onChangeFontChoice,
  onOpenAlerts,
  onOpenIncident,
  onOpenData,
  onOpenUpload,
  activeModelName
}) => {
  const [prefOpen, setPrefOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);
  useDismissiblePopover(notificationsRef, notificationsOpen, () => setNotificationsOpen(false));
  const prefRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!prefOpen) return;
    const closeOutside = (event: PointerEvent) => {
      if (!prefRef.current?.contains(event.target as Node)) setPrefOpen(false);
    };
    const closeEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setPrefOpen(false); prefRef.current?.querySelector('button')?.focus(); }
    };
    document.addEventListener('pointerdown', closeOutside, true);
    document.addEventListener('keydown', closeEscape);
    return () => { document.removeEventListener('pointerdown', closeOutside, true); document.removeEventListener('keydown', closeEscape); };
  }, [prefOpen]);

  const t = (vi: string, en: string) => (locale === 'en' ? en : vi);
  const snapshot = updated ? incident.asOfUpdated : incident.asOf;

  return (
    <header className="app-header">
      <div className="brand">
        <span className="brand-symbol"><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="m3 8 9-5 9 5-9 5-9-5Zm0 5 9 5 9-5M3 18l9 5 9-5"/></svg></span>
        <span className="brand-word">DEAR</span>
      </div>

      <div className="incident-badge-group">
        <strong>{t('Bản đồ ứng phó', 'Response map')}</strong>
        <div className="incident-meta">
          <span>{t('Thung lũng Nậm Kha (Chế Tạo)', 'Nậm Kha Valley (Chế Tạo)')}</span>
        </div>
      </div>

      <div className="header-actions">
        <div className="header-data">
          <span className="update-label">
            {t('Dữ liệu đến', 'Data as of')}{' '}
            {dataAvailable && <strong><time dateTime={snapshot}>
              {new Date(snapshot).toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-GB', { timeZone: 'Asia/Bangkok', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </time></strong>}
          </span>
        </div>

        <div className="notification-anchor" ref={notificationsRef}>
        <button
          className="icon-button notification-button"
          disabled={!dataAvailable}
          onClick={() => { setPrefOpen(false); setNotificationsOpen(open => !open); }}
          aria-expanded={notificationsOpen}
          aria-controls="incident-notifications"
          aria-haspopup="dialog"
          title={t('Thông báo sự kiện', 'Incident notifications')}
          aria-label={t('Thông báo sự kiện', 'Incident notifications')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z" />
            <path d="M10 21h4" />
          </svg>
          {!alertRead && <span className="unread-indicator" />}
        </button>
        {notificationsOpen && <NotificationPopover locale={locale} incident={incident} report={report} updated={updated} onOpenIncident={() => { setNotificationsOpen(false); onOpenIncident(); }} onOpenDetails={() => { notificationsRef.current?.querySelector<HTMLButtonElement>('button')?.focus(); setNotificationsOpen(false); onOpenAlerts(); }} />}
        </div>

        <button
          className="button header-data-button"
          disabled={!dataAvailable}
          onClick={onOpenData}
          title={t('Thông tin dữ liệu', 'Data information')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4M12 8h.01" />
          </svg>
          <span>{t('Dữ liệu', 'Data')}</span>
        </button>

        <span className="header-divider" aria-hidden="true" />

        <div ref={prefRef} className="settings-anchor">
          <button
            className="icon-button"
            onClick={() => { setNotificationsOpen(false); setPrefOpen(!prefOpen); }}
            aria-label={t('Cài đặt hiển thị', 'Display settings')}
            aria-expanded={prefOpen}
            title={t('Cài đặt hiển thị', 'Display settings')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>

          {prefOpen && (
            <div className="settings-menu" aria-label={t('Tùy chọn hiển thị', 'Display options')}>
              <div className="settings-group">
                <strong className="settings-label">
                  {t('Giao diện', 'Appearance')}
                </strong>
                <div className="settings-options">
                  <button
                    className="settings-option"
                    aria-pressed={theme === 'light'}
                    onClick={() => {
                      if (theme !== 'light') onToggleTheme();
                    }}
                  >
                    {t('Sáng', 'Light')}
                  </button>
                  <button
                    className="settings-option"
                    aria-pressed={theme === 'dark'}
                    onClick={() => {
                      if (theme !== 'dark') onToggleTheme();
                    }}
                  >
                    {t('Tối', 'Dark')}
                  </button>
                </div>
              </div>

              <div className="settings-group">
                <strong className="settings-label">
                  {t('Ngôn ngữ', 'Language')}
                </strong>
                <div className="settings-options">
                  <button
                    className="settings-option"
                    aria-pressed={locale === 'vi'}
                    onClick={() => {
                      if (locale !== 'vi') onToggleLocale();
                    }}
                  >
                    Tiếng Việt
                  </button>
                  <button
                    className="settings-option"
                    aria-pressed={locale === 'en'}
                    onClick={() => {
                      if (locale !== 'en') onToggleLocale();
                    }}
                  >
                    English
                  </button>
                </div>
              </div>
              <div className="settings-group">
                <strong className="settings-label">{t('Kiểu chữ', 'Typography')}</strong>
                <div className="font-options" role="group" aria-label={t('Kiểu chữ', 'Typography')}>
                  <button className="font-option" aria-pressed={fontChoice === 'classic'} onClick={() => onChangeFontChoice('classic')}>
                    <span className="font-sample font-sample-classic" aria-hidden="true">Aa</span>
                    <span className="font-option-copy"><strong>Inter</strong></span>
                  </button>
                  <button className="font-option" aria-pressed={fontChoice === 'plex'} onClick={() => onChangeFontChoice('plex')}>
                    <span className="font-sample font-sample-plex" aria-hidden="true">Aa</span>
                    <span className="font-option-copy"><strong>IBM Plex Sans</strong></span>
                  </button>
                  <button className="font-option" aria-pressed={fontChoice === 'modern'} onClick={() => onChangeFontChoice('modern')}>
                    <span className="font-sample font-sample-modern" aria-hidden="true">Aa</span>
                    <span className="font-option-copy"><strong>Space Grotesk</strong><small>Be Vietnam Pro</small></span>
                  </button>
                </div>
              </div>
              <div className="model-settings">
                <button className="settings-link" onClick={() => { setPrefOpen(false); onOpenUpload(); }}>{t('Mô hình địa hình', 'Terrain model')}</button>
                {activeModelName && <small>{activeModelName}</small>}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
