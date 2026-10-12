import type { GeometryRecord } from '../../geo/vector/types';
import type { Locale } from '../../types/dear';
import { UiIcon } from '../../shared/ui/UiIcon';
import { observationOf } from './model';
import { observationLabel } from './labels';
import { PhotoGallery } from './PhotoGallery';
export function ResponseObservationCard({
  record,
  locale,
  onClose,
  onEdit
}: {
  record: GeometryRecord;
  locale: Locale;
  onClose: () => void;
  onEdit: () => void;
}): JSX.Element {
  const t = (vi: string, en: string) => (locale === 'vi' ? vi : en);
  const observation = observationOf(record),
    point =
      record.feature.geometry.type === 'Point'
        ? record.feature.geometry.coordinates
        : null;
  return (
    <section
      className="field-map-card"
      aria-label={t('Điểm dữ liệu GIS', 'GIS data point')}
    >
      <header>
        <h2>{record.name}</h2>
        <button
          className="icon-button"
          aria-label={t('Đóng điểm GIS', 'Close GIS point')}
          onClick={onClose}
        >
          <UiIcon name="close" />
        </button>
      </header>
      {observation && (
        <>
          <strong>{observationLabel(observation.kind, locale)}</strong>{' '}
          <span className="field-status">
            {t('Chưa xác minh', 'Unreviewed')}
          </span>
          <p className="field-note">{observation.note}</p>
        </>
      )}
      <dl className="field-metadata">
        {point && (
          <>
            <div>
              <dt>{t('Vĩ độ', 'Latitude')}</dt>
              <dd>{point[1].toFixed(6)}°</dd>
            </div>
            <div>
              <dt>{t('Kinh độ', 'Longitude')}</dt>
              <dd>{point[0].toFixed(6)}°</dd>
            </div>
          </>
        )}
        <div>
          <dt>{t('Nguồn', 'Source')}</dt>
          <dd>{record.source.name}</dd>
        </div>
        {observation?.observedAt && (
          <div>
            <dt>{t('Ghi nhận lúc', 'Observed at')}</dt>
            <dd>
              {new Date(observation.observedAt).toLocaleString(
                locale === 'vi' ? 'vi-VN' : 'en-GB'
              )}
            </dd>
          </div>
        )}
      </dl>
      {observation && (
        <PhotoGallery photos={observation.photos} locale={locale} />
      )}
      <p className="field-hint">
        {t(
          'Dữ liệu nhập, chưa đưa vào đánh giá tình huống.',
          'Imported data, not included in the incident assessment.'
        )}
      </p>
      <button className="button" onClick={onEdit}>
        {t('Mở hồ sơ trong GIS', 'Open GIS record')}
      </button>
    </section>
  );
}
