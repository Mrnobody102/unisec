import { isSelectPickerEvent } from '../ui/selectKeyboard';
import { useEffect, useRef, type RefObject } from 'react';

export function useModalFocus(
  root: RefObject<HTMLElement>,
  modalKey: string | null,
  onClose: () => void
): void {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!modalKey) return;
    const dialog = root.current?.querySelector<HTMLElement>(
      '[aria-modal="true"]'
    );
    if (!dialog) return;
    const previous = document.activeElement as HTMLElement | null;
    const focusable = () =>
      [
        ...dialog.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], summary, [tabindex="0"]'
        )
      ].filter((element) => element.getClientRects().length > 0);
    (focusable()[0] ?? dialog).focus();

    const onKeyDown = (event: KeyboardEvent) => {
      // Let a nested native photo dialog own Escape and its focus cycle.
      if ((event.target as HTMLElement)?.closest('dialog[open]')) return;
      if (
        event.key === 'Escape' &&
        !event.defaultPrevented &&
        !isSelectPickerEvent(event)
      ) {
        event.preventDefault();
        closeRef.current();
      } else if (event.key === 'Tab') {
        const items = focusable();
        const first = items[0] ?? dialog;
        const last = items[items.length - 1] ?? dialog;
        if (
          !dialog.contains(document.activeElement) ||
          (event.shiftKey
            ? document.activeElement === first
            : document.activeElement === last)
        ) {
          event.preventDefault();
          (event.shiftKey ? last : first).focus();
        }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (previous?.isConnected) previous.focus();
    };
  }, [root, modalKey]);
}
