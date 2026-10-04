import { useEffect, useRef, useState } from 'react';
import * as L from 'leaflet';
import type { Locale } from '../../types/dear';
import { UiIcon } from '../../shared/ui/UiIcon';
import { loadComparisonImage, validateComparisonPair, type ComparisonPair } from './comparison';
import './comparison.css';

function ComparisonMap({ pair, locale }: { pair: ComparisonPair; locale: Locale }): JSX.Element {
  const date = (iso: string) => new Date(iso).toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-GB', { timeZone: 'Asia/Bangkok', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const host = useRef<HTMLDivElement>(null), clip = useRef<() => void>(() => {});
  const [position, setPosition] = useState(50);
  const positionRef = useRef(position); positionRef.current = position;
  useEffect(() => {
    const container = host.current!;
    const map = L.map(container, { attributionControl: false, minZoom: 7, maxZoom: 19, zoomSnap: 0.25 });
    L.imageOverlay(pair.after.url, pair.after.bounds, { interactive: false }).addTo(map);
    const before = L.imageOverlay(pair.before.url, pair.before.bounds, { interactive: false, zIndex: 2 }).addTo(map);
    // Fit the common footprint, where the two images can actually be compared.
    const a = pair.before.bounds, b = pair.after.bounds;
    map.fitBounds([[Math.max(a[0][0], b[0][0]), Math.max(a[0][1], b[0][1])], [Math.min(a[1][0], b[1][0]), Math.min(a[1][1], b[1][1])]], { padding: [24, 24] });
    clip.current = () => {
      const element = before.getElement(); if (!element) return;
      const imageRect = element.getBoundingClientRect(), mapRect = container.getBoundingClientRect();
      const cut = mapRect.left + mapRect.width * positionRef.current / 100;
      element.style.clipPath = `inset(0 ${Math.max(0, Math.min(imageRect.width, imageRect.right - cut))}px 0 0)`;
    };
    before.on('load', clip.current); map.on('move zoom zoomend resize', clip.current);
    const resize = new ResizeObserver(() => { map.invalidateSize({ pan: false }); clip.current(); }); resize.observe(container);
    clip.current();
    return () => { resize.disconnect(); map.remove(); clip.current = () => {}; };
  }, [pair]);
  useEffect(() => clip.current(), [position]);
  return <div className="comparison-stage">
    <div className="comparison-map" ref={host} aria-label={locale === 'vi' ? 'Bản đồ so ảnh trước và sau' : 'Pre/post comparison map'}/>
    <div className="comparison-divider" style={{ left: `${position}%` }}/>
    <div className="comparison-captions"><span>{date(pair.before.acquiredAt)}</span><span>{date(pair.after.acquiredAt)}</span></div>
    <label className="comparison-slider"><span>{locale === 'vi' ? 'Trước' : 'Before'}</span><input aria-label={locale === 'vi' ? 'Vị trí so ảnh' : 'Image comparison position'} type="range" min="0" max="100" value={position} onChange={event => setPosition(Number(event.target.value))}/><span>{locale === 'vi' ? 'Sau' : 'After'}</span></label>
  </div>;
}

