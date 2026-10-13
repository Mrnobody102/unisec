import { useEffect, type RefObject } from 'react';

/** Preserve the trigger when a native dialog is removed by React. */
export function useNativeDialog(ref: RefObject<HTMLDialogElement>): void {
  useEffect(() => {
    const node = ref.current;
    const previous = document.activeElement as HTMLElement | null;
    if (node && !node.open) node.showModal();
    return () => {
      node?.close();
      if (previous?.isConnected) previous.focus();
    };
  }, [ref]);
}
