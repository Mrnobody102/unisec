import { FileDropZone } from '../../shared/ui/FileDropZone';
import { GEOMETRY_LIMITS as limits } from '../../geo/vector/limits';
import { useState } from 'react';
import type { ImportRole } from './geometrySession';
import type { Locale } from '../../types/dear';
import { GeometryInputDialog } from './GeometryInputDialog';
import { UiIcon } from '../../shared/ui/UiIcon';
import { roleLabel } from './geometryPresentation';

type Props = {
  locale: Locale;
  busy: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  disabled: boolean;
  error?: string;
  onDismissError?: () => void;
  onFiles: (files: File[], role: ImportRole) => Promise<boolean>;
  onText: (text: string, role: ImportRole) => boolean;
};

export function GeometryImport({
  locale,
  busy,
  open: expanded,
  onOpenChange: setExpanded,
  disabled,
  error,
  onDismissError,
  onFiles,
  onText
}: Props): JSX.Element {
  const t = (vi: string, en: string) => (locale === 'vi' ? vi : en);
  const [role, setRole] = useState<ImportRole>('auto'),
    [paste, setPaste] = useState(false),
    [text, setText] = useState('');
  return (
    <section className="geodata-import">
      <button
        className="button"
        disabled={disabled || busy}
        aria-haspopup="dialog"
        aria-expanded={expanded}
        onClick={() => setExpanded(true)}
      >
        <UiIcon name="layers" size={16} />
        {t('Nhập dữ liệu', 'Import data')}
      </button>
      {expanded && (
        <GeometryInputDialog
          title={t('Nhập dữ liệu', 'Import data')}
          locale={locale}
          onClose={() => setExpanded(false)}
        >
          <div id="geodata-import-fields">
            {error && (
              <div className="geodata-input-error" role="alert">
                <p>{error}</p>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={t('Đóng lỗi nhập', 'Dismiss import error')}
                  onClick={onDismissError}
                >
                  <UiIcon name="close" />
                </button>
              </div>
            )}
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
            <FileDropZone
              multiple
              disabled={busy || disabled}
              accept=".kml,.geojson,.json,.wkt,.txt"
              title={
                busy
                  ? t('Đang đọc…', 'Reading…')
                  : t('Chọn hoặc kéo thả tệp', 'Choose or drop files')
              }
              hint="KML, GeoJSON, WKT"
              onFiles={async (files) => {
                if (await onFiles(files, role)) setExpanded(false);
              }}
            />
            <button
              className="text-button geodata-paste-toggle"
              disabled={busy || disabled}
              onClick={() => setPaste((value) => !value)}
              aria-expanded={paste}
            >
              {t('Dán tọa độ / WKT', 'Paste coordinates / WKT')}
            </button>
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
                    aria-label={t(
                      'Tọa độ, WKT hoặc GeoJSON',
                      'Coordinates, WKT or GeoJSON'
                    )}
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
                  {t(
                    'WGS84. Điểm: DD hoặc DMS, mỗi dòng một điểm. WKT/GeoJSON: kinh độ, vĩ độ.',
                    'WGS84. Points: DD or DMS, one point per line. WKT/GeoJSON: longitude, latitude.'
                  )}
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
            <dl className="geodata-import-limits">
              <dt>{t('Định dạng', 'Formats')}</dt>
              <dd>KML, GeoJSON, WKT (UTF-8)</dd>
              <dt>{t('Mỗi tệp', 'Per file')}</dt>
              <dd>{limits.inputBytes / 1_000_000} MB</dd>
              <dt>{t('Mỗi lần nhập', 'Per import')}</dt>
              <dd>
                {limits.filesPerBatch} {t('tệp', 'files')},{' '}
                {limits.batchBytes / 1_000_000} MB
              </dd>
              <dt>{t('Mỗi phiên', 'Per workspace')}</dt>
              <dd>
                {limits.features.toLocaleString(
                  locale === 'vi' ? 'vi-VN' : 'en-US'
                )}{' '}
                {t('đối tượng', 'features')}
              </dd>
            </dl>
          </div>
        </GeometryInputDialog>
      )}
    </section>
  );
}
