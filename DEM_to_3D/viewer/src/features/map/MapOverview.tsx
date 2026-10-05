import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import * as L from 'leaflet';
import type { Locale } from '../../types/dear';
import { UiIcon } from '../../shared/ui/UiIcon';
import type { Raster2D } from './raster2d';
import './map-overview.css';

type Props = {
  mapRef: MutableRefObject<L.Map | null>;
  raster: Raster2D | null;
  enabled: boolean;
  locale: Locale;
  area: Array<[number, number]>;
};

/** Local overview: reuses the raster and tracks the actual 2D map bounds. */
export function MapOverview({ mapRef, raster, enabled, locale, area }: Props): JSX.Element | null {
  const [expanded, setExpanded] = useState(false);
  const root = useRef<HTMLElement>(null), host = useRef<HTMLDivElement>(null);
  const t = (vi: string, en: string) => locale === 'vi' ? vi : en;
  useEffect(() => {
    const main = mapRef.current, surface = host.current, container = root.current;
    if (!enabled || !expanded || !raster || !main || !surface || !container) return;
    const overview = L.map(surface, {
      zoomControl: false, attributionControl: false, dragging: false, scrollWheelZoom: false,
      doubleClickZoom: false, boxZoom: false, keyboard: false, touchZoom: false,
      zoomSnap: 0, fadeAnimation: false, zoomAnimation: false
    });
    L.DomEvent.disableClickPropagation(container);
    L.DomEvent.disableScrollPropagation(container);
    L.imageOverlay(raster.url, raster.bounds, { interactive: false }).addTo(overview);
    if (area.length) L.polygon(area, { fill: false, color: '#e7f0f8', weight: 1, dashArray: '3 3', interactive: false }).addTo(overview);
    const extent = L.rectangle(main.getBounds(), {
      className: 'overview-extent', color: '#ffffff', weight: 1.5,
      fillColor: '#197663', fillOpacity: .16, interactive: false
    }).addTo(overview);
    const context = L.latLngBounds(raster.bounds).extend(area);
    const fit = () => {
      if (!surface.clientWidth || !surface.clientHeight) return;
      overview.invalidateSize({ pan: false });
      overview.fitBounds(context, { padding: [8, 8], animate: false });
    };
    let frame = 0;
    const update = () => { frame = 0; extent.setBounds(main.getBounds()); };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const navigate = (event: L.LeafletMouseEvent) => main.panTo(event.latlng, { animate: false });
    const keyboard = (event: KeyboardEvent) => {
      const delta = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[event.key];
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault(); main.panTo(context.getCenter(), { animate: false });
      } else if (delta) {
        event.preventDefault();
        const center = main.getCenter(), view = main.getBounds();
        main.panTo([center.lat + delta[1] * (view.getNorth() - view.getSouth()) * .2,
          center.lng + delta[0] * (view.getEast() - view.getWest()) * .2], { animate: false });
      }
    };
    surface.addEventListener('keydown', keyboard);
    main.on('move zoom resize', schedule);
    overview.on('click', navigate);
    const resize = new ResizeObserver(fit); resize.observe(surface);
    fit(); update();
    return () => {
      cancelAnimationFrame(frame); resize.disconnect();
      surface.removeEventListener('keydown', keyboard);
      main.off('move zoom resize', schedule); overview.off('click', navigate);
      L.DomEvent.off(container);
      overview.remove();
    };
  }, [enabled, expanded, mapRef, raster, area]);
  if (!enabled || !raster) return null;
  return <section ref={root} className="map-overview" data-expanded={expanded} aria-label={t('Bản đồ tổng quan', 'Overview map')}>
    <button className="overview-toggle" aria-expanded={expanded} aria-controls="overview-map-surface"
      aria-label={expanded ? t('Thu gọn bản đồ tổng quan', 'Hide overview map') : t('Mở bản đồ tổng quan', 'Show overview map')}
      onClick={() => setExpanded(value => !value)}>
      <UiIcon name="area" size={15}/><span>{t('Tổng quan', 'Overview')}</span><UiIcon name={expanded ? 'collapse' : 'expand'} size={14}/>
    </button>
    {expanded && <div ref={host} id="overview-map-surface" className="map-overview-surface" tabIndex={0} role="group"
      aria-label={t('Định hướng bản đồ chính', 'Navigate the main map')}
      aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown Enter"
      title={t('Chọn vị trí trên bản đồ', 'Choose a map location')}/>}
  </section>;
}
