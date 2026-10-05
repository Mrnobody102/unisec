import { useEffect, useRef, useState, type Dispatch, type MutableRefObject } from 'react';
import type * as L from 'leaflet';
import type { Locale } from '../../types/dear';
import { UiIcon } from '../../shared/ui/UiIcon';
import { canFinish, horizontalLength, measurementPreviewPoints, minimumPoints, type MeasureMode } from './measurement';
import type { MeasureAction, MeasurementSession } from './measurementSession';
import { defaultMeasureUnits, formatDistance, measurementResults, modeNames, type MeasureUnits } from './measurementResults';
import type { MeasureGeometry } from './measurementGeometry';
import { useMeasurementMap } from './useMeasurementMap';
import { useFloatingPanel } from '../../shared/hooks/useFloatingPanel';
import './measurement.css';

export function MapMeasurement({ mapRef, enabled, locale, session, dispatch, sources, selected, onClose }: {
  mapRef: MutableRefObject<L.Map | null>; enabled: boolean; locale: Locale; onClose: () => void;
  session: MeasurementSession; dispatch: Dispatch<MeasureAction>; sources: MeasureGeometry[]; selected?: MeasureGeometry;
}): JSX.Element | null {
  const [collapsed, setCollapsed] = useState(false), [snap, setSnap] = useState(true), [labels, setLabels] = useState(true);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [units, setUnits] = useState(defaultMeasureUnits), [copyState, setCopyState] = useState<'ready' | 'copied' | 'error'>('ready');
  const root = useRef<HTMLElement>(null);
  const floating = useFloatingPanel(root, 'measure', enabled);
  const t = (vi: string, en: string) => locale === 'vi' ? vi : en;
  const { hover, outside } = useMeasurementMap({ mapRef, enabled, session, dispatch, sources, snap, labels, units, locale, onClose });
  useEffect(() => { if (!enabled) dispatch({ type: 'cancel' }); }, [enabled, dispatch]);
  useEffect(() => { setCopyState('ready'); }, [session, units, locale]);
  const displayPoints = !session.finished ? measurementPreviewPoints(session.mode, session.points, hover?.point) : session.points;
  const results = measurementResults(session.mode, displayPoints, units, locale);
  const finalResults = measurementResults(session.mode, session.points, units, locale);
  const canComplete = canFinish(session.mode, session.points);
  const changeUnit = (key: keyof MeasureUnits, value: string) => setUnits(current => ({ ...current, [key]: value }));
  const copy = async () => {
    const report = [t(...modeNames[session.mode]), ...finalResults.map(([label, value]) => `${label}: ${value}`),
      ...(session.source ? [t('Nguồn hình học: ', 'Geometry source: ') + session.source] : []),
      'EPSG:32648 (UTM 48N), WGS84',
      ...session.points.map((point, i) => `${i + 1}: ${point.lat.toFixed(6)}, ${point.lng.toFixed(6)} | E ${point.x.toFixed(1)} m, N ${point.y.toFixed(1)} m`)].join('\n');
    try { await navigator.clipboard.writeText(report); setCopyState('copied'); } catch { setCopyState('error'); }
  };
  if (!enabled) return null;
  const hint = outside ? t('Điểm nằm ngoài phạm vi đo UTM 48N.', 'Point is outside the UTM 48N measurement area.')
    : session.finished ? t('Kéo điểm để chỉnh.', 'Drag points to edit.')
    : session.mode === 'area' && session.points.length >= 3 && !canComplete ? t('Các cạnh giao nhau hoặc vùng không có diện tích.', 'Edges intersect or the area is degenerate.')
    : session.mode === 'radius' && session.points.length === 2 && !canComplete ? t('Đường tròn vượt phạm vi đo UTM 48N.', 'The circle exceeds the UTM 48N measurement area.')
    : session.mode === 'location' ? t('Chọn vị trí trên bản đồ.', 'Select a position on the map.')
    : session.mode === 'angle' ? t('Chọn 3 điểm. Điểm 2 là đỉnh góc.', 'Select 3 points. Point 2 is the angle vertex.')
    : session.mode === 'radius' ? t('Chọn tâm rồi một điểm trên đường tròn.', 'Select the centre, then a point on the circle.')
    : session.mode === 'bearing' ? t('Chọn điểm đầu và điểm hướng tới.', 'Select the origin and destination.')
    : session.points.length < minimumPoints(session.mode) ? t(session.mode === 'area' ? 'Chọn ít nhất 3 điểm để khoanh vùng.' : 'Chọn điểm đầu và các điểm tiếp theo.', session.mode === 'area' ? 'Select at least 3 points for an area.' : 'Select the first point, then continue.')
    : t('Nhấp đúp hoặc Enter để kết thúc.', 'Double-click or Enter to finish.');
  return <section ref={root} className="map-measure-panel" data-collapsed={collapsed} aria-label={t('Đo bản đồ', 'Map measurement')}>
    <div className="map-measure-heading floating-panel-handle" {...floating} tabIndex={0} role="group" aria-label={t('Vị trí công cụ đo', 'Measurement panel position')} aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown Home" title={t('Kéo để đổi vị trí. Nhấp đúp để đặt lại.', 'Drag to move. Double-click to reset.')}>
      <strong>{t('Đo bản đồ', 'Map measurement')}</strong>
      <button className="icon-button" aria-label={t('Tùy chọn đo', 'Measurement settings')} title={t('Tùy chọn đo', 'Measurement settings')} aria-expanded={optionsOpen} aria-controls="measurement-options" onClick={() => { setCollapsed(false); setOptionsOpen(value => !value); }}><UiIcon name="settings" size={16}/></button>
      <button className="icon-button" aria-label={collapsed ? t('Mở rộng công cụ đo', 'Expand measurement') : t('Thu gọn công cụ đo', 'Collapse measurement')} aria-expanded={!collapsed} onClick={() => setCollapsed(value => !value)}><UiIcon name={collapsed ? 'expand' : 'collapse'} size={16}/></button>
      <button className="icon-button" aria-label={t('Đóng công cụ đo', 'Close measurement')} onClick={onClose}><UiIcon name="close" size={16}/></button>
    </div>
    {collapsed ? <button className="map-measure-compact" onClick={() => setCollapsed(false)}><span>{t(...modeNames[session.mode])}</span><strong>{results[0]?.[1] ?? t('Chọn điểm trên bản đồ', 'Select points on the map')}</strong></button> : <>
      <label className="map-measure-type"><span>{t('Kiểu đo', 'Measurement type')}</span><select aria-label={t('Kiểu đo', 'Measurement type')} value={session.mode} onChange={event => dispatch({ type: 'mode', mode: event.target.value as MeasureMode })}>
        {Object.entries(modeNames).map(([mode, name]) => <option key={mode} value={mode}>{t(...name)}</option>)}
      </select></label>
      {results.length > 0 && <dl className="map-measure-result" aria-label={t('Kết quả đo', 'Measurement result')}>
        {results.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
      </dl>}
      {session.source && <p className="map-measure-source" title={session.source}>{session.source}</p>}
      <p className="map-measure-hint">{hint}</p>
      {hover?.name && !session.finished && <p className="map-measure-snap" title={hover.name}>{t('Bắt điểm: ', 'Snapped: ')}{hover.name}</p>}
      <div className="map-measure-actions">
        <button className="icon-button" title={t('Hoàn tác (Ctrl+Z)', 'Undo (Ctrl+Z)')} aria-label={t('Hoàn tác', 'Undo')} disabled={!session.undo.length} onClick={() => dispatch({ type: 'undo' })}><UiIcon name="undo" size={16}/></button>
        <button className="icon-button measure-redo" title={t('Làm lại (Ctrl+Y)', 'Redo (Ctrl+Y)')} aria-label={t('Làm lại', 'Redo')} disabled={!session.redo.length} onClick={() => dispatch({ type: 'redo' })}><UiIcon name="undo" size={16}/></button>
        <button className="text-button" title={t('Giữ kết quả đã hoàn tất và bắt đầu phép đo mới', 'Keep the completed result and start a new measurement')} disabled={!session.points.length} onClick={() => dispatch({ type: 'new' })}>{t('Đo mới', 'New')}</button>
        <button className="button primary" disabled={session.finished || !canComplete} onClick={() => dispatch({ type: 'finish' })}>{t('Kết thúc', 'Finish')}</button>
      </div>
      {session.finished && <button className="text-button measure-copy" onClick={copy}>{copyState === 'copied' ? t('Đã sao chép', 'Copied') : t('Sao chép kết quả', 'Copy results')}</button>}
      {copyState === 'error' && <p className="map-measure-hint" role="status">{t('Không sao chép được. Có thể chọn trực tiếp phần kết quả.', 'Copy failed. You can select the result text directly.')}</p>}
      {selected && <button className="text-button measure-feature" title={selected.name} onClick={() => dispatch({ type: 'import', points: selected.points, mode: selected.closed ? 'area' : 'distance', source: selected.name })}>{selected.kind === 'road' ? t('Đo đoạn đường', 'Measure road segment') : selected.kind === 'aoi' ? t('Đo vùng đánh giá', 'Measure assessment area') : t('Đo tuyến đang xem', 'Measure selected route')}</button>}
      {optionsOpen && <div className="measure-options" id="measurement-options" role="group" aria-label={t('Tùy chọn đo', 'Measurement settings')}>
        {!['location', 'angle'].includes(session.mode) && <label><span>{t('Độ dài', 'Length units')}</span><select value={units.distance} aria-label={t('Đơn vị độ dài', 'Length units')} onChange={event => changeUnit('distance', event.target.value)}><option value="auto">{t('Tự động', 'Automatic')}</option><option value="m">m</option><option value="km">km</option></select></label>}
        {['area', 'radius'].includes(session.mode) && <label><span>{t('Diện tích', 'Area units')}</span><select value={units.area} aria-label={t('Đơn vị diện tích', 'Area units')} onChange={event => changeUnit('area', event.target.value)}><option value="auto">{t('Tự động', 'Automatic')}</option><option value="m2">m²</option><option value="ha">ha</option><option value="km2">km²</option></select></label>}
        <label className="measure-checkbox"><input type="checkbox" checked={snap} onChange={event => setSnap(event.target.checked)}/><span>{t('Bắt vào đối tượng hiển thị', 'Snap to visible features')}</span></label>
        <label className="measure-checkbox"><input type="checkbox" checked={labels} onChange={event => setLabels(event.target.checked)}/><span>{t('Hiện kết quả trên bản đồ', 'Show results on map')}</span></label>
        <dl className="measure-method"><div><dt>{t('Phương pháp', 'Method')}</dt><dd>{session.mode === 'location' ? 'WGS84' : t('Mặt phẳng UTM 48N', 'UTM 48N planar')}</dd></div>{session.mode === 'bearing' && <div><dt>{t('Hướng chuẩn', 'Reference north')}</dt><dd>{t('Bắc lưới', 'Grid north')}</dd></div>}</dl>
      </div>}
      {session.points.length > 1 && session.mode === 'distance' && <details className="measure-details"><summary>{t('Chi tiết từng đoạn', 'Segment details')}</summary><table><thead><tr><th>{t('Đoạn', 'Segment')}</th><th>{t('Chiều dài', 'Length')}</th></tr></thead><tbody>{session.points.slice(1).map((point, index) => <tr key={index}><td>{index + 1}–{index + 2}</td><td>{formatDistance(horizontalLength([session.points[index], point]), units, locale)}</td></tr>)}</tbody></table></details>}
      {session.mode === 'location' && session.points.length > 0 && <details className="measure-details"><summary>UTM 48N</summary><dl className="measure-coordinate-grid"><div><dt>E</dt><dd>{session.points[0].x.toFixed(1)} m</dd></div><div><dt>N</dt><dd>{session.points[0].y.toFixed(1)} m</dd></div></dl></details>}
      {session.saved.length > 0 && <details className="measure-details measure-history"><summary>{t('Kết quả đã giữ', 'Retained results')} ({session.saved.length})</summary>
        {session.saved.map(item => <div className="measure-history-row" key={item.id}><label><input type="checkbox" checked={item.visible} onChange={() => dispatch({ type: 'visible', id: item.id })}/><span><strong>#{item.id} {t(...modeNames[item.mode])}</strong><small>{measurementResults(item.mode, item.points, units, locale)[0]?.[1]}</small></span></label><button className="icon-button" aria-label={t('Xóa phép đo ', 'Delete measurement ') + item.id} onClick={() => dispatch({ type: 'delete', id: item.id })}><UiIcon name="trash" size={16}/></button></div>)}
        <button className="text-button measure-feature" onClick={() => dispatch({ type: 'reset' })}>{t('Xóa toàn bộ phép đo', 'Clear all measurements')}</button>
      </details>}
    </>}
  </section>;
}
