import { UiIcon } from './UiIcon';
import React, { useEffect, useRef, useState } from 'react';
import type {
  FontChoice,
  IncidentModel,
  Locale,
  RoadSegment
} from '../../types/dear';
import type { IncidentPacket } from '../../data/incidentPacket';
import { NotificationPopover } from './NotificationPopover';
import { FontSelector } from './FontSelector';
import { IncidentContext } from './IncidentContext';
import { HeaderAccount } from './HeaderAccount';
import { useDismissiblePopover } from '../../shared/hooks/useDismissiblePopover';

type Props = {
  /** While GIS is open its draft owns the session; header actions would replace it unguarded. */
  locked?: boolean;
  identityName: string;
  onSignOut: () => void;
  onOpenReports: () => void;
  reportsPending: boolean;
  locale: Locale;
  incident: IncidentModel;
  areaName: [vi: string, en: string];
  report: IncidentPacket['report'];
  reportRoad?: RoadSegment;
  dataAvailable: boolean;
  theme: 'light' | 'dark';
  fontChoice: FontChoice;
  updated: boolean;
  reportApplied: boolean;
  alertRead: boolean;
  onToggleTheme: () => void;
  onToggleLocale: () => void;
  onChangeFontChoice: (font: FontChoice) => void;
  onOpenAlerts: () => void;
  onOpenIncident: () => void;
  onOpenData: () => void;
  onOpenHelp: () => void;
  onOpenUpload: () => void;
  onOpenTimeline: () => void;
  onOpenNotifications: () => void;
  onReset: () => void;
  activeModelName?: string;
};

