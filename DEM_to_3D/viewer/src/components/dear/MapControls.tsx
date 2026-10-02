import type { Hazard, Locale } from '../../types/dear';
import { useState } from 'react';
import { UiIcon } from './UiIcon';
import { roadColors } from '../../terrain/roadStyle';
import { MapSymbol } from '../../shared/ui/MapSymbol';
import type { MapSymbolName } from '../../terrain/mapSymbols';

const swatchColors: Record<string, string> = { selected: roadColors.selected, blocked: roadColors.blocked, uncertain: roadColors.uncertain };

type Props = {
  locale: Locale; mapMode: '3d' | '2d';
  onToggleMapMode: () => void; onZoomIn: () => void; onZoomOut: () => void;
  onResetView: () => void; onOpenLayers: () => void;
  layersOpen: boolean; layers: Record<string, boolean>; hasSelectedRoute: boolean; hasSelectedRoad: boolean; hazards: Hazard[];
};

export function MapControls({ locale, mapMode, onToggleMapMode, onZoomIn, onZoomOut, onResetView, onOpenLayers, layersOpen, layers, hasSelectedRoute, hasSelectedRoad, hazards }: Props): JSX.Element {
  const [legendExpanded, setLegendExpanded] = useState(false);
  const t = (vi: string, en: string) => locale === 'en' ? en : vi;
  const routeVisible = hasSelectedRoute && layers.route;
  const legend: Array<{ kind: string; label: string; symbol?: MapSymbolName }> = [];
  if (layers.roads) legend.push({ kind: 'network', label: t('Chưa ghi nhận chặn', 'No blockage reported') });
  if ((layers.roads || routeVisible) && layers.status) legend.push({ kind: 'blocked', label: t('Đường bị chặn', 'Blocked road') }, { kind: 'uncertain', label: t('Đường cần xác minh', 'Road to verify') });
  if (routeVisible || (hasSelectedRoad && layers.roads)) legend.push({ kind: 'selected', label: routeVisible ? t('Tuyến đang xem', 'Selected route') : t('Đoạn đang chọn', 'Selected segment') });
  if (layers.communities) legend.push({ kind: 'community', symbol: 'community', label: t('Cộng đồng', 'Community') }, { kind: 'priority', symbol: 'community', label: t('Ưu tiên cứu hộ', 'Rescue priority') });
  if (layers.landslide && hazards.some(h => h.kind === 'landslide' && h.observation === 'reported')) legend.push({ kind: 'landslide', symbol: 'landslide', label: t('Điểm sạt lở', 'Reported landslide') });
  if (layers.landslide && hazards.some(h => h.kind === 'landslide' && h.observation === 'suspected')) legend.push({ kind: 'suspected', symbol: 'landslide', label: t('Nghi sạt lở', 'Suspected landslide') });
  if (layers.status && hazards.some(h => h.kind === 'bridge')) legend.push({ kind: 'bridge', symbol: 'bridge', label: t('Cầu cần xác minh', 'Bridge to verify') });
  if (layers.status && hazards.some(h => h.kind === 'crossing')) legend.push({ kind: 'crossing', symbol: 'crossing', label: t('Điểm vượt khe', 'Gully crossing') });
  if (layers.flood && hazards.some(h => h.kind === 'flood')) legend.push({ kind: 'flood', symbol: 'flood', label: t('Điểm nghi ngập', 'Possible flood site') });
  if (layers.staging) legend.push({ kind: 'staging', symbol: 'staging', label: t('Điểm tập kết', 'Staging point') });
  const visibleLegend = legendExpanded ? legend : legend.filter(item => ['blocked', 'uncertain', 'selected', 'priority', 'landslide', 'suspected'].includes(item.kind));

  return <>
    <button className="button map-layer-trigger map-layer-launcher" data-map-layers-trigger aria-expanded={layersOpen} aria-controls="map-layers-panel" onClick={onOpenLayers}>
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M12 3 3 8l9 5 9-5-9-5ZM3 12l9 5 9-5M3 16l9 5 9-5"/></svg>
      {t('Lớp bản đồ', 'Layers')}
    </button>
    <div className="map-tools" aria-label={t('Điều khiển bản đồ', 'Map controls')}>
      <button className="icon-button map-mode" onClick={onToggleMapMode} aria-label={t('Chuyển sang ' + (mapMode === '2d' ? '3D' : '2D'), 'Switch to ' + (mapMode === '2d' ? '3D' : '2D'))} title={mapMode === '3d' ? t('Ctrl + kéo để nghiêng và xoay', 'Ctrl + drag to tilt and rotate') : t('Chuyển sang góc nhìn 3D', 'Switch to 3D view')}>{mapMode === '2d' ? '3D' : '2D'}</button>
      <div className="map-zoom">
        <button className="icon-button" onClick={onZoomIn} aria-label={t('Phóng to', 'Zoom in')} title={t('Phóng to', 'Zoom in')}><UiIcon name="plus" /></button>
        <button className="icon-button" onClick={onZoomOut} aria-label={t('Thu nhỏ', 'Zoom out')} title={t('Thu nhỏ', 'Zoom out')}><UiIcon name="minus" /></button>
      </div>
      <button className="icon-button" onClick={onResetView} aria-label={t('Xem toàn khu vực', 'Fit area')} title={t('Xem toàn khu vực', 'Fit area')}>
        <UiIcon name="fit" />
      </button>
      <details className="map-help"><summary aria-label={t('Thao tác bản đồ', 'Map gestures')}><UiIcon name="help" /></summary><div><strong>{t('Thao tác bản đồ', 'Map gestures')}</strong><dl><dt>{t('Di chuyển', 'Pan')}</dt><dd>{t('Kéo chuột trái', 'Left-drag')}</dd><dt>{t('Phóng to / thu nhỏ', 'Zoom')}</dt><dd>{t('Cuộn chuột', 'Mouse wheel')}</dd><dt>{t('Nghiêng và xoay 3D', 'Tilt and rotate in 3D')}</dt><dd>{t('Ctrl + kéo hoặc kéo chuột phải', 'Ctrl + drag or right-drag')}</dd></dl></div></details>
    </div>
    <div className="map-bottom-bar" hidden={layersOpen} data-expanded={legendExpanded}>
      <div className="map-legend-heading">
        {legend.length > 0 && <button className="text-button legend-toggle" aria-expanded={legendExpanded} aria-controls="map-legend-items" onClick={() => { if (layersOpen) onOpenLayers(); setLegendExpanded(expanded => !expanded); }}>{t('Chú giải', 'Legend')}<UiIcon name={legendExpanded ? 'collapse' : 'expand'} size={14}/></button>}
      </div>
      {!layersOpen && visibleLegend.length > 0 && <div className="map-legend" id="map-legend-items" aria-label={t('Chú giải', 'Legend')}>
        {visibleLegend.map(({ kind, label, symbol }) => <span className="legend-item" key={kind}>
          {symbol ? <i className={'legend-symbol ' + kind}><MapSymbol name={symbol} size={15} /></i> : <i className={'line ' + kind} style={{ borderColor: kind === 'network' ? (layers.imagery ? roadColors.networkImagery : roadColors.networkTerrain) : swatchColors[kind] }} aria-hidden="true"/>}{label}
        </span>)}
      </div>}
    </div>
  </>;
}
