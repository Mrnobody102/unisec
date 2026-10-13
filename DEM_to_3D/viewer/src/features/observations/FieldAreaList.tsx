import area from '@turf/area';
import type { GeometryRecord } from '../../geo/vector/types';
import type { Locale } from '../../types/dear';
import { UiIcon } from '../../shared/ui/UiIcon';
import { formatArea } from '../geodata/geometryPresentation';
import { linkedFieldAreas } from './fieldAreas';
export function FieldAreas({
  records,
  point,
  locale,
  disabled,
  onDraw,
  onEdit,
  onFit,
  onRemove
}: {
  records: GeometryRecord[];
  point: GeometryRecord;
  locale: Locale;
  disabled: boolean;
  onDraw: () => void;
  onEdit?: (id: string) => void;
  onFit: (id: string) => void;
  onRemove: (id: string) => void;
}): JSX.Element {
  const t = (vi: string, en: string) => (locale === 'vi' ? vi : en);
  const regions = linkedFieldAreas(records, point.id);
  return (
    <section
      className="field-areas"
      aria-label={t('Vùng nghi ảnh hưởng', 'Suspected affected areas')}
    >
      <h3>{t('Vùng nghi ảnh hưởng', 'Suspected affected areas')}</h3>
      <ul>
        {regions.map((record) => (
          <li key={record.id} data-field-area-id={record.id}>
            <div>
              <strong>{record.name}</strong>
              <span>{formatArea(area(record.feature), locale)}</span>
            </div>
            <div className="geodata-actions">
              <button
                className="button"
                disabled={disabled}
                onClick={() => onFit(record.id)}
              >
                {t('Xem vùng', 'Show area')}
              </button>
              {onEdit && (
                <button
                  className="icon-button"
                  disabled={disabled}
                  aria-label={t('Sửa ', 'Edit ') + record.name}
                  onClick={() => onEdit(record.id)}
                >
                  <UiIcon name="edit" />
                </button>
              )}
              <button
                className="icon-button"
                disabled={disabled}
                aria-label={t('Xóa ', 'Remove ') + record.name}
                onClick={() => onRemove(record.id)}
              >
                <UiIcon name="trash" />
              </button>
            </div>
          </li>
        ))}
      </ul>
      <button className="button" disabled={disabled} onClick={onDraw}>
        <UiIcon name="area" />
        {t('Vẽ vùng nghi ảnh hưởng', 'Draw suspected affected area')}
      </button>
    </section>
  );
}
