import { useId, useRef, type ReactNode } from 'react';
import type { Locale } from '../../types/dear';
import { useNativeDialog } from '../../shared/hooks/useNativeDialog';
import { UiIcon } from '../../shared/ui/UiIcon';

/** Short data-entry tasks leave the layer list in place and restore their trigger. */
export function GeometryInputDialog({
  title,
  locale,
  onClose,
  children
}: {
  title: string;
  locale: Locale;
  onClose: () => void;
  children: ReactNode;
}): JSX.Element {
  const ref = useRef<HTMLDialogElement>(null),
    id = useId();
  useNativeDialog(ref);
  return (
    <dialog
      ref={ref}
      className="geometry-input-dialog"
      aria-labelledby={id}
      onCancel={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <header>
        <h2 id={id}>{title}</h2>
        <button
          type="button"
          className="icon-button"
          aria-label={locale === 'vi' ? 'Đóng biểu mẫu' : 'Close form'}
          onClick={onClose}
        >
          <UiIcon name="close" />
        </button>
      </header>
      <div className="geometry-input-body">{children}</div>
    </dialog>
  );
}
