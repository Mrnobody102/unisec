import React from 'react';
import type { Locale } from '../../types/dear';

type Props = {
  locale: Locale;
  mapMode: '3d' | '2d';
  onToggleMapMode: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  onOpenLayers: () => void;
  hasSelectedRoute: boolean;
};

export const MapControls: React.FC<Props> = ({
  locale,
  mapMode,
  onToggleMapMode,
  onZoomIn,
  onZoomOut,
  onResetView,
  onOpenLayers,
  hasSelectedRoute
}) => {
  const t = (vi: string, en: string) => (locale === 'en' ? en : vi);

  return (
    <>
      <div className="map-tools">
        <button
          className="icon-button"
          onClick={onToggleMapMode}
          title={t('Chuyển đổi góc nhìn 2D / 3D', 'Switch 2D / 3D view')}
          aria-pressed={mapMode === '3d'}
          style={{ fontWeight: 700, fontSize: '13px' }}
        >
          {mapMode === '3d' ? '3D' : '2D'}
        </button>

        <button
          className="icon-button"
          onClick={onZoomIn}
          title={t('Phóng to', 'Zoom in')}
          style={{ fontSize: '18px' }}
        >
          +
        </button>

        <button
          className="icon-button"
          onClick={onZoomOut}
          title={t('Thu nhỏ', 'Zoom out')}
          style={{ fontSize: '18px' }}
        >
          −
        </button>

        <button
          className="icon-button"
          onClick={onResetView}
          title={t('Xem toàn khu vực', 'Fit area')}
          style={{ fontSize: '16px' }}
        >
          ⌖
        </button>
      </div>

      <div className="map-bottom-bar">
        <div className="map-actions">
          <button className="button" onClick={onOpenLayers}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
            <span>{t('Lớp bản đồ', 'Map Layers')}</span>
          </button>
        </div>

        <div className="map-legend">
          <span className="legend-item">
            <i className="line" />
            <span>{t('Mạng đường', 'Road network')}</span>
          </span>
          <span className="legend-item">
            <i className="line blocked" />
            <span>{t('Bị chặn', 'Blocked')}</span>
          </span>
          <span className="legend-item">
            <i className="line uncertain" />
            <span>{t('Chưa rõ', 'Uncertain')}</span>
          </span>
          {hasSelectedRoute && (
            <span className="legend-item">
              <i className="line selected" />
              <span>{t('Tuyến đang xem', 'Selected route')}</span>
            </span>
          )}
          <span className="legend-item">
            <i className="line hazard" />
            <span>{t('Sạt lở', 'Landslide')}</span>
          </span>
        </div>
      </div>
    </>
  );
};
