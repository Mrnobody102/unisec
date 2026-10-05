import type { ChangeEvent } from 'react';

export type UploadMode = 'single' | 'merge';

type Props = {
  locale?: 'vi' | 'en';
  mode: UploadMode;
  geographicMerge: boolean;
  fileNames: string[];
  busy: boolean;
  error: string | null;
  onModeChange: (mode: UploadMode) => void;
  onGeographicMergeChange: (enabled: boolean) => void;
  onFiles: (files: File[]) => void;
  onClear: () => void;
};

export function ModelUploadPanel({ locale = 'vi', mode, geographicMerge, fileNames, busy, error, onModeChange, onGeographicMergeChange, onFiles, onClear }: Props): JSX.Element {
  const t = (vi: string, en: string) => locale === 'vi' ? vi : en;
  const handleFiles = (event: ChangeEvent<HTMLInputElement>): void => {
    onFiles(Array.from(event.target.files ?? []));
    event.target.value = '';
  };
  return <section className="upload-panel" aria-label={t('Nạp mô hình địa hình', 'Import terrain model')}>
    <div className="upload-modes" role="radiogroup" aria-label={t('Số mô hình', 'Model count')}>
      <label className={mode === 'single' ? 'upload-mode active' : 'upload-mode'}>
        <input type="radio" name="upload-mode" checked={mode === 'single'} onChange={() => onModeChange('single')} />
        <strong>{t('Một mô hình', 'Single model')}</strong>
      </label>
      <label className={mode === 'merge' ? 'upload-mode active' : 'upload-mode'}>
        <input type="radio" name="upload-mode" checked={mode === 'merge'} onChange={() => onModeChange('merge')} />
        <strong>{t('Nhiều mô hình', 'Multiple models')}</strong>
      </label>
    </div>
    {mode === 'merge' && <label className="geographic-toggle"><input type="checkbox" checked={geographicMerge} onChange={event => onGeographicMergeChange(event.target.checked)} /><span><strong>{t('Ghép theo tọa độ', 'Align by coordinates')}</strong><small>{t('Các mô hình cần cùng hệ tọa độ theo mét.', 'Models require the same coordinate system in meters.')}</small></span></label>}
    <label className="upload-dropzone">
      <strong>{busy ? t('Đang tải mô hình…', 'Loading model…') : t('Chọn tệp mô hình', 'Choose model files')}</strong>
      <input type="file" multiple accept=".glb,.gltf,.bin,.png,.jpg,.jpeg,.webp,.tif,.tiff,.terrain.json" onChange={handleFiles} disabled={busy} />
      <small>{t('GLB hoặc GLTF, kèm dữ liệu địa hình và ảnh nếu có.', 'GLB or GLTF, with terrain data and imagery when available.')}</small>
    </label>
    {fileNames.length > 0 && <div className="upload-files" aria-live="polite">{fileNames.map(name => <span key={name}>{name}</span>)}</div>}
    {fileNames.length > 0 && <button type="button" className="upload-clear" disabled={busy} onClick={onClear}>{t('Gỡ mô hình đã tải', 'Remove uploaded models')}</button>}
    {error && <div className="upload-error" role="alert">{error}</div>}
    <details className="upload-requirements">
      <summary>{t('Định dạng dữ liệu', 'Data formats')}</summary>
      <dl>
        <div><dt>{t('Hiển thị 3D', '3D display')}</dt><dd>GLB / GLTF</dd></div>
        <div><dt>{t('Tọa độ', 'Coordinates')}</dt><dd>{t('Tệp .terrain.json cùng tên mô hình', '.terrain.json with the model name')}</dd></div>
        <div><dt>{t('Phân tích độ cao', 'Elevation analysis')}</dt><dd>{t('Lưới .grid.bin theo metadata', '.grid.bin matching the metadata')}</dd></div>
        <div><dt>{t('Ảnh nền', 'Imagery')}</dt><dd>{t('GeoTIFF có tọa độ hoặc PNG/JPG/WebP cùng tên mô hình có UV', 'Georeferenced GeoTIFF or PNG/JPG/WebP matching a UV-mapped model')}</dd></div>
      </dl>
    </details>
  </section>;
}
