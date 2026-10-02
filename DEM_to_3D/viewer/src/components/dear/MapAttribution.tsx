import type { BasemapState } from '../../terrain/regionalBasemap';
import type { Locale } from '../../types/dear';

export function MapAttribution({ locale, state, onRetry }: { locale: Locale; state: BasemapState; onRetry: () => void }): JSX.Element | null {
  const t = (vi: string, en: string) => locale === 'vi' ? vi : en;
  if (state.status === 'off') return null;
  return <>
    {(state.status === 'partial' || state.status === 'error' || state.status === 'unavailable') && <div className="basemap-status" role="status">
      {state.status === 'partial' ? t('Một phần nền chưa tải được', 'Some basemap tiles are unavailable')
        : state.status === 'unavailable' ? t('Mô hình chưa hỗ trợ nền khu vực', 'Regional basemap unavailable for this model')
        : t('Không tải được nền khu vực', 'Regional basemap unavailable')}
      {(state.status === 'error' || state.status === 'partial') && <button onClick={onRetry}>{t('Thử lại', 'Retry')}</button>}
    </div>}
    {state.loaded > 0 && <div className="map-attribution">
      {state.style === 'satellite' ? <><a href="https://cloudless.eox.at" target="_blank" rel="noreferrer">EOxCloudless</a> by EOX IT Services GmbH<br/>{t('Dữ liệu Copernicus Sentinel 2016 đã xử lý', 'Contains modified Copernicus Sentinel data 2016')} / <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a></>
        : <><a href="https://maps.eox.at" target="_blank" rel="noreferrer">Terrain Light</a> / Data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a> &amp; <a href="https://maps.eox.at/#data" target="_blank" rel="noreferrer">others</a> / Rendering © <a href="https://eox.at" target="_blank" rel="noreferrer">EOX</a></>}
    </div>}
  </>;
}
