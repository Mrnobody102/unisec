import { useNativeDialog } from '../../shared/hooks/useNativeDialog';
import { useRef } from 'react';
import type { FieldPhoto } from './model';
import type { Locale } from '../../types/dear';
import { UiIcon } from '../../shared/ui/UiIcon';
export function PhotoPreview({
  photo,
  locale,
  onClose
}: {
  photo: FieldPhoto;
  locale: Locale;
  onClose: () => void;
}): JSX.Element {
  const ref = useRef<HTMLDialogElement>(null);
  useNativeDialog(ref);
  return (
    <dialog
      ref={ref}
      className="field-photo-preview"
      aria-label={photo.name}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <header>
        <h2>{photo.name}</h2>
        <button
          type="button"
          className="icon-button"
          aria-label={locale === 'vi' ? 'Đóng ảnh' : 'Close photo'}
          onClick={onClose}
        >
          <UiIcon name="close" />
        </button>
      </header>
      <img src={photo.preview} alt={photo.name} />
      <p>
        {locale === 'vi'
          ? 'Bản xem trước ảnh hiện trường'
          : 'Field photo preview'}
      </p>
    </dialog>
  );
}
