import { presentationRasterUrl } from './presentationRaster';
import type { ImageryLoadState } from './ImageryStatus';
import L from 'leaflet';
import { type ImageryRaster } from './analysisImagery';

/** Web Mercator renderings as exact Leaflet image overlays in one pane. */
export function createAnalysisOverlay2d(map: L.Map, pane: string, alt: string, onStatus:(state:ImageryLoadState)=>void = ()=>{}) {
  let overlays: L.ImageOverlay[] = [], run: AbortController | null = null, key = '', latestOpacity = 1;
  const clear = () => { overlays.forEach(overlay => overlay.remove()); overlays = []; };
  return {
    set(rasters: ImageryRaster[], opacity: number) {
      latestOpacity = opacity;
      const next = rasters.map(raster => raster.web.sha256).join(',');
      if (next === key) { overlays.forEach(overlay => overlay.setOpacity(opacity)); if(!rasters.length)onStatus('off'); return; }
      key = next; run?.abort(); clear();
      if (!rasters.length) {onStatus('off');return;}
      onStatus('loading');
      const current = new AbortController(); run = current;
      void Promise.all(rasters.map(raster => presentationRasterUrl(raster, current.signal))).then(urls => {
        if (current.signal.aborted) return;
        overlays = urls.map((url, index) => L.imageOverlay(url, rasters[index].web.latLngBounds, { pane, opacity:latestOpacity, interactive: false, alt }).on('error',()=>{if(!current.signal.aborted){key='';onStatus('error');}}).addTo(map));
        onStatus('ready');
      }, () => { if (!current.signal.aborted) {key = ''; onStatus('error');} });
    },
    dispose() { run?.abort(); clear(); }
  };
}
