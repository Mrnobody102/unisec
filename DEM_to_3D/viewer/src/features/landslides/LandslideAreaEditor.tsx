import { useEffect, useState } from 'react';
import type { GeometryRecord } from '../../geo/vector/types';
import type { Locale, RoadSegment } from '../../types/dear';
import { deviceLocal } from '../observations/captureMetadata';
import { observationOf } from '../observations/model';
import { areaLabel } from './areaLabels';
import { areaPublicationIssue, areaSources, landslideAreaOf, newLandslideArea, roadLengthM, validateLandslideArea, type LandslideArea } from './landslideAreas';
import './landslide-areas.css';

export type PickedRoadInterval = { areaId: string; roadId: string; fromM: number; toM: number; version: number };
export function LandslideAreaEditor({ record, records, roads, locale, disabled, onSave, onEditGeometry, onRoad, networkVersion = '', pickedInterval, onPickRoadInterval }: {
  record: GeometryRecord; records: GeometryRecord[]; roads: RoadSegment[]; locale: Locale; disabled: boolean;
  onSave: (value: LandslideArea) => boolean; onEditGeometry: () => void; onRoad?: (id: string) => void;
  networkVersion?: string;
  pickedInterval?: PickedRoadInterval | null;
  onPickRoadInterval?: (roadId: string) => void;
}): JSX.Element {
  const current = landslideAreaOf(record);
  const [draft, setDraft] = useState(current ?? newLandslideArea('potential',networkVersion));
  const [observed, setObserved] = useState(current?.observedAt ? deviceLocal(current.observedAt) : '');
  const [error, setError] = useState(''), [saved, setSaved] = useState(false);
  const t = (vi: string, en: string) => locale === 'vi' ? vi : en;
  const update = (patch: Partial<LandslideArea>) => { setDraft(v => ({ ...v, ...patch })); setSaved(false); setError(''); };
  const observations = records.filter(r => observationOf(r));
  const link = (id: string, patch: Partial<LandslideArea['roadLinks'][number]>) => update({ roadLinks: draft.roadLinks.map(l => l.roadId === id ? { ...l, ...patch } : l) });
  useEffect(() => {
    if (pickedInterval?.areaId !== record.id) return;
    setDraft(value => ({...value,roadLinks:value.roadLinks.map(l=>l.roadId===pickedInterval.roadId?{...l,fromM:pickedInterval.fromM,toM:pickedInterval.toM}:l)}));
    setSaved(false);
  }, [pickedInterval, record.id]);
  const save = (): boolean => {
    try {
      const now = new Date().toISOString();
      const value = validateLandslideArea({ ...draft, basis: draft.basis.trim(), observedAt: observed ? new Date(observed).toISOString() : '', updatedAt: now, reviewedAt: draft.review === 'unreviewed' ? '' : now });
      const issue = areaPublicationIssue(value, roads, networkVersion);
      if (issue) { setError(areaLabel(issue === 'imagery' ? 'image' : issue, locale)); return false; }
      if (onSave(value)) {setSaved(true);return true;} else setError(t('Không lưu được bản nháp.', 'Could not save the draft.'));
    } catch { setError(t('Kiểm tra ranh giới, thời điểm và khoảng đường từ–đến.', 'Check the extent, time and road chainage interval.')); }
    return false;
  };
  return <form className="landslide-area-editor" onSubmit={event => {event.preventDefault();save();}}>
    <h3>{t('Khoanh vùng sạt lở', 'Landslide mapping')}</h3>
    <label className="geodata-field">{t('Loại vùng', 'Area type')}<select disabled={disabled} value={draft.state} onChange={e => {
      const state = e.target.value as LandslideArea['state'];
      update({ state, part: state === 'potential' && draft.part === 'deposit' ? 'undifferentiated' : draft.part, roadLinks: draft.roadLinks.map(l => ({ ...l, relation: state === 'potential' ? 'threatens' : l.relation })) });
    }}>{(['potential', 'occurred'] as const).map(v => <option key={v} value={v}>{areaLabel(v, locale)}</option>)}</select></label>
    <button type="button" className="button" disabled={disabled} onClick={onEditGeometry}>{t('Sửa ranh giới trên bản đồ', 'Edit boundary on map')}</button>
    <fieldset disabled={disabled}><legend>{t('Nguồn nhận định', 'Evidence sources')}</legend>{areaSources.map(source => <label className="landslide-check" key={source}><input type="checkbox" checked={draft.sources.includes(source)} onChange={e => update({ sources: e.target.checked ? [...draft.sources, source] : draft.sources.filter(s => s !== source) })}/>{areaLabel(source, locale)}</label>)}</fieldset>
    <label className="geodata-field">{t('Căn cứ khoanh vùng', 'Mapping basis')}<textarea required disabled={disabled} rows={3} maxLength={2000} value={draft.basis} onChange={e => update({ basis: e.target.value })} placeholder={t('Mô tả dấu vết, vết nứt hoặc dấu hiệu được phản ánh.', 'Describe mapped scars, cracks or reported warning signs.')}/></label>
    <label className="geodata-field">{t('Thời điểm tư liệu (nếu biết)', 'Evidence time (if known)')}<input type="datetime-local" disabled={disabled} value={observed} onChange={e => { setObserved(e.target.value); setSaved(false); }}/></label>
    {draft.sources.includes('imagery') && <><label className="geodata-field">{t('Mã ảnh / tài liệu ảnh', 'Image ID / imagery reference')}<input required maxLength={500} disabled={disabled} value={draft.imageReference} onChange={e => update({ imageReference: e.target.value })}/></label><label className="geodata-field">{t('Độ phân giải ảnh (m, nếu biết)', 'Image resolution (m, if known)')}<input type="number" min="0.01" step="any" disabled={disabled} value={draft.imageResolutionM ?? ''} onChange={e => update({ imageResolutionM: e.target.value ? Number(e.target.value) : null })}/></label></>}
    <details><summary>{t('Ranh giới và rà soát', 'Extent and review')}</summary>
      <label className="geodata-field">{t('Phần được khoanh', 'Mapped part')}<select disabled={disabled} value={draft.part} onChange={e => update({ part: e.target.value as LandslideArea['part'] })}>{(['undifferentiated', 'source', 'runout', ...(draft.state === 'occurred' ? ['deposit' as const] : [])] as const).map(v => <option key={v} value={v}>{areaLabel(v, locale)}</option>)}</select></label>
      <label className="geodata-field">{t('Sai số ranh giới (m, nếu đã đánh giá)', 'Boundary accuracy (m, if assessed)')}<input type="number" min="0.01" step="any" disabled={disabled} value={draft.boundaryAccuracyM ?? ''} onChange={e => update({ boundaryAccuracyM: e.target.value ? Number(e.target.value) : null })}/></label>
      <label className="geodata-field">{t('Rà soát', 'Review')}<select disabled={disabled} value={draft.review} onChange={e => update({ review: e.target.value as LandslideArea['review'] })}>{(['unreviewed', 'reviewed', 'field-checked'] as const).map(v => <option key={v} value={v}>{areaLabel(v, locale)}</option>)}</select></label>
      {draft.review !== 'unreviewed' && <label className="geodata-field">{t('Người rà soát', 'Reviewer')}<input required disabled={disabled} maxLength={160} value={draft.reviewer} onChange={e => update({ reviewer: e.target.value })}/></label>}
    </details>
    {(observations.length > 0 || draft.observationIds.length > 0) && <details><summary>{t('Ghi nhận làm căn cứ', 'Source observations')} ({draft.observationIds.length})</summary>{observations.map(point => <label className="landslide-check" key={point.id}><input type="checkbox" disabled={disabled} checked={draft.observationIds.includes(point.id)} onChange={e => update({ observationIds: e.target.checked ? [...draft.observationIds, point.id] : draft.observationIds.filter(id => id !== point.id) })}/>{point.name}</label>)}
      {draft.observationIds.filter(id=>!observations.some(p=>p.id===id)).map(id=><p className="geodata-hint" key={id}>{t('Hồ sơ nguồn không có trong phiên này.', 'Source record is unavailable in this workspace.')} <button type="button" className="text-button" onClick={()=>update({observationIds:draft.observationIds.filter(v=>v!==id)})}>{t('Bỏ liên kết', 'Unlink')}</button></p>)}
    </details>}
    <details open={draft.roadLinks.length > 0}><summary>{t('Đoạn đường liên quan', 'Linked road sections')} ({draft.roadLinks.length})</summary>
      {draft.roadLinks.length > 0 && draft.networkVersion !== networkVersion && <p className="field-error">{areaLabel('network',locale)} <button type="button" className="text-button" onClick={() => update({roadLinks:[],networkVersion})}>{t('Chọn lại liên kết', 'Reassess road links')}</button></p>}
      <p className="geodata-hint">{t('Liên kết vùng sườn dốc với đoạn đường có thể bị ảnh hưởng. Trạng thái đi lại được cập nhật trong hồ sơ đoạn đường.', 'Link the slope area to exposed road sections. Update passability in the road record.')}</p>
      {roads.map(road => { const entry = draft.roadLinks.find(l => l.roadId === road.id), length = roadLengthM(road); return <div className="landslide-road-edit" key={road.id}>
        <label className="landslide-check"><input type="checkbox" disabled={disabled || (!!draft.roadLinks.length && draft.networkVersion !== networkVersion)} checked={!!entry} onChange={e => update({ networkVersion, roadLinks: e.target.checked ? [...draft.roadLinks, { roadId: road.id, relation: 'threatens' }] : draft.roadLinks.filter(l => l.roadId !== road.id) })}/>{road.name[locale === 'vi' ? 0 : 1]}</label>
        {entry && <><label className="geodata-field">{t('Quan hệ với vùng', 'Relation to area')}<select aria-label={t('Quan hệ với vùng', 'Relation to area')} disabled={disabled} value={entry.relation} onChange={e => link(road.id, { relation: e.target.value as 'threatens' | 'affected' })}><option value="threatens">{t('Có thể ảnh hưởng', 'Potentially exposed')}</option>{draft.state === 'occurred' && <option value="affected">{t('Đã có ảnh hưởng', 'Impact recorded')}</option>}</select></label>
          <label className="landslide-check"><input type="checkbox" disabled={disabled} checked={entry.fromM !== undefined} onChange={e => link(road.id, { fromM: e.target.checked ? 0 : undefined, toM: e.target.checked ? Math.floor(length) : undefined })}/>{t('Chỉ một phần đoạn đường', 'Only part of this section')}</label>
          {onPickRoadInterval && <button type="button" className="button" disabled={disabled} onClick={() => onPickRoadInterval(road.id)}>{t('Chọn đầu và cuối trên bản đồ', 'Pick section ends on map')}</button>}
          {entry.fromM !== undefined && <><div className="landslide-chainage"><label>{t('Từ (m)', 'From (m)')}<input type="number" min={0} max={length} step="any" disabled={disabled} value={entry.fromM} onChange={e => link(road.id, { fromM: Number(e.target.value) })}/></label><label>{t('Đến (m)', 'To (m)')}<input type="number" min={0} max={length} step="any" disabled={disabled} value={entry.toM} onChange={e => link(road.id, { toM: Number(e.target.value) })}/></label></div><p className="geodata-hint">{t('Tính từ đầu đoạn đường', 'Measured from the start of this road section')} · 0–{Math.floor(length)} m</p></>}
          {onRoad && <button type="button" className="text-button" onClick={() => {if(save())onRoad(road.id);}}>{t('Lưu vùng và mở đoạn đường', 'Save area and open road section')}</button>}
        </>}
      </div>; })}
      {draft.roadLinks.filter(l => !roads.some(r => r.id === l.roadId)).map(l => <p className="field-error" key={l.roadId}>{l.roadId} <button type="button" className="text-button" onClick={() => update({ roadLinks: draft.roadLinks.filter(v => v !== l) })}>{t('Bỏ liên kết không còn trong mạng đường', 'Remove missing road link')}</button></p>)}
    </details>
    {error && <p role="alert" className="field-error">{error}</p>}
    {saved && <p role="status" className="geodata-hint">{t('Đã lưu vào bản nháp GIS.', 'Saved to the GIS draft.')}</p>}
    <button className="button primary" disabled={disabled}>{t('Lưu vùng vào bản nháp', 'Save area to draft')}</button>
  </form>;
}
