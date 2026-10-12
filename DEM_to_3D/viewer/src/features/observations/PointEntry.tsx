import { useState } from 'react';
import type { Locale } from '../../types/dear';
import { validateGeometry } from '../../geo/vector/validateGeometry';
import { createGeometryRecords } from '../geodata/geometrySession';
import type { useGeometrySession } from '../geodata/useGeometrySession';
export function PointEntry({
  locale,
  session,
  disabled = false
}: {
  locale: Locale;
  session: ReturnType<typeof useGeometrySession>;
  disabled?: boolean;
}): JSX.Element {
  const t = (vi: string, en: string) => (locale === 'vi' ? vi : en);
  const [open, setOpen] = useState(false),
    [name, setName] = useState(''),
    [lat, setLat] = useState(''),
    [lon, setLon] = useState(''),
    [error, setError] = useState('');
  return (
    <section className="geodata-section field-point-entry">
      <button
        className="button"
        disabled={disabled}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {t('Thêm điểm tọa độ', 'Add coordinate point')}
      </button>
      {open && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (disabled) return;
            try {
              const geometry = validateGeometry({
                type: 'Point',
                coordinates: [Number(lon), Number(lat)]
              });
              session.add(
                createGeometryRecords(
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
                )
              );
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
      )}
    </section>
  );
}
