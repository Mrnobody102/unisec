import { useNativeDialog } from '../../shared/hooks/useNativeDialog';
import { useRef } from 'react';
import type { Locale } from '../../types/dear';
import { UiIcon } from '../../shared/ui/UiIcon';
import { photoCaptureTime } from './captureMetadata';
import type { FieldPhoto } from './model';
import './observations.css';
import './point-group.css';

export type LightboxPhoto = {
  photo: FieldPhoto;
  recordId: string;
  recordName: string;
};

/** Full-size viewer that pages through every photo of a point group. */
export function PhotoLightbox({
  photos,
  index,
  locale,
  onIndex,
  onClose
}: {
  photos: LightboxPhoto[];
  index: number;
  locale: Locale;
  onIndex: (index: number) => void;
  onClose: () => void;
}): JSX.Element {
  const t = (vi: string, en: string) => (locale === 'vi' ? vi : en);
  const ref = useRef<HTMLDialogElement>(null);
  useNativeDialog(ref);
  const current = photos[Math.max(0, Math.min(index, photos.length - 1))];
  const step = (delta: number) =>
    onIndex((index + delta + photos.length) % photos.length);
  const { photo } = current;
  const captured = photo.exif.DateTimeOriginal
    ? String(photo.exif.DateTimeOriginal).replace(
        /^(\d{4}):(\d{2}):(\d{2})/,
        '$1-$2-$3'
      ) +
      (photoCaptureTime(photo)?.instant ? ' ' + String(photo.exif.OffsetTimeOriginal ?? 'UTC') : '')
    : '';
  return (
    <dialog
      ref={ref}
      className="field-photo-preview photo-lightbox"
      aria-label={photo.name}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onKeyDown={(event) => {
        if (photos.length < 2) return;
        if (event.key === 'ArrowLeft') step(-1);
        else if (event.key === 'ArrowRight') step(1);
        else return;
        event.preventDefault();
      }}
    >
      <header>
        <div>
          <h2>{current.recordName}</h2>
          <p>
            {photo.name}
            {photos.length > 1 && (
              <span className="photo-lightbox-count">
                {index + 1} / {photos.length}
              </span>
            )}
          </p>
        </div>
        <button
          type="button"
          className="icon-button"
          aria-label={t('Đóng ảnh', 'Close photo')}
          onClick={onClose}
        >
          <UiIcon name="close" />
        </button>
      </header>
      <div className="photo-lightbox-stage">
        <img src={photo.preview} alt={photo.name} />
        {photos.length > 1 && (
          <>
            <button
              type="button"
              className="photo-lightbox-nav is-prev"
              aria-label={t('Ảnh trước', 'Previous photo')}
              onClick={() => step(-1)}
            >
              <UiIcon name="back" />
            </button>
            <button
              type="button"
              className="photo-lightbox-nav is-next"
              aria-label={t('Ảnh tiếp theo', 'Next photo')}
              onClick={() => step(1)}
            >
              <UiIcon name="next" />
            </button>
          </>
        )}
      </div>
      <p>
        {captured && <span>{captured}</span>}
        <span>
          {photo.width} × {photo.height} px
        </span>
        {[photo.exif.Make, photo.exif.Model].some(Boolean) && (
          <span>
            {[photo.exif.Make, photo.exif.Model].filter(Boolean).join(' ')}
          </span>
        )}
      </p>
      {photos.length > 1 && (
        <ol
          className="photo-lightbox-strip"
          aria-label={t('Tất cả ảnh của nhóm', 'All photos in group')}
        >
          {photos.map((entry, position) => (
            <li key={entry.recordId + entry.photo.id}>
              <button
                type="button"
                aria-label={`${entry.recordName}: ${entry.photo.name}`}
                aria-current={position === index ? 'true' : undefined}
                onClick={() => onIndex(position)}
              >
                <img src={entry.photo.preview} alt="" loading="lazy" />
              </button>
            </li>
          ))}
        </ol>
      )}
    </dialog>
  );
}