export function ImageCompareDialog({ pair, onPair, triggeredAt, locale, onClose }: { pair: ComparisonPair | null; onPair: (pair: ComparisonPair | null) => void; triggeredAt: string; locale: Locale; onClose: () => void }): JSX.Element {
  const [files, setFiles] = useState<[File | null, File | null]>([null, null]);
  const [dates, setDates] = useState(['', '']), [sources, setSources] = useState(['', '']);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const t = (vi: string, en: string) => locale === 'vi' ? vi : en;
  const errors: Record<string, [string, string]> = {
    dates: ['Ngày ảnh sau phải muộn hơn ngày ảnh trước.', 'Post-event imagery must be later than pre-event imagery.'],
    'event-time': ['Chọn một ảnh trước và một ảnh sau thời điểm kích hoạt sự kiện.', 'Choose one acquisition before and one after the event trigger.'],
    source: ['Cần nguồn của cả hai ảnh.', 'Both images require a source.'],
    overlap: ['Hai ảnh không có vùng chung để so sánh.', 'The images have no overlapping footprint.'],
    size: ['Dùng ảnh tối đa 40 MB và 8 triệu pixel.', 'Use imagery up to 40 MB and 8 million pixels.'],
    crs: ['Hỗ trợ GeoTIFF WGS84, Web Mercator hoặc UTM 48N.', 'Supported GeoTIFF CRS: WGS84, Web Mercator or UTM 48N.'],
    'display-product': ['Cần GeoTIFF hiển thị RGB hoặc xám 8 bit.', 'Use an 8-bit RGB or grayscale display GeoTIFF.'],
    rotation: ['Cần ảnh đã căn chỉnh, không xoay lưới pixel.', 'Use an aligned image without a rotated pixel grid.'],
    georef: ['Ảnh thiếu hoặc sai thông tin định vị.', 'The image has invalid georeferencing.']
  };
  const load = async () => {
    if (!files[0] || !files[1]) return;
    if (!sources.every(source => source.trim())) { setError(t(...errors.source)); return; }
    const times = dates.map(value => value + ':00+07:00');
    if (Date.parse(times[0]) >= Date.parse(times[1])) { setError(t(...errors.dates)); return; }
    if (Date.parse(times[0]) >= Date.parse(triggeredAt) || Date.parse(times[1]) < Date.parse(triggeredAt)) { setError(t(...errors['event-time'])); return; }
    setBusy(true); setError(''); controller.current?.abort(); const abort = new AbortController(); controller.current = abort;
    try {
      const [before, after] = await Promise.all(files.map((file, index) => loadComparisonImage(file!, times[index], sources[index], abort.signal)));
      const result = { before, after }; validateComparisonPair(result, triggeredAt);
      if (!abort.signal.aborted) onPair(result);
    } catch (reason) {
      if (!abort.signal.aborted) {
        // Stop the other image's decode/reprojection if one member fails.
        setError(t(...(errors[reason instanceof Error ? reason.message : ''] ?? ['Không đọc được cặp ảnh GeoTIFF.', 'The GeoTIFF pair could not be read.'])));
        setBusy(false);
        abort.abort();
      }
    } finally { if (!abort.signal.aborted) setBusy(false); }
  };
  return <div className="modal-overlay" onClick={onClose}><section className="modal-dialog comparison-dialog" role="dialog" aria-modal="true" aria-labelledby="comparison-title" onClick={event => event.stopPropagation()}>
    <header className="modal-head"><h2 id="comparison-title">{t('So ảnh trước và sau sự kiện', 'Pre/post imagery comparison')}</h2><button className="icon-button" aria-label={t('Đóng', 'Close')} onClick={onClose}><UiIcon name="close"/></button></header>
    {pair ? <><ComparisonMap pair={pair} locale={locale}/><footer className="comparison-sources"><span>{t('Trước', 'Before')}: {pair.before.source}</span><span>{t('Sau', 'After')}: {pair.after.source}</span><button className="text-button" onClick={() => onPair(null)}>{t('Chọn cặp ảnh khác', 'Choose another pair')}</button><small>{t('Vùng thiếu ảnh để trống. So ảnh không tự xác nhận sạt lở hoặc khả năng đi qua.', 'No-data areas remain blank. Image comparison does not confirm landslides or passability.')}</small></footer></> : <form className="modal-body comparison-form" onSubmit={event => { event.preventDefault(); void load(); }}>
      {[0, 1].map(index => <fieldset key={index}><legend>{index === 0 ? t('Ảnh trước sự kiện', 'Pre-event imagery') : t('Ảnh sau sự kiện', 'Post-event imagery')}</legend>
        <label>{t('GeoTIFF', 'GeoTIFF')}<input type="file" accept=".tif,.tiff" required disabled={busy} onChange={event => setFiles(previous => index === 0 ? [event.target.files?.[0] ?? null, previous[1]] : [previous[0], event.target.files?.[0] ?? null])}/></label>
        <label>{t('Thời gian thu nhận (UTC+7)', 'Acquisition time (UTC+7)')}<input type="datetime-local" required value={dates[index]} disabled={busy} onChange={event => setDates(previous => previous.map((value, i) => i === index ? event.target.value : value))}/></label>
        <label>{t('Nguồn ảnh', 'Image source')}<input required maxLength={120} value={sources[index]} disabled={busy} onChange={event => setSources(previous => previous.map((value, i) => i === index ? event.target.value : value))}/></label>
      </fieldset>)}
      {error && <p className="comparison-error" role="alert">{error}</p>}
      <button className="button primary" type="submit" disabled={busy}>{busy ? t('Đang đọc ảnh', 'Loading imagery') : t('Mở so ảnh', 'Open comparison')}</button>
    </form>}
  </section></div>;
}
