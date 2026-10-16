import { useState } from 'react';
import type { Locale } from '../../types/dear';
import { roadGeographic, roadProjected } from '../routes/selectedRoadJourney';
import { validateGeometry } from '../../geo/vector/validateGeometry';
import { GeometryInputDialog } from './GeometryInputDialog';
import { CoordinateFields } from './CoordinateFields';
export function ScenarioCoordinatesDialog({ point, locale, onPreview, onPick, onClose }: {
  point: {x:number;y:number}; locale: Locale; onPreview: (point:{x:number;y:number})=>void; onPick:()=>void; onClose:()=>void;
}) {
  const t = (vi:string,en:string)=>locale==='vi'?vi:en;
  const initial=roadGeographic(point);
  const initialLat=initial.latitude.toFixed(6),initialLon=initial.longitude.toFixed(6);
  const [lat,setLat]=useState(initialLat),[lon,setLon]=useState(initialLon),[error,setError]=useState('');
  return <GeometryInputDialog title={t('Sửa tọa độ đối tượng','Edit feature coordinates')} locale={locale} onClose={onClose}>
    <form onSubmit={e=>{e.preventDefault();try {
      const latitude=lat===initialLat?initial.latitude:Number(lat),longitude=lon===initialLon?initial.longitude:Number(lon);
      validateGeometry({type:'Point',coordinates:[longitude,latitude]});
      if(lat===initialLat&&lon===initialLon){onClose();return;}
      const next=roadProjected(latitude,longitude);
      if(!Number.isFinite(next.x)||!Number.isFinite(next.y)) throw new Error();
      onPreview(next);onClose();
    } catch {setError(t('Kiểm tra lại vĩ độ và kinh độ.','Check latitude and longitude.'));}}}>
      <CoordinateFields latitude={lat} longitude={lon} onChange={(nextLat,nextLon)=>{setLat(nextLat);setLon(nextLon);}} locale={locale} onPick={()=>{onClose();onPick();}} />
      {error&&<p className="field-error" role="alert">{error}</p>}
      <div className="geodata-actions"><button type="submit" className="button primary">{t('Xem vị trí mới','Preview position')}</button><button type="button" className="button" onClick={onClose}>{t('Hủy','Cancel')}</button></div>
    </form>
  </GeometryInputDialog>;
}
