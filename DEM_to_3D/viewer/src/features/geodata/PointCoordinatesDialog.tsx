import { useState } from 'react';
import type { Locale } from '../../types/dear';
import type { GeometryRecord } from '../../geo/vector/types';
import { validateGeometry } from '../../geo/vector/validateGeometry';
import { GeometryInputDialog } from './GeometryInputDialog';

export function PointCoordinatesDialog({
  record,
  locale,
  onSave,
  onClose
}: {
  record: GeometryRecord;
  locale: Locale;
  onSave: (coordinates: number[]) => void;
  onClose: () => void;
}): JSX.Element | null {
  const point =
    record.feature.geometry.type === 'Point'
      ? record.feature.geometry.coordinates
      : null;
  const [longitude, setLongitude] = useState(String(point?.[0] ?? ''));
  const [latitude, setLatitude] = useState(String(point?.[1] ?? ''));
  const [error, setError] = useState('');
  const t = (vi: string, en: string) => (locale === 'vi' ? vi : en);
  if (!point) return null;
  return (
    <GeometryInputDialog
      title={t('Sửa tọa độ', 'Edit coordinates')}
      locale={locale}
      onClose={onClose}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          try {
            const geometry = validateGeometry({
              type: 'Point',
              coordinates: [
                Number(longitude),
                Number(latitude),
                ...point.slice(2)
              ]
            });
            if (geometry.type !== 'Point') return;
            onSave(geometry.coordinates);
            onClose();
          } catch {
            setError(
              t(
                'Không lưu được tọa độ. Kiểm tra vị trí và thử lại.',
                'Could not save coordinates. Check the position and retry.'
              )
            );
          }
        }}
      >
        <p className="geometry-input-feature">{record.name}</p>
        <label className="geodata-field">
          {t('Vĩ độ (°)', 'Latitude (°)')}
          <input
            required
            type="number"
            step="any"
            min={-85.05112878}
            max={85.05112878}
            value={latitude}
            onChange={(event) => setLatitude(event.target.value)}
          />
        </label>
        <label className="geodata-field">
          {t('Kinh độ (°)', 'Longitude (°)')}
          <input
            required
            type="number"
            step="any"
            min={-180}
            max={180}
            value={longitude}
            onChange={(event) => setLongitude(event.target.value)}
          />
        </label>
        {error && (
          <p role="alert" className="field-error">
            {error}
          </p>
        )}
        <div className="geodata-actions">
          <button type="submit" className="button primary">
            {t('Lưu tọa độ', 'Save coordinates')}
          </button>
          <button type="button" className="button" onClick={onClose}>
            {t('Hủy', 'Cancel')}
          </button>
        </div>
      </form>
    </GeometryInputDialog>
  );
}
