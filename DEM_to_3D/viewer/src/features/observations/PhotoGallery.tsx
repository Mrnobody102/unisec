import { photoCaptureLabel } from './captureMetadata';
import { useState } from 'react';
import { PhotoPreview } from './PhotoPreview';
import type { Locale } from '../../types/dear';
import type { FieldPhoto } from './model';
import { photoSummary, type PhotoReportContext } from './photoSummary';
import { photoMetadataLabel } from './labels';
import { observationMessages } from './locales';
import './observations.css';
export function PhotoGallery({
  photos,
  locale,
  onRemove,
  reported
}: {
  photos: FieldPhoto[];
  locale: Locale;
  onRemove?: (id: string) => void;
  reported?: PhotoReportContext;
}): JSX.Element {
  const [preview, setPreview] = useState<FieldPhoto | null>(null);
  const m = observationMessages[locale];
  return (
    <div className="field-photo-gallery">
      {photos.map((photo) => {
        const summary = photoSummary(photo, reported);
        return (
          <figure key={photo.id}>
            <button
              type="button"
              className="field-photo-open"
              aria-label={m.viewPhoto + ' ' + photo.name}
              onClick={() => setPreview(photo)}
            >
              <img src={photo.preview} alt={photo.name} loading="lazy" />
            </button>
            <figcaption>
              <strong>{photo.name}</strong>
              {!reported && (
                <span>
                  {photo.width} × {photo.height} px,{' '}
                  {(photo.bytes / 1_000_000).toFixed(2)} MB
                </span>
              )}
              {onRemove && (
                <button
                  type="button"
                  className="text-button"
                  onClick={() => onRemove(photo.id)}
                >
                  {m.removePhoto}
                </button>
              )}
            </figcaption>
            {(summary.showTime || summary.showGps || summary.showCamera) && (
              <dl className="field-metadata field-photo-summary">
                {summary.showTime && (
                  <div>
                    <dt>{m.capturedAt}</dt>
                    <dd>{photoCaptureLabel(photo, locale)}</dd>
                  </div>
                )}
                {summary.showCamera && (
                  <div>
                    <dt>{m.camera}</dt>
                    <dd>
                      {[photo.exif.Make, photo.exif.Model]
                        .filter(Boolean)
                        .join(' ')}
                    </dd>
                  </div>
                )}
                {summary.showGps && (
                  <div>
                    <dt>{m.cameraGps}</dt>
                    <dd>
                      {Number(photo.exif.latitude).toFixed(6)}°,{' '}
                      {Number(photo.exif.longitude).toFixed(6)}°
                    </dd>
                  </div>
                )}
              </dl>
            )}
            {summary.differentTime && (
              <p className="field-photo-difference">{m.differentTime}</p>
            )}
            {summary.differentLocation && (
              <p className="field-photo-difference">{m.differentLocation}</p>
            )}
            <details>
              <summary>{m.metadata}</summary>
              <dl className="field-metadata">
                <div>
                  <dt>{m.dimensions}</dt>
                  <dd>
                    {photo.width} × {photo.height} px
                  </dd>
                </div>
                <div>
                  <dt>{m.fileSize}</dt>
                  <dd>{(photo.bytes / 1_000_000).toFixed(2)} MB</dd>
                </div>
                {Object.entries(photo.exif).map(([key, value]) => (
                  <div key={key}>
                    <dt>{photoMetadataLabel(key, locale)}</dt>
                    <dd>{String(value)}</dd>
                  </div>
                ))}
                <div>
                  <dt>SHA-256</dt>
                  <dd className="field-hash">{photo.sha256}</dd>
                </div>
              </dl>
              {!Object.keys(photo.exif).length && <p>{m.noExif}</p>}
            </details>
          </figure>
        );
      })}
      {preview && (
        <PhotoPreview
          photo={preview}
          locale={locale}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  );
}
