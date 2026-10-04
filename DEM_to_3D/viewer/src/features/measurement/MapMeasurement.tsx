import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import * as L from 'leaflet';
import type { Locale } from '../../types/dear';
import { UiIcon } from '../../shared/ui/UiIcon';
import { horizontalArea, horizontalLength, measurementPoint, type MeasureMode, type MeasurePoint } from './measurement';
import './measurement.css';

export function MapMeasurement({ mapRef, enabled, locale, onClose }: {
  mapRef: MutableRefObject<L.Map | null>; enabled: boolean; locale: Locale; onClose: () => void;
}): JSX.Element | null {
  const [mode, setMode] = useState<MeasureMode>('distance');
  const [points, setPoints] = useState<MeasurePoint[]>([]);
  const [finished, setFinished] = useState(false);
  const [outside, setOutside] = useState(false);
  const current = useRef({ points, finished, mode, onClose }); current.current = { points, finished, mode, onClose };
  const drawing = useRef<L.LayerGroup | null>(null);
  const t = (vi: string, en: string) => locale === 'vi' ? vi : en;
  const clear = () => { setPoints([]); setFinished(false); setOutside(false); };
  useEffect(() => {
    const map = mapRef.current;
    if (!enabled || !map) return;
    clear();
    drawing.current = L.layerGroup().addTo(map);
    const doubleZoom = map.doubleClickZoom.enabled(); map.doubleClickZoom.disable();
    const click = (event: L.LeafletMouseEvent) => {
      if (current.current.finished) return;
      const point = measurementPoint(event.latlng.lat, event.latlng.lng);
      setOutside(!point); if (!point) return;
      setPoints(previous => previous.length && Math.hypot(previous[previous.length - 1].x - point.x, previous[previous.length - 1].y - point.y) < 0.1 ? previous : [...previous, point]);
    };
    const finish = () => {
      const { points, mode } = current.current;
      if (points.length >= (mode === 'area' ? 3 : 2) && (mode !== 'area' || horizontalArea(points) !== null)) setFinished(true);
    };
    const keyboard = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (event.defaultPrevented || target?.closest('[data-popover],.settings-anchor,.map-help,.map-source-popover,.modal-overlay')) return;
      if (target !== document.body && !target?.closest('.map-area')) return;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (event.key === 'Escape') { event.preventDefault(); current.current.onClose(); }
      if (event.key === 'Backspace') { event.preventDefault(); setPoints(previous => previous.slice(0, -1)); setFinished(false); }
    };
    map.on('click', click); map.on('dblclick', finish); document.addEventListener('keydown', keyboard);
    return () => {
      map.off('click', click); map.off('dblclick', finish); document.removeEventListener('keydown', keyboard);
      drawing.current?.remove(); drawing.current = null;
      if (doubleZoom) map.doubleClickZoom.enable();
    };
  }, [enabled, mapRef]);
  useEffect(() => {
    const layer = drawing.current;
    if (!enabled || !layer) return;
    layer.clearLayers();
    const latlngs = points.map(point => L.latLng(point.lat, point.lng));
    const style = { color: '#0c7560', weight: 2, interactive: false, dashArray: finished ? undefined : '5 4' };
    if (mode === 'area' && points.length >= 3) L.polygon(latlngs, { ...style, fillOpacity: 0.12 }).addTo(layer);
    else if (points.length >= 2) L.polyline(latlngs, style).addTo(layer);
    points.forEach(point => L.circleMarker([point.lat, point.lng], { radius: 4, color: 'white', weight: 2, fillColor: '#0c7560', fillOpacity: 1, interactive: false }).addTo(layer));
  }, [enabled, points, mode, finished]);
  if (!enabled) return null;
  const length = horizontalLength(points, mode === 'area' && points.length >= 3);
  const area = horizontalArea(points);
  const numeric = (value: number, decimals: number) => value.toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-GB', { maximumFractionDigits: decimals });
  const distance = length >= 1000 ? `${numeric(length / 1000, 2)} km` : `${numeric(length, 0)} m`;
  const areaText = area === null ? null : area >= 1000000 ? `${numeric(area / 1000000, 2)} km²` : area >= 10000 ? `${numeric(area / 10000, 2)} ha` : `${numeric(area, 0)} m²`;
  return <section className="map-measure-panel" aria-label={t('Đo bản đồ', 'Map measurement')}>
    <div className="map-measure-heading"><strong>{t('Đo bản đồ', 'Map measurement')}</strong><button className="icon-button" aria-label={t('Đóng công cụ đo', 'Close measurement')} onClick={onClose}><UiIcon name="close"/></button></div>
    <div className="map-measure-modes" role="group" aria-label={t('Kiểu đo', 'Measurement type')}>
      <button aria-pressed={mode === 'distance'} onClick={() => { setMode('distance'); clear(); }}><UiIcon name="ruler"/>{t('Khoảng cách', 'Distance')}</button>
      <button aria-pressed={mode === 'area'} onClick={() => { setMode('area'); clear(); }}><UiIcon name="area"/>{t('Diện tích', 'Area')}</button>
    </div>
    {points.length > 0 && <dl className="map-measure-result" aria-live="polite">
      <div><dt>{mode === 'area' ? t('Diện tích', 'Area') : t('Chiều dài', 'Length')}</dt><dd>{mode === 'area' ? areaText ?? t('Chưa khép vùng', 'Incomplete area') : distance}</dd></div>
      {mode === 'area' && points.length >= 3 && <div><dt>{t('Chu vi', 'Perimeter')}</dt><dd>{distance}</dd></div>}
    </dl>}
    <p className="map-measure-hint">{outside ? t('Chọn điểm trong múi UTM 48N (102°–108° Đông).', 'Choose points in UTM zone 48N (102°–108° East).')
      : mode === 'area' && points.length >= 3 && area === null ? t('Vùng không hợp lệ. Kiểm tra các cạnh giao nhau.', 'Invalid area. Check intersecting edges.')
      : finished ? t('Đã đo. Chọn Đo lại để bắt đầu vùng khác.', 'Complete. Select Clear to start another measurement.')
      : t(mode === 'area' ? 'Chọn ít nhất 3 điểm trên bản đồ, rồi Kết thúc.' : 'Chọn các điểm trên bản đồ, rồi Kết thúc.', mode === 'area' ? 'Select at least 3 points, then Finish.' : 'Select points on the map, then Finish.')}</p>
    <div className="map-measure-actions">
      <button className="icon-button" title={t('Bỏ điểm cuối', 'Undo last point')} aria-label={t('Bỏ điểm cuối', 'Undo last point')} disabled={!points.length} onClick={() => { setPoints(previous => previous.slice(0, -1)); setFinished(false); }}><UiIcon name="undo"/></button>
      <button className="text-button" disabled={!points.length} onClick={clear}>{t('Đo lại', 'Clear')}</button>
      <button className="button primary" disabled={finished || points.length < (mode === 'area' ? 3 : 2) || (mode === 'area' && area === null)} onClick={() => setFinished(true)}>{t('Kết thúc', 'Finish')}</button>
    </div>
    <small><span>{t('Mặt phẳng ngang', 'Horizontal grid')}</span><span>EPSG:32648</span></small>
  </section>;
}
