import * as L from 'leaflet';
import {localMapSource} from './localMapSource';
import {basemapTileOptions, internetImagerySource, noteInternetDetail} from './imagerySource';
import {internetDetailAvailable, deferInternetDetail, reconnectInternetDetail} from './imageryDetail';
/** The local base is never removed. The web imagery refines every scale in the background. */
export function addInternetDetail(map: L.Map) {
  const local=localMapSource();
  if (!local) return {dispose:()=>{},setOpacity:(_value:number)=>{}};
  const pane=map.getPane('internet-detail')??map.createPane('internet-detail');
  pane.style.zIndex='201';pane.classList.add('internet-detail-pane');
  let layer: L.TileLayer | null = null, opacity=1;
  const remove=()=>{layer?.remove();layer=null;};
  const sync=()=>{
    if (!internetDetailAvailable()) {remove();return;}
    if (layer) return;
    layer=L.tileLayer(internetImagerySource.url,{
      minZoom:0,maxNativeZoom:internetImagerySource.maxNativeZoom,maxZoom:19,
      pane:'internet-detail',noWrap:true,crossOrigin:'anonymous',opacity,...basemapTileOptions
    });
    layer.on('tileload',noteInternetDetail);
    const current=layer;
    layer.on('tileerror',()=>{deferInternetDetail();queueMicrotask(()=>{if(layer===current)remove();});});
    layer.addTo(map);
  };
  const online=()=>{reconnectInternetDetail();sync();};
  window.addEventListener('online',online);window.addEventListener('offline',remove);
  map.on('zoomend moveend',sync);sync();
  return {setOpacity(value:number){opacity=value;layer?.setOpacity(value);},
    dispose(){window.removeEventListener('online',online);window.removeEventListener('offline',remove);map.off('zoomend moveend',sync);remove();}};
}
