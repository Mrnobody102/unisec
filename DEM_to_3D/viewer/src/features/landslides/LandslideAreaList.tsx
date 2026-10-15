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
  return <section className="landslide-area-list" aria-label={t('Vùng sạt lở', 'Landslide areas')}><h2>{t('Vùng sạt lở', 'Landslide areas')}<span>{areas.length || ''}</span></h2>
    <div className="geodata-actions"><button className="button" disabled={disabled} onClick={() => onCreate('potential')}>{t('Khoanh vùng nguy cơ', 'Map potential area')}</button><button className="button" disabled={disabled} onClick={() => onCreate('occurred')}>{t('Khoanh vết sạt lở', 'Map landslide scar')}</button></div>
    {areas.length > 0 && <ul>{areas.map(record => <li key={record.id}><input type="checkbox" disabled={disabled} checked={record.visible} aria-label={t('Hiện ', 'Show ') + record.name} onChange={e => onVisible(record.id, e.target.checked)}/><button disabled={disabled} aria-pressed={selectedId === record.id} onClick={() => onSelect(record.id)}><strong>{record.name}</strong><small>{areaLabel(landslideAreaOf(record)!.state, locale)}</small></button></li>)}</ul>}
  </section>;
}
