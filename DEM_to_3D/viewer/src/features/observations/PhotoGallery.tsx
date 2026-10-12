import type { Locale } from '../../types/dear';
import type { FieldPhoto } from './model';
import { photoMetadataLabel } from './labels';
import './observations.css';
export function PhotoGallery({
  photos,
  locale,
  onRemove
}: {
  photos: FieldPhoto[];
  locale: Locale;
  onRemove?: (id: string) => void;
}): JSX.Element {
  const t = (vi: string, en: string) => (locale === 'vi' ? vi : en);
  return (
    <div className="field-photo-gallery">
      {photos.map((photo) => (
        <figure key={photo.id}>
          <img src={photo.preview} alt={photo.name} loading="lazy" />
          <figcaption>
            <strong>{photo.name}</strong>
            <span>
              {photo.width} × {photo.height} px,{' '}
              {(photo.bytes / 1_000_000).toFixed(2)} MB
            </span>
            {onRemove && (
              <button
                type="button"
                className="text-button"
                onClick={() => onRemove(photo.id)}
              >
                {t('Bỏ ảnh', 'Remove photo')}
              </button>
            )}
          </figcaption>
          <details>
            <summary>{t('Thông số ảnh', 'Photo metadata')}</summary>
            {Object.keys(photo.exif).length ? (
              <dl className="field-metadata">
                {Object.entries(photo.exif).map(([key, value]) => (
                  <div key={key}>
                    <dt>{photoMetadataLabel(key, locale)}</dt>
                    <dd>{String(value)}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p>
                {t('Không có EXIF đọc được.', 'No readable EXIF metadata.')}
              </p>
            )}
            <p className="field-hint">
              {t(
                'GPS trong ảnh là vị trí máy ảnh, chưa chắc là vị trí hiện tượng. Giờ EXIF có thể thiếu múi giờ.',
                'Photo GPS describes the camera location, which may differ from the observed event. EXIF time may lack a time zone.'
              )}
            </p>
            <dl className="field-metadata">
              <div>
                <dt>SHA-256</dt>
                <dd className="field-hash">{photo.sha256}</dd>
              </div>
            </dl>
          </details>
        </figure>
      ))}
    </div>
  );
}
