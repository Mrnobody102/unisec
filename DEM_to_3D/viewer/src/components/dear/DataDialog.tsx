import type { Locale } from '../../types/dear';
import { cheTaoIncident } from '../../data/cheTaoScenario';
import { UiIcon } from './UiIcon';
import type { ScenarioManifest } from '../../data/scenarioManifest';
import type { TerrainMetadata } from '../../types/terrain';
import { localClock, sourceObservedAt } from '../../features/incident/sourceTime';

type Props = {
  locale: Locale;
  updated: boolean;
  manifest: ScenarioManifest | null;
  terrainMetadata?: TerrainMetadata;
  onClose: () => void;
};

export function DataDialog({ locale, updated, manifest, terrainMetadata, onClose }: Props): JSX.Element {
  const t = (vi: string, en: string) => locale === 'en' ? en : vi;
  return <div className="modal-overlay" onClick={onClose}>
    <section className="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="data-title" onClick={event => event.stopPropagation()}>
      <div className="modal-head">
        <h2 id="data-title">{t('Nguồn và thời điểm dữ liệu', 'Data sources and timestamps')}</h2>
        <button className="icon-button" onClick={onClose} aria-label={t('Đóng', 'Close')}><UiIcon name="close" /></button>
      </div>
      <div className="modal-body">
        <div className="data-snapshot">
          <span>{t('Thời điểm tổng hợp', 'Snapshot')}</span>
          <strong>{updated ? '09:45' : '09:31'}, 29/09/2026 (UTC+7)</strong>
        </div>
        {manifest && <div className="data-snapshot">
          <span>{t('Phiên bản dữ liệu', 'Dataset version')}</span>
          <strong>{manifest.datasetVersion}</strong>
        </div>}
        {manifest?.dataKind === 'synthetic' && <p className="data-context data-review-status">
          {t('Bộ dữ liệu mô phỏng cho phiên trình diễn.', 'Simulated dataset for this demonstration.')}
        </p>}
        {manifest?.dataKind === 'synthetic' && <p className="data-context">
          {t('NR-18, PR-7 và T-5 là mã đường trong kịch bản, chưa xác nhận là số hiệu ngoài thực địa.', 'NR-18, PR-7 and T-5 are scenario road codes, not verified real-world route numbers.')}
        </p>}
        <h3 className="data-section-title">{t('Nguồn dữ liệu', 'Data sources')}</h3>
        <div className="data-source-list">
          {cheTaoIncident.sources.map(source => <div className="data-source-row" key={source.id}>
            <div><strong>{t(source.name[0], source.name[1])}</strong><small>{t(source.note[0], source.note[1])}</small></div>
            <time dateTime={sourceObservedAt(source, updated)}>{localClock(sourceObservedAt(source, updated))}</time>
          </div>)}
        </div>
        <h3 className="data-section-title">{t('Mô hình địa hình', 'Terrain model')}</h3>
        <p className="data-context">{manifest
          ? t('Lưới độ cao của mô hình Chế Tạo: EPSG:32648, bước lưới khoảng 28,8 m. Metadata ghi ảnh nền Sentinel-2. Chưa ghi nguồn gốc của DEM.', 'Chế Tạo elevation grid: EPSG:32648, approximately 28.8 m cell spacing. Metadata records Sentinel-2 imagery. DEM provenance is not recorded.')
          : terrainMetadata
          ? `${t('Mô hình được tải lên', 'Uploaded model')}: ${terrainMetadata.crs.authority}:${terrainMetadata.crs.code}.`
          : t('Chưa có metadata của mô hình địa hình.', 'Terrain model metadata is unavailable.')}</p>
      </div>
    </section>
  </div>;
}
