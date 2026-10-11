import { GEOMETRY_LIMITS as limits } from '../../geo/vector/limits';
import { useRef, useState } from 'react';
import type { ImportRole } from './geometrySession';
import type { Locale } from '../../types/dear';
import { UiIcon } from '../../shared/ui/UiIcon';
import { DisclosureTrigger } from '../../shared/ui/DisclosureTrigger';
import { roleLabel } from './geometryPresentation';

type Props = {
  locale: Locale;
  busy: boolean;
  disabled: boolean;
  count: number;
  onFiles: (files: File[], role: ImportRole) => Promise<boolean>;
  onText: (text: string, role: ImportRole) => boolean;
};

export function GeometryImport({
  locale,
  busy,
  disabled,
  count,
  onFiles,
  onText
}: Props): JSX.Element {
  const t = (vi: string, en: string) => (locale === 'vi' ? vi : en);
  const input = useRef<HTMLInputElement>(null);
  const [role, setRole] = useState<ImportRole>('auto'),
    [paste, setPaste] = useState(false),
    [text, setText] = useState('');
  const [expanded, setExpanded] = useState(!count);
  return (
    <section className="geodata-section geodata-import">
      <h2>
        <DisclosureTrigger
          className="geodata-section-toggle"
          onClick={() => setExpanded((value) => !value)}
          expanded={expanded}
          aria-controls="geodata-import-fields"
        >
          {t('Nhập dữ liệu', 'Import data')}
        </DisclosureTrigger>
      </h2>
      <div id="geodata-import-fields" hidden={!expanded}>
        <label className="geodata-field">
          {t('Sử dụng làm', 'Use as')}
          <select
            value={role}
            disabled={disabled || busy}
            onChange={(event) => setRole(event.target.value as ImportRole)}
          >
            <option value="auto">{t('Theo tệp', 'From file')}</option>
            {(['reference', 'aoi', 'footprint'] as const).map((role) => (
              <option key={role} value={role}>
                {roleLabel(role, locale)}
              </option>
            ))}
          </select>
        </label>
        <div className="geodata-actions">
          <button
            className="button primary"
            disabled={busy || disabled}
            onClick={() => input.current?.click()}
          >
            <UiIcon name="plus" />
            {busy ? t('Đang đọc…', 'Reading…') : t('Chọn tệp', 'Choose files')}
          </button>
          <button
            className="button"
            disabled={busy || disabled}
            onClick={() => setPaste((value) => !value)}
            aria-expanded={paste}
          >
            {t('Dán tọa độ / WKT', 'Paste coordinates / WKT')}
          </button>
        </div>
        <input
          ref={input}
          type="file"
          aria-label={t('Tệp dữ liệu GIS', 'GIS data files')}
          accept=".kml,.geojson,.json,.wkt,.txt"
          multiple
          hidden
          onChange={async (event) => {
            const files = [...(event.target.files ?? [])];
            event.target.value = '';
            if (files.length && (await onFiles(files, role))) setExpanded(false);
          }}
        />
        {paste && (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (onText(text, role)) {
                setText('');
                setPaste(false);
                setExpanded(false);
              }
            }}
          >
            <label className="geodata-field">
              {t('Nội dung', 'Input')}
              <textarea
                aria-label={t('Tọa độ, WKT hoặc GeoJSON', 'Coordinates, WKT or GeoJSON')}
                value={text}
                disabled={disabled || busy}
                rows={5}
                placeholder={
                  '21°45\'26.80"N 104°02\'48.44"E\n21.782919° N, 104.053554° E'
                }
                onChange={(event) => setText(event.target.value)}
              />
            </label>
            <p className="geodata-hint">
              {t('WGS84 · Điểm: DD hoặc DMS, mỗi dòng một điểm. WKT/GeoJSON: kinh độ, vĩ độ.', 'WGS84 · Points: DD or DMS, one point per line. WKT/GeoJSON: longitude, latitude.')}
            </p>
            <button
              className="button primary"
              disabled={!text.trim() || busy || disabled}
              type="submit"
            >
              {t('Nhập', 'Import')}
            </button>
          </form>
        )}
        <p className="geodata-hint">
          KML · GeoJSON · WKT · UTF-8 · {limits.inputBytes / 1_000_000} MB/{t('tệp', 'file')}
          <br />
          {t(`Tối đa ${limits.filesPerBatch} tệp/lần · ${limits.batchBytes / 1_000_000} MB/lần · ${limits.features.toLocaleString('vi-VN')} đối tượng/phiên`, `Up to ${limits.filesPerBatch} files/batch · ${limits.batchBytes / 1_000_000} MB/batch · ${limits.features.toLocaleString('en-US')} features/workspace`)}
        </p>
      </div>
    </section>
  );
}
