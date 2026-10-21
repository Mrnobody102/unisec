import {useEffect,useRef,useState} from 'react';
import L from 'leaflet';
import type {GeometryRecord} from '../../geo/vector/types';
import type {Locale} from '../../types/dear';
import {UiIcon} from '../../shared/ui/UiIcon';
import {acquisitionLabel,rasterUrl,selectedRasters,type AnalysisLayer} from './analysisImagery';
import {landslideAreaOf,landslideAreaStyle} from '../landslides/landslideAreas';
import {removeLeafletMap} from '../map/removeLeafletMap';
import {basemapTileOptions,imagerySource} from '../map/imagerySource';
import {retryTileErrors} from '../map/tileRetry';
import {supportsBasemapTone} from './basemapTone';
import {BasemapToneFilters} from './BasemapToneFilters';
import './analysis-imagery.css';
import './prepared-comparison.css';

/** Co-registered raw optical previews on a single map, with the original KML overlay.
 * Each side retains its own acquisition dates; neither date confirms the KML boundary. */
export function PreparedImageryComparison({layers,records,selected,locale,onClose}:{layers:AnalysisLayer[];records:GeometryRecord[];selected?:GeometryRecord;locale:Locale;onClose:()=>void}){
  const t=(vi:string,en:string)=>locale==='vi'?vi:en;
  const optical=layers.filter(layer=>layer.kind==='optical').sort((a,b)=>{
    const day=(layer:typeof a)=>Math.max(...layer.parts.map(part=>Date.parse(part.acquired)));
    return day(a)-day(b);
  });
  const before=optical[0],after=optical.at(-1)!;
  const assetKey=JSON.stringify([before,after]);
  const host=useRef<HTMLDivElement>(null),mapRef=useRef<L.Map|null>(null);
  const [position,setPosition]=useState(50),[status,setStatus]=useState<'loading'|'ready'|'error'>('loading'),[attempt,setAttempt]=useState(0);
  const mask=useRef<{before:HTMLElement;after:HTMLElement}|null>(null),positionRef=useRef(position);positionRef.current=position;
  const applyMask=()=>{
    const map=mapRef.current;if(!map||!mask.current)return;
    const origin=map.containerPointToLayerPoint(L.point(0,0)),size=map.getSize(),divider=origin.x+size.x*positionRef.current/100;
    mask.current.before.style.clip=`rect(${origin.y}px,${divider}px,${origin.y+size.y}px,${origin.x}px)`;
    mask.current.after.style.clip=`rect(${origin.y}px,${origin.x+size.x}px,${origin.y+size.y}px,${divider}px)`;
  };
  useEffect(()=>{
    if(!host.current)return;
    const run=new AbortController();
    const map=L.map(host.current,{attributionControl:false,zoomControl:false,maxZoom:19});mapRef.current=map;
    L.control.zoom({position:'topright'}).addTo(map);
    // The same satellite basemap as the main map, under both Planet scenes, so their extent reads in context.
    retryTileErrors(L.tileLayer(imagerySource.url,{maxNativeZoom:imagerySource.maxNativeZoom,maxZoom:19,noWrap:true,...basemapTileOptions})).addTo(map);
    const pane=map.createPane('comparison-before');pane.style.zIndex='310';
    const afterPane=map.createPane('comparison-after');afterPane.style.zIndex='300';mask.current={before:pane,after:afterPane};
    map.on('move zoom resize',applyMask);
    const vectors=map.createPane('comparison-extents');vectors.style.zIndex='410';
    const all=L.featureGroup();
    for(const record of records.filter(record=>record.visible&&landslideAreaOf(record))){
      const area=landslideAreaOf(record)!;
      L.geoJSON(record.feature,{pane:'comparison-extents',interactive:false,style:{...landslideAreaStyle(area,record.id===selected?.id),fillOpacity:0}}).addTo(all);
    }
    all.addTo(map);
    const fit=selected?L.geoJSON(selected.feature).getBounds():all.getBounds();
    if(fit.isValid())map.fitBounds(fit,{padding:[60,60],maxZoom:17});else map.fitBounds(selectedRasters(layers,{layer:after.id,sarMode:'vv',opacity:1})[0].web.latLngBounds);
    applyMask();setStatus('loading');
    const load=async()=>{
      for(const [layer,pane] of [[after,'comparison-after'],[before,'comparison-before']] as const){
        const rasters=selectedRasters(layers,{layer:layer.id,sarMode:'vv',opacity:1});
        const urls=await Promise.all(rasters.map(raster=>rasterUrl(raster.web,run.signal)));
        run.signal.throwIfAborted();
        await Promise.all(urls.map((url,index)=>new Promise<void>((resolve,reject)=>{
          L.imageOverlay(url,rasters[index].web.latLngBounds,{pane,interactive:false,alt:t('Ảnh Planet gốc','Original Planet imagery')}).on('load',()=>resolve()).on('error',()=>reject(new Error('Image decode failed'))).addTo(map);
        })));
      }
      if(!run.signal.aborted)setStatus('ready');
    };
    void load().catch(()=>{if(!run.signal.aborted)setStatus('error');});
    const resize=new ResizeObserver(()=>{map.invalidateSize();applyMask();});resize.observe(host.current);
    return ()=>{run.abort();resize.disconnect();mask.current=null;mapRef.current=null;removeLeafletMap(map);};
  },[assetKey,records,selected,attempt]);
  useEffect(applyMask,[position]);
  return <div className="modal-overlay" onClick={onClose}><section className="modal-dialog prepared-comparison" role="dialog" aria-modal="true" aria-labelledby="prepared-comparison-title" onClick={event=>event.stopPropagation()}>
    <header className="modal-head"><h2 id="prepared-comparison-title">{t('Đối chiếu vùng sạt trên ảnh','Compare mapped extents with imagery')}</h2><button className="icon-button" aria-label={t('Đóng','Close')} onClick={onClose}><UiIcon name="close"/></button></header>
    <div className="prepared-comparison-map" ref={host}/>
    {/* The basemap takes the Planet scene's measured tone, as on the main map; Planet pixels stay original. */}
    <BasemapToneFilters host={host} active={supportsBasemapTone(layers)&&!imagerySource.custom}/>
    <div className="prepared-comparison-dates"><span>{acquisitionLabel(before)}</span><span>{acquisitionLabel(after)}</span></div>
    <label className="prepared-comparison-slider"><span>{t('Trước','Before')}</span><input type="range" min="0" max="100" aria-label={t('Vị trí so ảnh','Image comparison position')} value={position} onChange={event=>setPosition(Number(event.target.value))}/><span>{t('Sau','After')}</span></label>
    <footer><p>{t('Màu ảnh gốc. Ranh KML chưa xác nhận cùng ngày ảnh.','Original image colours. KML extents have not been verified against these acquisition dates.')}</p><small>© Planet Labs PBC. {t('Ảnh nền','Basemap')}: {imagerySource.name}</small>
      {status==='loading'&&<span role="status">{t('Đang tải ảnh','Loading imagery')}</span>}
      {status==='error'&&<span role="status">{t('Chưa tải được cặp ảnh.','Could not load the image pair.')} <button className="text-button" onClick={()=>setAttempt(value=>value+1)}>{t('Thử lại','Retry')}</button></span>}
    </footer>
  </section></div>;
}
