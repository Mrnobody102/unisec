import { useEffect, useRef } from 'react';
import type { Locale } from '../../types/dear';
import { UiIcon } from './UiIcon';

type Props = { locale: Locale; layers: Record<string, boolean>; hasFloodData: boolean; hasHLZData?: boolean; hasSelectedRoute: boolean; hasIncidentLayers: boolean; onToggleLayer: (id: string) => void; onClose: () => void };

export function LayersDialog({ locale, layers, hasFloodData, hasHLZData, hasSelectedRoute, hasIncidentLayers, onToggleLayer, onClose }: Props): JSX.Element {
  const t = (vi: string, en: string) => locale === 'en' ? en : vi;
  const panelRef = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    panel?.querySelector<HTMLButtonElement>('button')?.focus();
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); closeRef.current(); } };
    const outside = (event: PointerEvent) => {
      const target = event.target as Element;
      if (!panel?.contains(target) && !target.closest('[data-map-layers-trigger]')) closeRef.current();
    };
    document.addEventListener('keydown', escape);
    document.addEventListener('pointerdown', outside, true);
    return () => { document.removeEventListener('keydown', escape); document.removeEventListener('pointerdown', outside, true); if (panel?.contains(document.activeElement) || document.activeElement === document.body) previous?.focus(); };
  }, []);
  const groups = [
    { name: t('Tình huống', 'Situation'), items: [['aoi', t('Vùng đánh giá', 'Assessment area')], ['landslide', t('Sạt lở', 'Landslides')], ['flood', t('Nghi ngập lũ quét', 'Possible flash flooding')], ['status', t('Tình trạng đường', 'Road status')]] },
    { name: t('Tiếp cận', 'Access'), items: [['roads', t('Mạng đường', 'Road network')], ['communities', t('Thôn, bản', 'Communities')], ['staging', t('Điểm tập kết', 'Staging point')], ['hlz', t('Điểm hạ cánh trực thăng', 'Helicopter landing zones')], ['route', t('Tuyến đang xem', 'Selected route')]] }
  ];
  const bases: Array<[boolean, string]> = [[true, t('Ảnh nền', 'Imagery')], [false, t('Địa hình', 'Terrain')]];
  return <section className="layers-panel" id="map-layers-panel" ref={panelRef} role="dialog" aria-modal="false" aria-labelledby="map-layers-title">
    <div className="layers-heading"><h2 id="map-layers-title">{t('Lớp bản đồ', 'Map layers')}</h2><button className="icon-button" onClick={onClose} aria-label={t('Đóng lớp bản đồ', 'Close map layers')}><UiIcon name="close" /></button></div>
    <div className="layers-content">
      <fieldset className="basemap-choices"><legend>{t('Bản đồ nền', 'Base map')}</legend>
        {bases.map(([imagery, label]) => <label className={'basemap-choice ' + (layers.imagery === imagery ? 'is-active' : '')} key={String(imagery)}>
          <input type="radio" name="basemap" checked={layers.imagery === imagery} onChange={() => { if (layers.imagery !== imagery) onToggleLayer('imagery'); }}/><span>{label}</span>
        </label>)}
      </fieldset>
      <label className="regional-basemap-toggle"><input type="checkbox" checked={Boolean(layers.context)} onChange={() => onToggleLayer('context')}/><span>{t('Nền bản đồ khu vực', 'Regional basemap')}</span></label>
      {hasIncidentLayers && groups.map(group => <fieldset className="map-layer-group" key={group.name}><legend>{group.name}</legend>{group.items.filter(([id]) => (id !== 'flood' || hasFloodData) && (id !== 'hlz' || hasHLZData) && (id !== 'route' || hasSelectedRoute)).map(([id, label]) => (
        <label key={id}><input type="checkbox" checked={Boolean(layers[id])} onChange={() => onToggleLayer(id)}/><span>{label}</span></label>
      ))}</fieldset>)}
    </div>
    <div className="layers-footer"><label className="terrain-shading"><input type="checkbox" checked={layers.hillshade} onChange={() => onToggleLayer('hillshade')}/>{t('Bóng địa hình', 'Terrain shading')}</label></div>
  </section>;
}