export const AppHeader: React.FC<Props> = ({
  identityName,
  onSignOut,
  onOpenReports,
  reportsPending,
  locale,
  incident,
  areaName,
  report,
  reportRoad,
  dataAvailable,
  theme,
  fontChoice,
  updated,
  reportApplied,
  alertRead,
  onToggleTheme,
  onToggleLocale,
  onChangeFontChoice,
  onOpenAlerts,
  onOpenIncident,
  onOpenData,
  onOpenHelp,
  onOpenUpload,
  onOpenTimeline,
  onOpenNotifications,
  onReset,
  activeModelName,
  locked = false
}) => {
  const headerRef = useRef<HTMLElement>(null);
  useEffect(() => { if (headerRef.current) headerRef.current.inert = locked; }, [locked]);
  const [prefOpen, setPrefOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);
  useDismissiblePopover(notificationsRef, notificationsOpen, () =>
    setNotificationsOpen(false)
  );
  const prefRef = useRef<HTMLDivElement>(null);
  useDismissiblePopover(prefRef, prefOpen, () => setPrefOpen(false));

  const t = (vi: string, en: string) => (locale === 'en' ? en : vi);
  const snapshot = updated ? incident.asOfUpdated : incident.asOf;

  return (
    <header className="app-header" ref={headerRef}>
      <div className="brand">
        <span className="brand-symbol" aria-hidden="true">
          <svg viewBox="0 0 32 32" fill="none">
            <path
              d="M3 25 13 7l6 10 4-6 6 14H3Z"
              fill="currentColor"
              fillOpacity=".12"
            />
            <path
              d="m3 25 10-18 6 10 4-6 6 14M8 25l5-9 6 9M3 29h26"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span className="brand-word">DEAR</span>
      </div>

      <IncidentContext
        locale={locale}
        incident={incident}
        areaName={areaName}
        snapshot={snapshot}
        available={dataAvailable}
        onOpenTimeline={onOpenTimeline}
        onOpenData={onOpenData}
      />
      <div className="header-actions">
        <div className="notification-anchor" ref={notificationsRef}>
          <button
            className="icon-button notification-button"
            disabled={!dataAvailable}
            onClick={() => {
              setPrefOpen(false);
              setNotificationsOpen((open) => !open);
            }}
            aria-expanded={notificationsOpen}
            aria-controls="incident-notifications"
            aria-haspopup="dialog"
            title={t('Thông báo sự kiện', 'Incident notifications')}
            aria-label={t('Thông báo sự kiện', 'Incident notifications')}
          >
            <UiIcon name="bell" />
            {!alertRead && <span className="unread-indicator" />}
          </button>
          {notificationsOpen && (
            <NotificationPopover
              locale={locale}
              incident={incident}
              report={report}
              road={reportRoad}
              updated={reportApplied}
              onClose={() => setNotificationsOpen(false)}
              onOpenAll={() => {
                setNotificationsOpen(false);
                onOpenNotifications();
              }}
              onOpenIncident={() => {
                setNotificationsOpen(false);
                onOpenIncident();
              }}
              onOpenDetails={() => {
                notificationsRef.current
                  ?.querySelector<HTMLButtonElement>('button')
                  ?.focus();
                setNotificationsOpen(false);
                onOpenAlerts();
              }}
            />
          )}
        </div>

        <button
          className="button header-report-button"
          onClick={onOpenReports}
          title={t('Ghi nhận gửi đến', 'Incoming reports')}
          aria-label={t('Ghi nhận gửi đến', 'Incoming reports')}
        >
          <UiIcon name="image" />
          <span>{t('Ghi nhận', 'Reports')}</span>
          {reportsPending && <span className="unread-indicator" />}
        </button>
        <HeaderAccount
          locale={locale}
          identityName={identityName}
          onSwitchRole={onSignOut}
        />

        <button
          className="icon-button"
          title={t('Hướng dẫn sử dụng', 'User guide')}
          aria-label={t('Hướng dẫn sử dụng', 'User guide')}
          onClick={() => {
            setPrefOpen(false);
            setNotificationsOpen(false);
            onOpenHelp();
          }}
        >
          <UiIcon name="help" />
        </button>
        <div ref={prefRef} className="settings-anchor">
          <button
            className="icon-button"
            onClick={() => {
              setNotificationsOpen(false);
              setPrefOpen(!prefOpen);
            }}
            aria-label={t('Cài đặt hiển thị', 'Display settings')}
            aria-expanded={prefOpen}
            aria-haspopup="dialog"
            aria-controls="display-settings"
            title={t('Cài đặt hiển thị', 'Display settings')}
          >
            <UiIcon name="settings" />
          </button>

          {prefOpen && (
            <div
              className="settings-menu"
              id="display-settings"
              role="dialog"
              aria-labelledby="display-settings-title"
              data-popover
            >
              <div className="settings-heading">
                <h2 id="display-settings-title">
                  {t('Cài đặt hiển thị', 'Display settings')}
                </h2>
                <button
                  className="icon-button"
                  aria-label={t('Đóng cài đặt', 'Close settings')}
                  onClick={() => {
                    setPrefOpen(false);
                    prefRef.current
                      ?.querySelector<HTMLButtonElement>('button')
                      ?.focus();
                  }}
                >
                  <UiIcon name="close" />
                </button>
              </div>
              <div className="settings-group">
                <strong className="settings-label">
                  {t('Giao diện', 'Appearance')}
                </strong>
                <div
                  className="settings-options"
                  role="group"
                  aria-label={t('Giao diện', 'Appearance')}
                >
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
                <div
                  className="settings-options"
                  role="group"
                  aria-label={t('Ngôn ngữ', 'Language')}
                >
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
              <div className="settings-group settings-typeface">
                <FontSelector
                  locale={locale}
                  value={fontChoice}
                  onChange={onChangeFontChoice}
                />
              </div>
              <details className="settings-workspace">
                <summary>{t('Phiên làm việc', 'Workspace session')}</summary>
                <div className="settings-workspace-actions">
                  <button
                    className="settings-link"
                    onClick={() => {
                      setPrefOpen(false);
                      onOpenUpload();
                    }}
                  >
                    {t('Mô hình địa hình', 'Terrain model')}
                  </button>
                  <button
                    className="settings-link"
                    onClick={() => {
                      setPrefOpen(false);
                      onReset();
                    }}
                  >
                    {t('Đặt lại phiên làm việc', 'Reset workspace')}
                  </button>
                  {activeModelName && <small>{activeModelName}</small>}
                </div>
              </details>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
