import { useState } from 'react';
import type { Locale } from '../../types/dear';
import type { GeometryRecord } from '../../geo/vector/types';
import { validateGeometry } from '../../geo/vector/validateGeometry';
import { GeometryInputDialog } from './GeometryInputDialog';
import { CoordinateFields } from './CoordinateFields';

export function PointCoordinatesDialog({
  record,
  locale,
  onSave,
  onPick,
  onClose
}: {
  record: GeometryRecord;
  locale: Locale;
  onSave: (coordinates: number[]) => boolean;
  onPick?: () => void;
  onClose: () => void;
}): JSX.Element | null {
  const point =
    record.feature.geometry.type === 'Point'
      ? record.feature.geometry.coordinates
      : null;
  const initialLon=point?.[0]?.toFixed(6) ?? '',initialLat=point?.[1]?.toFixed(6) ?? '';
  const [longitude, setLongitude] = useState(initialLon);
  const [latitude, setLatitude] = useState(initialLat);
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
                longitude === initialLon ? point[0] : Number(longitude),
                latitude === initialLat ? point[1] : Number(latitude),
                ...point.slice(2)
              ]
            });
            if (geometry.type !== 'Point') return;
            if (!onSave(geometry.coordinates)) {
              setError(t('Chưa lưu được tọa độ. Dữ liệu trên bản đồ chưa thay đổi.', 'Coordinates could not be saved. The map data has not changed.'));
              return;
            }
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
        <p className="geodata-hint">{t('Lưu tọa độ sẽ cập nhật vị trí điểm trên bản đồ GIS và bản đồ ứng phó.', 'Saving updates this point on the GIS and response maps.')}</p>
        <CoordinateFields latitude={latitude} longitude={longitude} onChange={(nextLat, nextLon) => { setLatitude(nextLat); setLongitude(nextLon); }}
          locale={locale} onPick={onPick ? () => { onClose(); onPick(); } : undefined} />
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
