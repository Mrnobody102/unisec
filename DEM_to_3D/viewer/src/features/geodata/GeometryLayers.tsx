import { useEffect, useState } from 'react';
import { ConfirmDialog } from '../../shared/ui/ConfirmDialog';
import type { GeometryRecord } from '../../geo/vector/types';
import type { Locale } from '../../types/dear';
import { observationOf } from '../observations/model';
import { observationLabel } from '../observations/labels';
import { fieldAreaOwner } from '../observations/fieldAreas';
import { UiIcon } from '../../shared/ui/UiIcon';
import { roleLabel, roleColors } from './geometryPresentation';

type Props = {
  records: GeometryRecord[];
  selectedId: string | null;
  locale: Locale;
  disabled: boolean;
  onSelect: (id: string) => void;
  onBatch: (ids: string[], action: 'show' | 'hide' | 'delete') => boolean;
  onUpdate: (
    id: string,
    patch: Partial<Pick<GeometryRecord, 'name' | 'visible' | 'role'>>
  ) => void;
};

export function GeometryLayers({
  records,
  selectedId,
  locale,
  disabled,
  onSelect,
  onUpdate,
  onBatch
}: Props): JSX.Element {
  const t = (vi: string, en: string) => (locale === 'vi' ? vi : en);
  const [query, setQuery] = useState('');
  const [observationFilter, setObservationFilter] = useState<'all' | 'with' | 'without'>('all');
  const [bulk, setBulk] = useState(false),
    [checked, setChecked] = useState<string[]>([]),
    [confirmDelete, setConfirmDelete] = useState(false),
    [deleteFailed, setDeleteFailed] = useState(false),
    [source, setSource] = useState('');
  const filtered = records.filter(
    (r) =>
      !fieldAreaOwner(r, records) &&
      (!source || r.source.name === source) &&
      (observationFilter === 'all' ||
        (r.feature.geometry.type === 'Point' &&
          Boolean(observationOf(r)) === (observationFilter === 'with'))) &&
      r.name.toLocaleLowerCase().includes(query.toLocaleLowerCase())
  );
  const filteredKey=filtered.map(r=>r.id).join('|');
  useEffect(()=>{
    const available=new Set(filtered.map(r=>r.id));
    setChecked(ids=>{const next=ids.filter(id=>available.has(id));return next.length===ids.length?ids:next;});
    setConfirmDelete(false);
  },[filteredKey]);
  return (
    <section className="geodata-section geodata-layers">
      <h2>
        {t('Đối tượng', 'Features')}
        <span>{observationFilter === 'all' ? records.filter((r) => !fieldAreaOwner(r, records)).length : `${filtered.length} / ${records.filter((r) => !fieldAreaOwner(r, records)).length}`}</span>
      </h2>
      {!records.length && (
        <p className="geodata-empty">
          {t(
            'Nhập tệp hoặc vẽ vùng để bắt đầu.',
            'Import a file or draw an area to start.'
          )}
        </p>
      )}
      {records.length > 8 && (
        <label className="geodata-field">
          <span>{t('Tìm đối tượng', 'Find a feature')}</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      )}
      {records.some(r => r.feature.geometry.type === 'Point' && !fieldAreaOwner(r, records)) && (
        <details className="geodata-observation-filter">
          <summary>{t('Lọc điểm theo ghi nhận', 'Filter points by field notes')}</summary>
          <label className="geodata-field">
            {t('Ghi nhận thực địa', 'Field observation')}
            <select value={observationFilter} onChange={event => setObservationFilter(event.target.value as typeof observationFilter)}>
              <option value="all">{t('Tất cả đối tượng', 'All features')}</option>
              <option value="with">{t('Điểm đã có ghi nhận', 'Points with observations')}</option>
              <option value="without">{t('Điểm chưa có ghi nhận', 'Points without observations')}</option>
            </select>
          </label>
        </details>
      )}
      {records.length > 0 && (
        <div className="geodata-bulk">
          {new Set(records.map((r) => r.source.name)).size > 1 && (
            <label className="geodata-field">
              {t('Tệp nguồn', 'Source file')}
              <select
                value={source}
                onChange={(e) => {
                  setSource(e.target.value);
                  setConfirmDelete(false);
                }}
              >
                <option value="">{t('Tất cả tệp', 'All files')}</option>
                {[...new Set(records.map((r) => r.source.name))].map((name) => (
                  <option key={name}>{name}</option>
                ))}
              </select>
            </label>
          )}
          <div className="geodata-actions">
            <button
              className="text-button"
              disabled={disabled}
              onClick={() =>
                onBatch(
                  filtered.map((r) => r.id),
                  'hide'
                )
              }
            >
              {t('Ẩn tất cả', 'Hide all')}
            </button>
            <button
              className="text-button"
              disabled={disabled}
              onClick={() =>
                onBatch(
                  filtered.map((r) => r.id),
                  'show'
                )
              }
            >
              {t('Hiện tất cả', 'Show all')}
            </button>
            <button
              className="text-button"
              disabled={disabled}
              aria-pressed={bulk}
              onClick={() => {
                setBulk(!bulk);
                setChecked([]);
                setConfirmDelete(false);
              }}
            >
              {bulk ? t('Xong', 'Done') : t('Chọn nhiều', 'Select multiple')}
            </button>
          </div>
          {bulk && (
            <>
              <label className="geodata-bulk-all">
                <input
                  type="checkbox"
                  disabled={disabled}
                  checked={
                    filtered.length > 0 &&
                    filtered.every((r) => checked.includes(r.id))
                  }
                  onChange={(e) => {
                    setChecked(
                      e.target.checked ? filtered.map((r) => r.id) : []
                    );
                    setConfirmDelete(false);
                  }}
                />
                {t('Chọn tất cả', 'Select all')} ({filtered.length})
              </label>
              <div className="geodata-actions">
                <button
                  className="button"
                  disabled={disabled || !checked.length}
                  onClick={() => onBatch(checked, 'hide')}
                >
                  {t('Ẩn', 'Hide')} ({checked.length})
                </button>
                <button
                  className="button"
                  disabled={disabled || !checked.length}
                  onClick={() => onBatch(checked, 'show')}
                >
                  {t('Hiện', 'Show')}
                </button>
                <button
                  className="button"
                  disabled={disabled || !checked.length}
                  onClick={() => { setDeleteFailed(false); setConfirmDelete(true); }}
                >
                  <UiIcon name="trash" />
                  {t('Xóa', 'Delete')}
                </button>
              </div>
              {confirmDelete && <ConfirmDialog
                title={t('Xóa đối tượng đã chọn?', 'Delete selected features?')}
                locale={locale} destructive
                confirmLabel={t('Xóa mục đã chọn', 'Delete selected')}
                error={deleteFailed ? t('Chưa xóa được. Dữ liệu vẫn được giữ.', 'Could not delete. Your data is retained.') : undefined}
                onCancel={() => setConfirmDelete(false)}
                onConfirm={() => {
                  if (onBatch(checked, 'delete')) {
                    setChecked([]);
                    setConfirmDelete(false);
                  } else setDeleteFailed(true);
                }}>
                <p>{t(`Xóa ${checked.length} đối tượng cùng ảnh và vùng ảnh hưởng gắn với chúng.`, `Delete ${checked.length} features, including their photos and linked areas.`)}</p>
                <p>{t('Có thể khôi phục bằng Hoàn tác GIS.', 'You can restore them with Undo GIS.')}</p>
              </ConfirmDialog>}

            </>
          )}
        </div>
      )}
      <ul>
        {filtered.map((record) => (
          <li
            key={record.id}
            className={record.id === selectedId ? 'is-selected' : ''}
            data-geodata-id={record.id}
          >
            <input
              type="checkbox"
              disabled={disabled}
              checked={bulk ? checked.includes(record.id) : record.visible}
              aria-label={
                (bulk ? t('Chọn ', 'Select ') : t('Hiện ', 'Show ')) +
                record.name
              }
              onChange={(event) =>
                bulk
                  ? (setChecked((ids) =>
                      event.target.checked
                        ? [...ids, record.id]
                        : ids.filter((id) => id !== record.id)
                    ),
                    setConfirmDelete(false))
                  : onUpdate(record.id, { visible: event.target.checked })
              }
            />
            <button
              data-map-preview={"reference:"+record.id}
              className="geodata-feature"
              disabled={disabled}
              onClick={() => {
                onSelect(record.id);
              }}
            >
              <span
                className="geodata-symbol"
                style={{ color: roleColors[record.role] }}
              >
                <UiIcon
                  name={
                    record.feature.geometry.type === 'Point'
                      ? 'location'
                      : record.feature.geometry.type === 'LineString'
                        ? 'minus'
                        : 'area'
                  }
                  size={18}
                />
              </span>
              <span>
                <strong>{record.name}</strong>
                <small>
                  {observationOf(record)
                    ? observationLabel(observationOf(record)!.kind, locale)
                    : roleLabel(record.role, locale)}
                </small>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
