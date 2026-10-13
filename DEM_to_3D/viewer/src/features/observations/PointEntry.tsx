import { GeometryInputDialog } from '../geodata/GeometryInputDialog';
import { UiIcon } from '../../shared/ui/UiIcon';
import { useState } from 'react';
import type { Locale } from '../../types/dear';
import { validateGeometry } from '../../geo/vector/validateGeometry';
import { createGeometryRecords } from '../geodata/geometrySession';
import type { useGeometrySession } from '../geodata/useGeometrySession';
export function PointEntry({
  locale,
  session,
  onAdded,
  open,
  onOpenChange: setOpen,
  disabled = false
}: {
  locale: Locale;
  session: ReturnType<typeof useGeometrySession>;
  disabled?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded?: (id: string) => void;
}): JSX.Element {
  const t = (vi: string, en: string) => (locale === 'vi' ? vi : en);
  const [name, setName] = useState(''),
    [lat, setLat] = useState(''),
    [lon, setLon] = useState(''),
    [error, setError] = useState('');
  return (
    <section className="field-point-entry">
      <button
        className="button"
        disabled={disabled}
        aria-label={t('Thêm điểm tọa độ', 'Add coordinate point')}
        title={t('Thêm điểm tọa độ', 'Add coordinate point')}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <UiIcon name="location" size={16} />
        {t('Thêm điểm', 'Add point')}
      </button>
      {open && (
        <GeometryInputDialog
          title={t('Thêm điểm tọa độ', 'Add coordinate point')}
          locale={locale}
          onClose={() => setOpen(false)}
        >
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (disabled) return;
              try {
                const geometry = validateGeometry({
                  type: 'Point',
                  coordinates: [Number(lon), Number(lat)]
                });
                const additions = createGeometryRecords(
                  {
                    features: [
                      {
                        type: 'Feature',
                        geometry,
                        properties: {
                          name: name.trim() || t('Điểm thực địa', 'Field point')
                        }
                      }
                    ],
                    format: 'coordinate'
                  },
                  t('Nhập tọa độ', 'Coordinate entry'),
                  'reference'
                );
                session.add(additions);
                if (additions[0]) onAdded?.(additions[0].id);
                setOpen(false);
                setError('');
              } catch {
                setError(
                  t(
                    'Kiểm tra kinh độ, vĩ độ và giới hạn số điểm.',
                    'Check longitude, latitude and the point limit.'
                  )
                );
              }
            }}
          >
            <fieldset disabled={disabled}>
              <label className="geodata-field">
                {t('Tên điểm', 'Point name')}
                <input
                  value={name}
                  maxLength={160}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              <div className="catalog-dates">
                <label className="geodata-field">
                  {t('Vĩ độ (°)', 'Latitude (°)')}
                  <input
                    required
                    type="number"
                    min={-85.05112878}
                    max={85.05112878}
                    step="any"
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                  />
                </label>
                <label className="geodata-field">
                  {t('Kinh độ (°)', 'Longitude (°)')}
                  <input
                    required
                    type="number"
                    min={-180}
                    max={180}
                    step="any"
                    value={lon}
                    onChange={(e) => setLon(e.target.value)}
                  />
                </label>
              </div>
              {error && (
                <p role="alert" className="field-error">
                  {error}
                </p>
              )}
              <button className="button primary" type="submit">
                {t('Đánh dấu điểm', 'Mark point')}
              </button>
            </fieldset>
          </form>
        </GeometryInputDialog>
      )}
    </section>
  );
}
