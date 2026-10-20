import { useState } from 'react';
import type { GeometryRecord } from '../../geo/vector/types';
import type { Locale } from '../../types/dear';
import { UiIcon } from '../../shared/ui/UiIcon';
import { ConfirmDialog } from '../../shared/ui/ConfirmDialog';
import { downloadBlob } from '../../shared/downloadBlob';
import { exportGeometryGeoJSON, exportGeometryKml } from './geometryExports';

type PreparedExport = { name: string; text: string; mime: string; count: number; bytes: number; format: 'geojson' | 'kml' };

export function GeometryExport({ locale, exportRecords, exportScope, onScope, disabled, onError, onNotice }: {
  locale: Locale;
  exportRecords: GeometryRecord[];
  exportScope: string;
  onScope: (scope: string) => void;
  disabled: boolean;
  onError: (error: unknown) => void;
  onNotice: (message: [string, string]) => void;
}): JSX.Element {
  const t = (vi: string, en: string) => locale === 'vi' ? vi : en;
  const [prepared, setPrepared] = useState<PreparedExport | null>(null);
  const [failed, setFailed] = useState(false);
  return <footer className="geodata-export">
    <details>
    <summary><UiIcon name="download" size={16}/>{t('Xuất dữ liệu', 'Export data')}</summary>
    <div className="geodata-export-options">
    <label className="geodata-field">
      {t('Phạm vi xuất', 'Export scope')}
      <select aria-label={t('Phạm vi xuất GIS', 'GIS export scope')} value={exportScope} onChange={event => onScope(event.target.value)}>
        <option value="all">{t('Tất cả đối tượng', 'All features')}</option>
        <option value="aoi">{t('Vùng quan tâm', 'AOI')}</option>
      </select>
    </label>
    <div className="geodata-actions">
      {(['geojson', 'kml'] as const).map(format => <button className="button" key={format} disabled={!exportRecords.length || disabled}
        onClick={() => {
          try {
            const text = format === 'geojson' ? exportGeometryGeoJSON(exportRecords) : exportGeometryKml(exportRecords);
            setFailed(false);
            setPrepared({ name: `dear-${exportScope}.${format}`, text, format, count: exportRecords.length,
              mime: format === 'geojson' ? 'application/geo+json' : 'application/vnd.google-earth.kml+xml', bytes: new Blob([text]).size });
          } catch (error) { onError(error); }
        }}>
        <UiIcon name="download" />{format === 'geojson' ? 'GeoJSON' : 'KML'}
      </button>)}
    </div>
    </div>
    </details>
    {prepared && <ConfirmDialog title={t('Xuất dữ liệu GIS', 'Export GIS data')} locale={locale}
      confirmLabel={t('Tải tệp', 'Download file')} onCancel={() => setPrepared(null)}
      error={failed ? t('Không tạo được lượt tải. Thử lại.', 'Could not start the download. Retry.') : undefined}
      onConfirm={() => {
        try {
          downloadBlob(new Blob([prepared.text], { type: prepared.mime }), prepared.name);
          onNotice([`Đã tạo tệp ${prepared.name}.`, `Created ${prepared.name}.`]);
          setPrepared(null);
        } catch { setFailed(true); }
      }}>
      <p><strong>{prepared.name}</strong></p>
      <dl>
        <div><dt>{t('Đối tượng', 'Features')}</dt><dd>{prepared.count}</dd></div>
        <div><dt>{t('Định dạng', 'Format')}</dt><dd>{prepared.format === 'geojson' ? 'GeoJSON' : 'KML'}</dd></div>
        <div><dt>{t('Dung lượng', 'Size')}</dt><dd>{new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-GB', { maximumFractionDigits: 1 }).format(prepared.bytes / 1000)} KB</dd></div>
      </dl>
      <p>{t('Tệp gồm tọa độ và thuộc tính của các đối tượng trong phạm vi đã chọn.', 'The file contains coordinates and attributes for the selected export scope.')}</p>
    </ConfirmDialog>}
  </footer>;
}
