import { useEffect, useRef, type RefObject } from 'react';

/** Dismiss a small non-modal surface without blocking the workspace. */
export function useDismissiblePopover(anchor: RefObject<HTMLElement>, open: boolean, onClose: () => void): void {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    const root = anchor.current;
    const surface = root?.querySelector<HTMLElement>('[data-popover]');
    const trigger = root?.querySelector<HTMLButtonElement>('[aria-expanded]');
    surface?.querySelector<HTMLElement>('button, a[href], [tabindex="0"]')?.focus();
    const pointer = (event: PointerEvent) => { if (!root?.contains(event.target as Node)) closeRef.current(); };
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && root?.contains(document.activeElement)) {
        event.preventDefault(); event.stopPropagation(); closeRef.current(); trigger?.focus();
      }
    };
    const focus = (event: FocusEvent) => { if (!root?.contains(event.target as Node)) closeRef.current(); };
    document.addEventListener('pointerdown', pointer, true);
    document.addEventListener('keydown', keyboard);
    document.addEventListener('focusin', focus);
    return () => {
      document.removeEventListener('pointerdown', pointer, true);
      document.removeEventListener('keydown', keyboard);
      document.removeEventListener('focusin', focus);
      if (surface?.contains(document.activeElement) || document.activeElement === document.body) trigger?.focus();
    };
  }, [anchor, open]);
}
