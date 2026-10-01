import React, { useState } from 'react';
import type { Locale } from '../../types/dear';

type Props = {
  locale: Locale;
  theme: 'light' | 'dark';
  updated: boolean;
  alertRead: boolean;
  onToggleTheme: () => void;
  onToggleLocale: () => void;
  onOpenAlerts: () => void;
  onOpenData: () => void;
  onOpenUpload: () => void;
  activeModelName?: string;
};

export const AppHeader: React.FC<Props> = ({
  locale,
  theme,
  updated,
  alertRead,
  onToggleTheme,
  onToggleLocale,
  onOpenAlerts,
  onOpenData,
  onOpenUpload,
  activeModelName
}) => {
  const [prefOpen, setPrefOpen] = useState(false);

  const t = (vi: string, en: string) => (locale === 'en' ? en : vi);

  return (
    <header className="app-header">
      <div className="brand">
        <span className="brand-symbol">D</span>
        <span className="brand-word">DEAR</span>
      </div>

      <div className="incident-badge-group">
        <strong>{t('Bản đồ ứng phó thiên tai 3D', '3D Disaster Response Map')}</strong>
        <div className="incident-meta">
          <span>{t('Thung lũng Nậm Kha (Chế Tạo)', 'Nậm Kha Valley (Chế Tạo)')}</span>
          <time dateTime="2026-09-29">29/09/2026</time>
          {activeModelName && (
            <span className="small" style={{ color: 'var(--select-ink)' }}>
              · {activeModelName}
            </span>
          )}
        </div>
      </div>

      <div className="header-actions">
        <div className="header-data">
          <span className="update-label">
            {t('Cập nhật lúc', 'Updated at')} <strong>{updated ? '09:45' : '09:31'}</strong>
          </span>
          <span className="demo-badge">{t('Kịch bản SIC 2026', 'SIC 2026 Scenario')}</span>
        </div>

        <button
          className="icon-button notification-button"
          onClick={onOpenAlerts}
          title={t('Thông báo sự kiện', 'Incident notifications')}
          aria-label={t('Thông báo sự kiện', 'Incident notifications')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z" />
            <path d="M10 21h4" />
          </svg>
          {!alertRead && <span className="unread-indicator" />}
        </button>

        <button
          className="button"
          onClick={onOpenData}
          title={t('Thông tin dữ liệu', 'Data information')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4M12 8h.01" />
          </svg>
          <span>{t('Dữ liệu', 'Data')}</span>
        </button>

        <button
          className="button soft"
          onClick={onOpenUpload}
          title={t('Tải thêm hoặc ghép model 3D', 'Upload or merge 3D models')}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
          </svg>
          <span>{t('Mô hình 3D', '3D Models')}</span>
        </button>

        <span className="header-divider" aria-hidden="true" />

        <div style={{ position: 'relative' }}>
          <button
            className="icon-button"
            onClick={() => setPrefOpen(!prefOpen)}
            aria-label={t('Cài đặt hiển thị', 'Display settings')}
            title={t('Cài đặt hiển thị', 'Display settings')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>

          {prefOpen && (
            <div
              style={{
                position: 'absolute',
                top: '46px',
                right: 0,
                width: '210px',
                background: 'var(--ws-surface)',
                border: '1px solid var(--ws-line)',
                borderRadius: '10px',
                padding: '14px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                zIndex: 50,
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
            >
              <div>
                <strong style={{ fontSize: '12px', color: 'var(--ws-muted)' }}>
                  {t('Giao diện', 'Theme')}
                </strong>
                <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                  <button
                    className="button"
                    style={{ flex: 1, padding: '4px' }}
                    aria-pressed={theme === 'light'}
                    onClick={() => {
                      if (theme !== 'light') onToggleTheme();
                    }}
                  >
                    {t('Sáng', 'Light')}
                  </button>
                  <button
                    className="button"
                    style={{ flex: 1, padding: '4px' }}
                    aria-pressed={theme === 'dark'}
                    onClick={() => {
                      if (theme !== 'dark') onToggleTheme();
                    }}
                  >
                    {t('Tối', 'Dark')}
                  </button>
                </div>
              </div>

              <div>
                <strong style={{ fontSize: '12px', color: 'var(--ws-muted)' }}>
                  {t('Ngôn ngữ', 'Language')}
                </strong>
                <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                  <button
                    className="button"
                    style={{ flex: 1, padding: '4px' }}
                    aria-pressed={locale === 'vi'}
                    onClick={() => {
                      if (locale !== 'vi') onToggleLocale();
                    }}
                  >
                    Tiếng Việt
                  </button>
                  <button
                    className="button"
                    style={{ flex: 1, padding: '4px' }}
                    aria-pressed={locale === 'en'}
                    onClick={() => {
                      if (locale !== 'en') onToggleLocale();
                    }}
                  >
                    English
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
