import { useState } from 'react';
import type { Hazard, HazardKind, Locale, ResponseSite } from '../../types/dear';
import type { NewScenarioPoint } from '../access/scenarioPoint';
import { GeometryInputDialog } from './GeometryInputDialog';
import { CoordinateFields } from './CoordinateFields';
import { ConfirmDialog } from '../../shared/ui/ConfirmDialog';
import { roadProjected } from '../routes/selectedRoadJourney';
import { GeometryError } from '../../geo/vector/types';
import { validateGeometry } from '../../geo/vector/validateGeometry';
export type ScenarioPointDraft={type:'hazard'|'site'; name:string; kind:HazardKind; observation:Hazard['observation']; latitude:string; longitude:string; observed:string; source:string; finding:string};
export function newPointDraft(type:ScenarioPointDraft['type']):ScenarioPointDraft {
  return {type,name:'',kind:'landslide',observation:'suspected',latitude:'',longitude:'',observed:new Date(Date.now()+7*3600000).toISOString().slice(0,16),source:'',finding:''};
}
export function ScenarioPointDialog({draft,onDraft,locale,onPick,onSave,onClose}:{
  draft:ScenarioPointDraft;onDraft:(value:ScenarioPointDraft)=>void;locale:Locale;onPick:()=>void;onSave:(change:NewScenarioPoint,note:string)=>boolean;onClose:()=>void;
}) {
  const t=(vi:string,en:string)=>locale==='vi'?vi:en;
  const [error,setError]=useState(''),[review,setReview]=useState<NewScenarioPoint|null>(null);
  const patch=(value:Partial<ScenarioPointDraft>)=>onDraft({...draft,...value});
  const title=draft.type==='hazard'?t('Thêm sự cố','Add hazard'):t('Thêm bãi đáp đề xuất','Add candidate landing site');
  const prepare=()=>{
    try {
      if(!draft.name.trim()||!draft.source.trim()) throw new Error(t('Nhập tên và nguồn ghi nhận.','Enter a name and observation source.'));
      if(!draft.latitude.trim()||!draft.longitude.trim()) throw new Error(t('Chọn vị trí trên bản đồ hoặc nhập tọa độ.','Choose a map position or enter coordinates.'));
      validateGeometry({type:'Point',coordinates:[Number(draft.longitude),Number(draft.latitude)]});
      const observedAt=new Date(draft.observed+':00+07:00').toISOString(),receivedAt=new Date().toISOString();
      if(Date.parse(observedAt)>Date.parse(receivedAt)) throw new Error(t('Thời gian ghi nhận không được nằm trong tương lai.','Observation time cannot be in the future.'));
      const id=crypto.randomUUID(),name:[string,string]=[draft.name.trim(),draft.name.trim()],source:[string,string]=[draft.source.trim(),draft.source.trim()];
      const projected=roadProjected(Number(draft.latitude),Number(draft.longitude));
      if(!Number.isFinite(projected.x)||!Number.isFinite(projected.y)) throw new Error(t('Tọa độ không hợp lệ.','Invalid coordinates.'));
      if(draft.type==='site') {
        const feature:ResponseSite={id,name,kind:'hlz',projected,assessment:'candidate',observedAt,source};
        setReview({kind:'create',feature});
      } else {
        const date=new Date(Date.parse(observedAt)+7*3600000).toISOString();
        const detected=date.slice(11,16)+' '+date.slice(8,10)+'/'+date.slice(5,7)+'/'+date.slice(0,4);
        const feature:Hazard={id,name,kind:draft.kind,observation:draft.observation,projected,src:source,detected};
        const finding=draft.finding.trim()||draft.name.trim();
        setReview({kind:'create',feature,evidence:{id:crypto.randomUUID(),hazardId:id,type:'field-report',observedAt,receivedAt,source,finding:[finding,finding],
          limitation:[draft.observation==='suspected'?'Cần xác minh tại hiện trường.':'Ghi nhận do người điều phối nhập.','Entered by a coordinator; field verification may be required.']}});
      }
      setError('');
    } catch(cause) {setError(cause instanceof GeometryError ? t('Tọa độ không hợp lệ. Kiểm tra vĩ độ và kinh độ.','Invalid coordinates. Check latitude and longitude.') : cause instanceof RangeError ? t('Kiểm tra lại thời gian ghi nhận.','Check the observation time.') : cause instanceof Error?cause.message:t('Kiểm tra thông tin điểm.','Check feature details.'));}
  };
  return <GeometryInputDialog title={title} locale={locale} onClose={onClose}>
    <form onSubmit={e=>{e.preventDefault();prepare();}}>
      <label className="geodata-field">{t('Tên trên bản đồ','Map name')}<input required maxLength={160} value={draft.name} onChange={e=>patch({name:e.target.value})}/></label>
      {draft.type==='hazard'&&<>
        <label className="geodata-field">{t('Loại sự cố','Hazard type')}<select aria-label={t('Loại sự cố','Hazard type')} value={draft.kind} onChange={e=>patch({kind:e.target.value as HazardKind})}>
          <option value="landslide">{t('Sạt lở','Landslide')}</option><option value="flood">{t('Ngập','Flood')}</option><option value="bridge">{t('Sự cố cầu','Bridge hazard')}</option><option value="crossing">{t('Điểm vượt khe','Gully crossing')}</option>
        </select></label>
        <label className="geodata-field">{t('Mức xác minh','Verification')}<select aria-label={t('Mức xác minh','Verification')} value={draft.observation} onChange={e=>patch({observation:e.target.value as Hazard['observation']})}>
          <option value="suspected">{t('Nghi sự cố, cần xác minh','Suspected, needs verification')}</option><option value="reported">{t('Có báo cáo thực địa','Reported from the field')}</option>
        </select></label>
      </>}
      <CoordinateFields latitude={draft.latitude} longitude={draft.longitude} onChange={(latitude,longitude)=>patch({latitude,longitude})} locale={locale} onPick={onPick} />
      <label className="geodata-field">{t('Ghi nhận lúc (+07:00)','Observed at (+07:00)')}<input type="datetime-local" required value={draft.observed} onChange={e=>patch({observed:e.target.value})}/></label>
      <label className="geodata-field">{t('Nguồn ghi nhận','Observation source')}<input required maxLength={160} value={draft.source} onChange={e=>patch({source:e.target.value})}/></label>
      <label className="geodata-field">{t('Nội dung ghi nhận','Observation notes')}<textarea maxLength={2000} rows={2} value={draft.finding} onChange={e=>patch({finding:e.target.value})}/></label>
      <p className="geodata-hint">{draft.type==='hazard'?t('Thêm điểm không tự đổi tình trạng đường.','Adding a point does not automatically change road status.'):t('Bãi đáp mới luôn là vị trí đề xuất, chưa khảo sát.','A new landing site starts as an unsurveyed candidate.')}</p>
      {error&&<p role="alert" className="field-error">{error}</p>}
      <div className="geodata-actions"><button type="submit" className="button primary">{t('Thêm vào bản đồ','Add to map')}</button><button type="button" className="button" onClick={onClose}>{t('Hủy','Cancel')}</button></div>
    </form>
    {review&&<ConfirmDialog title={t('Thêm đối tượng ứng phó?','Add response feature?')} confirmLabel={t('Thêm','Add')} locale={locale} onCancel={()=>setReview(null)} error={error} onConfirm={()=>{
      if(onSave(review,draft.finding.trim()||draft.source.trim())) onClose();else setError(t('Không lưu được. Điểm chưa được thêm vào bản đồ.','Could not save. The feature has not been added to the map.'));
    }}><p>{draft.name}</p><p>{Number(draft.latitude).toFixed(5)}°, {Number(draft.longitude).toFixed(5)}°</p><p>{draft.source}</p>
      {draft.type==='site'&&<p>{t('Đề xuất, chưa khảo sát.','Candidate, not surveyed.')}</p>}
    </ConfirmDialog>}
  </GeometryInputDialog>;
}
