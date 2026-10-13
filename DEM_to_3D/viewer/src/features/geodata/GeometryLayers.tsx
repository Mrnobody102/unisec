import { useState } from 'react';
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
  const [bulk, setBulk] = useState(false),
    [checked, setChecked] = useState<string[]>([]),
    [confirmDelete, setConfirmDelete] = useState(false),
    [source, setSource] = useState('');
  const filtered = records.filter(
    (r) =>
      !fieldAreaOwner(r, records) &&
      (!source || r.source.name === source) &&
      r.name.toLocaleLowerCase().includes(query.toLocaleLowerCase())
  );
  return (
    <section className="geodata-section geodata-layers">
      <h2>
        {t('Đối tượng', 'Features')}
        <span>{records.filter((r) => !fieldAreaOwner(r, records)).length}</span>
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
                  onClick={() => setConfirmDelete(true)}
                >
                  <UiIcon name="trash" />
                  {t('Xóa', 'Delete')}
                </button>
              </div>
              {confirmDelete && (
                <div
                  className="geodata-bulk-confirm"
                  role="group"
                  aria-label={t('Xác nhận xóa', 'Confirm deletion')}
                >
                  <p>
                    {t(
                      'Xóa các mục đã chọn cùng ảnh và vùng liên quan?',
                      'Delete selected items, including their photos and linked areas?'
                    )}
                  </p>
                  <div className="geodata-actions">
                    <button
                      className="button"
                      onClick={() => {
                        if (onBatch(checked, 'delete')) {
                          setChecked([]);
                          setConfirmDelete(false);
                        }
                      }}
                    >
                      {t('Xóa mục đã chọn', 'Delete selected')}
                    </button>
                    <button
                      className="button"
                      onClick={() => setConfirmDelete(false)}
                    >
                      {t('Hủy', 'Cancel')}
                    </button>
                  </div>
                </div>
              )}
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
