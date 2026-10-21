import './analysis-imagery.css';
import { acquisitionLabel, type AnalysisLayer, type AnalysisSelection, type SarMode } from './analysisImagery';

type Props = { locale: 'vi' | 'en'; layers: AnalysisLayer[]; selection: AnalysisSelection; onChange: (selection: AnalysisSelection) => void };

const sarModes: Array<[SarMode, string, string]> = [['vv', 'VV', 'VV'], ['vh', 'VH', 'VH'], ['rgb', 'Tổ hợp', 'Composite']];

/** One analysis raster at a time over the basemap: switching layers is the comparison. */
export function AnalysisImageryControl({ locale, layers, selection, onChange }: Props) {
  const t = (vi: string, en: string) => locale === 'en' ? en : vi;
  const active = layers.find(layer => layer.id === selection.layer);
  const set = (patch: Partial<AnalysisSelection>) => onChange({ ...selection, ...patch });
  // The layers panel section already titles this group.
  return <fieldset className="map-layer-group analysis-imagery" aria-label={t('Ảnh phân tích', 'Analysis imagery')}>
    <label><input type="radio" name="analysis-imagery" checked={!active} onChange={() => set({ layer: null })}/>{t('Không', 'None')}</label>
    {layers.map(layer => <label key={layer.id}>
      <input type="radio" name="analysis-imagery" checked={selection.layer === layer.id} onChange={() => set({ layer: layer.id })}/>
      <span>{t(...layer.name)}<small>{acquisitionLabel(layer)}, {layer.kind === 'optical' ? layer.parts[0].pixelM : layer.pixelM} m</small></span>
    </label>)}
    {active?.kind === 'sar' && <>
      <div className="analysis-sar-modes" role="radiogroup" aria-label={t('Kênh SAR', 'SAR channel')}>
        {sarModes.map(([mode, vi, en]) => <button key={mode} type="button" role="radio" aria-checked={selection.sarMode === mode} onClick={() => set({ sarMode: mode })}>{t(vi, en)}</button>)}
      </div>
      {selection.sarMode === 'rgb'
        ? <p className="analysis-legend">R: VV, G: VH, B: VV/VH</p>
        : <p className="analysis-legend"><span>{active.rangesDb[selection.sarMode][0]} dB</span><i aria-hidden="true"/><span>{active.rangesDb[selection.sarMode][1]} dB</span></p>}
      <p className="analysis-note">{t('σ⁰ một thời điểm. Sườn quay về vệ tinh sáng hơn; vết sạt nhỏ khó thấy ở 10 m.', 'Single-date σ⁰. Slopes facing the satellite look brighter; small scars are hard to see at 10 m.')}</p>
    </>}
    {active?.kind === 'optical' && <p className="analysis-note" title={t('Ngoài vùng phủ ảnh PlanetScope là nền bản đồ khu vực.', 'Outside PlanetScope coverage, the regional basemap remains visible.')}>{active.mosaic ? t(`Ảnh ghép ${active.parts.length} dải, chi tiết gốc khoảng `, `${active.parts.length}-strip mosaic, native detail about `) : t('Chi tiết gốc khoảng ', 'Native detail about ')}{Math.max(...active.parts.map(part => part.gsdM ?? part.pixelM)).toLocaleString(locale, {maximumFractionDigits:1})} m</p>}
    {active && <label className="analysis-opacity">{t('Độ rõ', 'Opacity')}<output>{Math.round(selection.opacity * 100)}%</output>
      <input type="range" min="30" max="100" value={selection.opacity * 100} aria-label={t('Độ rõ ảnh phân tích', 'Analysis imagery opacity')} onChange={event => set({ opacity: Number(event.target.value) / 100 })}/>
    </label>}
  </fieldset>;
}
