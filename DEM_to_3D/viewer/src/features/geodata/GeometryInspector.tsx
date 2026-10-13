import { PointCoordinatesDialog } from './PointCoordinatesDialog';
import { ObservationEditor } from '../observations/ObservationEditor';
import { observationOf } from '../observations/model';
import { useState } from 'react';
import area from '@turf/area';
import {
  geometryPositions,
  isPolygon,
  type GeometryRecord,
  type GeometryRole
} from '../../geo/vector/types';
import type { Locale } from '../../types/dear';
import { UiIcon } from '../../shared/ui/UiIcon';
import { DisclosureTrigger } from '../../shared/ui/DisclosureTrigger';
import { roleLabel, formatArea } from './geometryPresentation';
import { exportGeometryWkt } from './geometryExports';
import {
  kmlAltitudeMode,
  kmlAltitudeLabel,
  kmlAltitudeModeKey
} from './kmlMetadata';

import { FieldAreas } from '../observations/FieldAreaList';
import { fieldAreaOf } from '../observations/fieldAreas';
import type { FieldObservation } from '../observations/model';
type Props = {
  records: GeometryRecord[];
  selectedId: string | null;
  locale: Locale;
  disabled: boolean;
  onUpdate: (
    id: string,
    patch: Partial<Pick<GeometryRecord, 'name' | 'visible' | 'role'>>
  ) => void;
  onCoordinates?: (id: string, coordinates: number[]) => void;
  onRemove: (id: string) => void;
  onFit: (id: string) => void;
  onAnnotate?: (id: string, value: FieldObservation) => boolean;
  onResponse?: (id: string) => void;
  onDrawArea?: (id: string) => void;
  onEditArea?: (id: string) => void;
};

