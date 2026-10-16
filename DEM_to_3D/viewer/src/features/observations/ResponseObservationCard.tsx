import { reportReviewLabel } from '../access/reportReviewLabel';
import { landslideAreaOf } from '../landslides/landslideAreas';
import { LandslideAreaSummary } from '../landslides/LandslideAreaSummary';
import type { RoadSegment } from '../../types/dear';
import { observationTimeLabel } from './captureMetadata';
import type { GeometryRecord } from '../../geo/vector/types';
import type { Locale } from '../../types/dear';
import { UiIcon } from '../../shared/ui/UiIcon';
import { observationOf } from './model';
import { observationLabel } from './labels';
import { VoicePlayback } from './VoicePlayback';
import { submissionLocationLabel } from '../access/submissions';
import { PhotoGallery } from './PhotoGallery';
export function ResponseObservationCard({
  record,
  locale,
  onClose,
  onEdit,
  onBack,
  roads = [], onRoad
}: {
  record: GeometryRecord;
  locale: Locale;
  onClose: () => void;
  onEdit: () => void;
  /** Returns to the point group this record was opened from. */
  onBack?: () => void;
  roads?: RoadSegment[];
  onRoad?: (id: string) => void;
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
      aria-label={landslideAreaOf(record) ? t('Vùng sạt lở', 'Landslide area') : t('Điểm dữ liệu GIS', 'GIS data point')}
    >
      <header>
        {onBack && (
          <button
            className="icon-button"
            aria-label={t('Quay lại nhóm điểm', 'Back to point group')}
            title={t('Quay lại nhóm điểm', 'Back to point group')}
            onClick={onBack}
          >
            <UiIcon name="back" />
          </button>
        )}
        <h2>{record.name}</h2>
        <button
          className="icon-button"
          aria-label={t('Đóng điểm GIS', 'Close GIS point')}
          onClick={onClose}
        >
          <UiIcon name="close" />
        </button>
      </header>
      {landslideAreaOf(record) && <LandslideAreaSummary record={record} roads={roads} locale={locale} onRoad={onRoad}/>}
      {observation && (
        <>
          <div className="field-record-heading">
            <strong>{observationLabel(observation.kind, locale)}</strong>
            <span className="field-status">
              {reportReviewLabel(record, locale)}
            </span>
          </div>
          {observation.note&&<p className="field-note">{observation.note}</p>}
          <VoicePlayback voice={observation.voice} locale={locale}/>
          {submissionLocationLabel(record,locale)&&<p className="field-hint">{submissionLocationLabel(record,locale)}</p>}
        </>
      )}
      {!landslideAreaOf(record) && <dl className="field-metadata">
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
        {observation &&
          (observation.observedAt || observation.observedLocalTime) && (
            <div>
              <dt>{t('Ghi nhận lúc', 'Observed at')}</dt>
              <dd>{observationTimeLabel(observation, locale)}</dd>
            </div>
          )}
      </dl>}
      {observation && (
        <PhotoGallery photos={observation.photos} locale={locale} />
      )}
      <button className="button" onClick={onEdit}>
        {t('Mở hồ sơ trong GIS', 'Open GIS record')}
      </button>
    </section>
  );
}
