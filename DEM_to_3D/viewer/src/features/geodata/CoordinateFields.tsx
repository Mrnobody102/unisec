import { useState } from 'react';
import type { Locale } from '../../types/dear';
import { parseCoordinatePair } from './coordinatePair';

export function CoordinateFields({ latitude, longitude, onChange, locale, onPick }: {
  latitude: string;
  longitude: string;
  onChange: (latitude: string, longitude: string) => void;
  locale: Locale;
  onPick?: () => void;
}): JSX.Element {
  const t = (vi: string, en: string) => locale === 'vi' ? vi : en;
  const [pasted, setPasted] = useState('');
  const [error, setError] = useState(false);
  const accept = (value: string) => {
    const point = parseCoordinatePair(value);
    if (!point) return false;
    onChange(String(point.latitude), String(point.longitude));
    setError(false);
    return true;
  };
  return <div className="coordinate-entry">
    {onPick && <button type="button" className="button coordinate-map-pick" onClick={onPick}>
      {t('Chọn trên bản đồ', 'Choose on map')}
    </button>}
    <label className="geodata-field">
      {t('Dán tọa độ WGS84', 'Paste WGS84 coordinates')}
      <input type="text" inputMode="decimal" value={pasted} placeholder="21.67150, 104.00252"
        onChange={event => {
          const value = event.target.value;
          setPasted(value);
          if (!value.trim() || accept(value)) setError(false);
        }}
        onPaste={event => {
          const value = event.clipboardData.getData('text');
          if (accept(value)) { event.preventDefault(); setPasted(value); }
        }}
        onBlur={() => setError(Boolean(pasted.trim()) && !accept(pasted))}
        aria-invalid={error}
        aria-describedby="coordinate-paste-hint"
      />
    </label>
    <p id="coordinate-paste-hint" className="geodata-hint coordinate-paste-hint">
      {t('Vĩ độ, kinh độ · độ thập phân. Cũng nhận POINT(kinh độ vĩ độ).',
        'Latitude, longitude · decimal degrees. POINT(longitude latitude) also works.')}
    </p>
    {error && <p className="field-error" role="alert">{t('Dùng hai số WGS84 hợp lệ, ngăn bằng dấu phẩy.', 'Use two valid WGS84 numbers separated by a comma.')}</p>}
    <div className="scenario-coordinate-fields">
      <label className="geodata-field">{t('Vĩ độ (°)', 'Latitude (°)')}
        <input required type="number" step="any" min={-85.05112878} max={85.05112878}
          value={latitude} onChange={event => onChange(event.target.value, longitude)} />
      </label>
      <label className="geodata-field">{t('Kinh độ (°)', 'Longitude (°)')}
        <input required type="number" step="any" min={-180} max={180}
          value={longitude} onChange={event => onChange(latitude, event.target.value)} />
      </label>
    </div>
  </div>;
}
