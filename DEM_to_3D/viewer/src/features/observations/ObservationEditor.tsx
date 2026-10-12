import { useEffect, useRef, useState } from 'react';
import type { GeometryRecord } from '../../geo/vector/types';
import type { Locale } from '../../types/dear';
import {
  observationOf,
  observationKinds,
  photoLimits,
  type FieldObservation,
  type FieldPhoto,
  type ObservationKind
} from './model';
import { observationLabel } from './labels';
import { readFieldPhoto } from './photo';
import { PhotoGallery } from './PhotoGallery';

export function ObservationEditor({
  record,
  locale,
  onSave,
  onResponse,
  disabled = false
}: {
  record: GeometryRecord;
  locale: Locale;
  disabled?: boolean;
  onSave: (value: FieldObservation) => boolean;
  onResponse?: () => void;
}): JSX.Element {
  const t = (vi: string, en: string) => (locale === 'vi' ? vi : en);
  const current = observationOf(record);
  const [editing, setEditing] = useState(false),
    [kind, setKind] = useState<ObservationKind>(
      current?.kind ?? 'suspected-landslide'
    );
  const [note, setNote] = useState(current?.note ?? ''),
    [observer, setObserver] = useState(current?.observer ?? '');
  const initialDate = current?.observedAt ? new Date(current.observedAt) : null;
  const [observed, setObserved] = useState(
    initialDate
      ? new Date(
          initialDate.getTime() - initialDate.getTimezoneOffset() * 60_000
        )
          .toISOString()
          .slice(0, 16)
      : ''
  );
  const [accuracy, setAccuracy] = useState(
    current?.accuracyM == null ? '' : String(current.accuracyM)
  );
  const [photos, setPhotos] = useState<FieldPhoto[]>(current?.photos ?? []),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const alive = useRef(true),
    guard = useRef(false);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  async function attach(files: File[]) {
    if (guard.current || disabled) return;
    if (photos.length + files.length > photoLimits.count) {
      setError(t('Tối đa 3 ảnh cho một điểm.', 'Up to 3 photos per point.'));
      return;
    }
    guard.current = true;
    setBusy(true);
    setError('');
    try {
      const additions: FieldPhoto[] = [];
      for (const file of files) additions.push(await readFieldPhoto(file));
      if (alive.current) setPhotos((previous) => [...previous, ...additions]);
    } catch {
      if (alive.current)
        setError(
          t(
            'Không đọc được ảnh. Chọn JPEG, PNG hoặc WebP, tối đa 8 MB và 40 megapixel.',
            'Could not read photo. Choose JPEG, PNG or WebP up to 8 MB and 40 megapixels.'
          )
        );
    } finally {
      guard.current = false;
      if (alive.current) setBusy(false);
    }
  }
  return (
    <section
      className="field-observation"
      aria-label={t('Ghi nhận thực địa', 'Field observation')}
    >
      <header>
        <h3>{t('Ghi nhận thực địa', 'Field observation')}</h3>
        {(current || editing) && (
          <span className="field-status">
            {t('Chưa xác minh', 'Unreviewed')}
          </span>
        )}
      </header>
      {!editing && current ? (
        <>
          <strong>{observationLabel(current.kind, locale)}</strong>
          <p className="field-note">{current.note}</p>
          <dl className="field-metadata">
            <div>
              <dt>{t('Ghi nhận lúc', 'Observed at')}</dt>
              <dd>
                {current.observedAt
                  ? new Date(current.observedAt).toLocaleString(
                      locale === 'vi' ? 'vi-VN' : 'en-GB'
                    )
                  : t('Chưa ghi nhận', 'Not recorded')}
              </dd>
            </div>
            <div>
              <dt>{t('Người ghi nhận', 'Observer')}</dt>
              <dd>{current.observer || t('Chưa ghi nhận', 'Not recorded')}</dd>
            </div>
            <div>
              <dt>{t('Sai số vị trí', 'Location accuracy')}</dt>
              <dd>
                {current.accuracyM == null
                  ? t('Chưa có thông tin', 'Not available')
                  : `${current.accuracyM} m`}
              </dd>
            </div>
          </dl>
          <PhotoGallery photos={current.photos} locale={locale} />
          <div className="geodata-actions">
            <button
              className="button"
              disabled={disabled}
              onClick={() => setEditing(true)}
            >
              {t('Sửa ghi nhận', 'Edit observation')}
            </button>
            {onResponse && (
              <button className="button" onClick={onResponse}>
                {t('Xem trên bản đồ ứng phó', 'View on response map')}
              </button>
            )}
          </div>
        </>
      ) : !editing ? (
        <button
          className="button"
          disabled={disabled}
          onClick={() => setEditing(true)}
        >
          {t('Thêm ghi nhận thực địa', 'Add field observation')}
        </button>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (busy || disabled) return;
            const date = observed ? new Date(observed) : null;
            if (date && !Number.isFinite(date.getTime())) {
              setError(
                t('Thời gian không hợp lệ.', 'Invalid observation time.')
              );
              return;
            }
            const value: FieldObservation = {
              schema: 'field-observation/v1',
              kind,
              note: note.trim(),
              observer: observer.trim(),
              observedAt: date?.toISOString() ?? '',
              accuracyM: accuracy === '' ? null : Number(accuracy),
              status: 'unreviewed',
              photos,
              updatedAt: new Date().toISOString()
            };
            if (onSave(value)) {
              setEditing(false);
              setError('');
            } else
              setError(
                t(
                  'Chưa lưu được. Kiểm tra dung lượng lưu trữ hoặc giảm số ảnh.',
                  'Could not save. Check local storage capacity or remove a photo.'
                )
              );
          }}
        >
          <fieldset disabled={busy || disabled}>
            <label className="geodata-field">
              {t('Loại ghi nhận', 'Observation type')}
              <select
                aria-label={t('Loại ghi nhận', 'Observation type')}
                value={kind}
                onChange={(e) => setKind(e.target.value as ObservationKind)}
              >
                {observationKinds.map((value) => (
                  <option value={value} key={value}>
                    {observationLabel(value, locale)}
                  </option>
                ))}
              </select>
            </label>
            <label className="geodata-field">
              {t('Ghi chú hiện trường', 'Field note')}
              <textarea
                aria-label={t('Ghi chú hiện trường', 'Field note')}
                maxLength={2000}
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </label>
            <label className="geodata-field">
              {t(
                'Thời gian ghi nhận (giờ máy)',
                'Observation time (device time)'
              )}
              <input
                type="datetime-local"
                value={observed}
                onChange={(e) => setObserved(e.target.value)}
              />
            </label>
            <label className="geodata-field">
              {t('Người ghi nhận', 'Observer')}
              <input
                maxLength={160}
                value={observer}
                onChange={(e) => setObserver(e.target.value)}
              />
            </label>
            <label className="geodata-field">
              {t('Sai số vị trí (m)', 'Location accuracy (m)')}
              <input
                type="number"
                min={0}
                step="any"
                value={accuracy}
                onChange={(e) => setAccuracy(e.target.value)}
              />
            </label>
            <label className="field-photo-picker">
              {t('Thêm ảnh hiện trường', 'Attach field photo')}
              <input
                aria-label={t('Ảnh hiện trường', 'Field photos')}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  e.target.value = '';
                  void attach(files);
                }}
              />
            </label>
            <PhotoGallery
              photos={photos}
              locale={locale}
              onRemove={(id) =>
                setPhotos((value) => value.filter((p) => p.id !== id))
              }
            />
          </fieldset>
          {busy && <p role="status">{t('Đang đọc ảnh…', 'Reading photos…')}</p>}
          {error && (
            <p className="field-error" role="alert">
              {error}
            </p>
          )}
          <p className="field-hint">
            {t(
              'Lưu bản xem trước và thông số ảnh tại trình duyệt. Giữ tệp gốc để phân tích.',
              'Photo previews and metadata are stored in this browser. Keep originals for analysis.'
            )}
          </p>
          <div className="geodata-actions">
            <button
              className="button primary"
              type="submit"
              disabled={busy || disabled}
            >
              {t('Lưu ghi nhận', 'Save observation')}
            </button>
            <button
              type="button"
              className="button"
              disabled={busy || disabled}
              onClick={() => {
                setKind(current?.kind ?? 'suspected-landslide');
                setNote(current?.note ?? '');
                setObserver(current?.observer ?? '');
                setAccuracy(
                  current?.accuracyM == null ? '' : String(current.accuracyM)
                );
                setPhotos(current?.photos ?? []);
                setObserved(
                  initialDate
                    ? new Date(
                        initialDate.getTime() -
                          initialDate.getTimezoneOffset() * 60_000
                      )
                        .toISOString()
                        .slice(0, 16)
                    : ''
                );
                setEditing(false);
                setError('');
              }}
            >
              {t('Hủy', 'Cancel')}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