export function GeometryInspector({
  records,
  selectedId,
  locale,
  disabled,
  onRemove,
  onCoordinates,
  onUpdate,
  onFit,
  onAnnotate,
  onResponse,
  onDrawArea,
  onEditArea
}: Props): JSX.Element | null {
  const t = (vi: string, en: string) => (locale === 'vi' ? vi : en);
  const [editingPoint, setEditingPoint] = useState(false);
  const [metadata, setMetadata] = useState(false),
    [copied, setCopied] = useState<string | null>(null),
    [copyError, setCopyError] = useState(false);
  const selected = records.find((record) => record.id === selectedId);
  const copy = async () => {
    if (!selected) return;
    try {
      await navigator.clipboard.writeText(
        exportGeometryWkt(selected.feature.geometry)
      );
      setCopied(selected.id);
      setCopyError(false);
    } catch {
      setCopyError(true);
    }
  };
  if (!selected) return null;
  return (
    <section className="geodata-section geodata-detail" key={selected.id}>
      <h2>
        {t('Thuộc tính', 'Properties')}
        <span className="geodata-actions">
          <button
            className="icon-button"
            aria-label={t('Xem trên bản đồ', 'Fit feature')}
            title={t('Xem trên bản đồ', 'Fit feature')}
            onClick={() => onFit(selected.id)}
          >
            <UiIcon name="fit" />
          </button>
          <button
            className="icon-button"
            disabled={disabled}
            aria-label={t('Xóa ', 'Remove ') + selected.name}
            title={t('Xóa đối tượng', 'Remove feature')}
            onClick={() => onRemove(selected.id)}
          >
            <UiIcon name="trash" />
          </button>
        </span>
      </h2>
      <label className="geodata-field">
        {t('Tên', 'Name')}
        <input
          maxLength={160}
          aria-label={t('Tên đối tượng', 'Feature name')}
          value={selected.name}
          disabled={disabled}
          onChange={(event) =>
            onUpdate(selected.id, { name: event.target.value })
          }
        />
      </label>
      {isPolygon(selected.feature.geometry) && !fieldAreaOf(selected) && (
        <label className="geodata-field">
          {t('Sử dụng làm', 'Use as')}
          <select
            value={selected.role}
            disabled={disabled || !isPolygon(selected.feature.geometry)}
            aria-label={t('Vai trò đối tượng', 'Feature role')}
            onChange={(event) =>
              onUpdate(selected.id, {
                role: event.target.value as GeometryRole
              })
            }
          >
            {(['reference', 'aoi', 'footprint'] as const).map((role) => (
              <option key={role} value={role}>
                {roleLabel(role, locale)}
              </option>
            ))}
          </select>
        </label>
      )}
      <dl className="geodata-properties">
        <div>
          <dt>{t('Hình học', 'Geometry')}</dt>
          <dd>{selected.feature.geometry.type}</dd>
        </div>
        {isPolygon(selected.feature.geometry) && (
          <div>
            <dt>{t('Diện tích', 'Area')}</dt>
            <dd>≈ {formatArea(area(selected.feature), locale)}</dd>
          </div>
        )}
        {selected.feature.geometry.type === 'Point' && (
          <>
            <div>
              <dt>{t('Vĩ độ', 'Latitude')}</dt>
              <dd className="geodata-coordinate">
                {selected.feature.geometry.coordinates[1].toFixed(6)}°
              </dd>
            </div>
            <div>
              <dt>{t('Kinh độ', 'Longitude')}</dt>
              <dd className="geodata-coordinate">
                {selected.feature.geometry.coordinates[0].toFixed(6)}°
              </dd>
            </div>
          </>
        )}
      </dl>
      {selected.feature.geometry.type === 'Point' && onCoordinates && (
        <>
          <button
            className="button soft geodata-point-edit"
            disabled={disabled}
            aria-haspopup="dialog"
            onClick={() => setEditingPoint(true)}
          >
            <UiIcon name="edit" size={16} />
            {t('Sửa tọa độ', 'Edit coordinates')}
          </button>
          {editingPoint && (
            <PointCoordinatesDialog
              key={selected.id}
              record={selected}
              locale={locale}
              onClose={() => setEditingPoint(false)}
              onSave={(coordinates) => onCoordinates(selected.id, coordinates)}
            />
          )}
        </>
      )}
      {selected.feature.geometry.type === 'Point' &&
        !observationOf(selected) &&
        onResponse && (
          <button
            className="button geodata-point-edit"
            disabled={disabled}
            onClick={() => onResponse(selected.id)}
          >
            <UiIcon name="location" size={16} />
            {t('Xem trên bản đồ ứng phó', 'Show on response map')}
          </button>
        )}
      {selected.feature.geometry.type === 'Point' && onAnnotate && (
        <ObservationEditor
          key={selected.id + (observationOf(selected)?.updatedAt ?? '')}
          record={selected}
          locale={locale}
          disabled={disabled}
          onSave={(value) => onAnnotate(selected.id, value)}
          onResponse={onResponse ? () => onResponse(selected.id) : undefined}
        />
      )}
      {selected.feature.geometry.type === 'Point' && onDrawArea && (
        <FieldAreas
          records={records}
          point={selected}
          locale={locale}
          disabled={disabled}
          onDraw={() => onDrawArea(selected.id)}
          onEdit={onEditArea}
          onFit={onFit}
          onRemove={onRemove}
        />
      )}
      <div className="geodata-actions">
        <DisclosureTrigger
          expanded={metadata}
          aria-controls="geodata-metadata"
          onClick={() => setMetadata((value) => !value)}
        >
          {t('Nguồn và tọa độ', 'Source and coordinates')}
        </DisclosureTrigger>
        <button
          className="icon-button"
          aria-label={t('Sao chép WKT', 'Copy WKT')}
          title={t('Sao chép WKT', 'Copy WKT')}
          onClick={() => void copy()}
        >
          <UiIcon name="copy" />
        </button>
      </div>
      {copied === selected.id && (
        <p className="geodata-hint" role="status">
          {t('Đã sao chép WKT', 'WKT copied')}
        </p>
      )}
      {copyError && (
        <p className="geodata-hint" role="status">
          {t(
            'Không truy cập được bộ nhớ tạm. Xuất GeoJSON để lấy tọa độ.',
            'Clipboard unavailable. Export GeoJSON to get coordinates.'
          )}
        </p>
      )}
      {metadata && (
        <div id="geodata-metadata" className="geodata-metadata">
          <dl className="geodata-properties">
            <div>
              <dt>{t('Tệp / đầu vào', 'File / input')}</dt>
              <dd>{selected.source.name}</dd>
            </div>
            <div>
              <dt>{t('Định dạng', 'Format')}</dt>
              <dd>{selected.source.format}</dd>
            </div>
            <div>
              <dt>CRS</dt>
              <dd>WGS84 (OGC:CRS84)</dd>
            </div>
            {(kmlAltitudeMode(selected.feature.properties) ||
              geometryPositions(selected.feature.geometry).some(
                (point) => point.length === 3
              )) && (
              <div>
                <dt>{t('Tham chiếu Z', 'Z reference')}</dt>
                <dd>
                  {kmlAltitudeLabel(
                    kmlAltitudeMode(selected.feature.properties),
                    locale
                  )}
                </dd>
              </div>
            )}
            <div>
              <dt>{t('Đỉnh', 'Vertices')}</dt>
              <dd>{geometryPositions(selected.feature.geometry).length}</dd>
            </div>
            <div>
              <dt>{t('Thời điểm nhập', 'Imported')}</dt>
              <dd>
                {new Date(selected.source.importedAt).toLocaleString(
                  locale === 'vi' ? 'vi-VN' : 'en-GB'
                )}
              </dd>
            </div>
          </dl>
          <pre tabIndex={0}>{exportGeometryWkt(selected.feature.geometry)}</pre>
          {Object.entries(selected.feature.properties)
            .filter(
              ([key, value]) =>
                ![
                  'name',
                  kmlAltitudeModeKey,
                  'dearObservation',
                  'dearFieldArea',
                  'dearRecordId',
                  'dearSubmission'
                ].includes(key) &&
                value != null &&
                value !== ''
            )
            .map(([key, value]) => (
              <div className="geodata-input-property" key={key}>
                <strong>{key}</strong>
                <span>
                  {typeof value === 'object'
                    ? JSON.stringify(value)
                    : String(value)}
                </span>
              </div>
            ))}
        </div>
      )}
    </section>
  );
}
