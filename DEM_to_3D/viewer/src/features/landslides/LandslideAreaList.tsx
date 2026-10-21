import { useState } from 'react';
import type { GeometryRecord } from '../../geo/vector/types';
import type { Locale } from '../../types/dear';
import { areaLabel } from './areaLabels';
import { landslideAreaOf, type LandslideArea } from './landslideAreas';
import './landslide-areas.css';
export function LandslideAreaList({ records, selectedId, locale, disabled, onCreate, onSelect, onVisible }: {
  records: GeometryRecord[]; selectedId: string | null; locale: Locale; disabled: boolean;
  onCreate: (state: LandslideArea['state']) => void; onSelect: (id: string) => void; onVisible: (id: string, visible: boolean) => void;
}): JSX.Element {
  const areas = records.filter(r => landslideAreaOf(r));
  const t = (vi: string, en: string) => locale === 'vi' ? vi : en;
  const [state, setState] = useState<'all' | LandslideArea['state']>('all');
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [unreviewed, setUnreviewed] = useState(false);
  const filtered = areas.filter(record => { const area = landslideAreaOf(record)!; return record.name.toLocaleLowerCase().includes(query.toLocaleLowerCase().trim()) && (state === 'all' || area.state === state) && (!unreviewed || area.review === 'unreviewed'); });
  const shown = expanded || query ? filtered : filtered.filter((record,index) => index < 12 || record.id === selectedId);
  return <section className="landslide-area-list" aria-label={t('Vùng sạt lở', 'Landslide areas')}><h2>{t('Vùng sạt lở', 'Landslide areas')}<span>{areas.length || ''}</span></h2>
    <div className="geodata-actions"><button className="button" disabled={disabled} onClick={() => onCreate('potential')}>{t('Khoanh vùng nguy cơ', 'Map potential area')}</button><button className="button" disabled={disabled} onClick={() => onCreate('occurred')}>{t('Khoanh vết sạt lở', 'Map landslide scar')}</button></div>
    {areas.length > 0 ? <>
      <label className="geodata-field">{t('Tìm vùng', 'Find an area')}<input type="search" value={query} onChange={event => setQuery(event.target.value)} /></label>
      <label className="geodata-field">{t('Loại vùng', 'Area type')}<select value={state} onChange={event => setState(event.target.value as typeof state)}>
        <option value="all">{t('Tất cả vùng', 'All areas')}</option><option value="potential">{t('Vùng nguy cơ', 'Potential areas')}</option><option value="occurred">{t('Vết sạt lở', 'Landslide occurrences')}</option>
      </select></label>
      <label className="landslide-check"><input type="checkbox" checked={unreviewed} onChange={event => setUnreviewed(event.target.checked)}/>{t('Chưa rà soát', 'Unreviewed')}</label>
      {!filtered.length && <p className="geodata-empty">{t('Không có vùng phù hợp.', 'No matching areas.')}</p>}
      <ul>{shown.map(record => <li key={record.id}><input type="checkbox" disabled={disabled} checked={record.visible} aria-label={t('Hiện ', 'Show ') + record.name} onChange={e => onVisible(record.id, e.target.checked)}/><button disabled={disabled} aria-pressed={selectedId === record.id} onClick={() => onSelect(record.id)}><strong>{record.name}</strong><small>{areaLabel(landslideAreaOf(record)!.state, locale)}, {areaLabel(landslideAreaOf(record)!.review, locale)}{landslideAreaOf(record)!.roadLinks.length > 0 ? `, ${landslideAreaOf(record)!.roadLinks.length} ${t('đoạn đường', 'road segments')}` : ''}</small></button></li>)}</ul>{!expanded && !query && filtered.length > shown.length && <button className="button landslide-show-more" onClick={() => setExpanded(true)}>{t('Xem tất cả', 'Show all')} ({filtered.length})</button>}</> : <p className="geodata-empty">{t('Khoanh vùng trên bản đồ, ghi căn cứ và chọn đoạn đường có thể bị ảnh hưởng.', 'Draw an area, record the evidence and link potentially affected road segments.')}</p>}
  </section>;
}
