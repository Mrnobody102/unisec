import { useLayoutEffect, useRef, type RefObject } from 'react';

/** Keep each list/detail position when the sidebar changes its content. */
export function usePanelScroll(root: RefObject<HTMLElement>, screenKey: string): void {
  const positions = useRef(new Map<string, number>());

  useLayoutEffect(() => {
    const panel = root.current;
    const scrollArea = panel?.querySelector<HTMLElement>('.sidebar-scroll');
    if (!panel || !scrollArea) return;
    scrollArea.scrollTop = positions.current.get(screenKey) ?? 0;
    const remember = () => positions.current.set(screenKey, scrollArea.scrollTop);
    scrollArea.addEventListener('scroll', remember, { passive: true });
    // Record before a click replaces the list and the browser clamps its scroll.
    panel.addEventListener('click', remember, true);
    return () => {
      scrollArea.removeEventListener('scroll', remember);
      panel.removeEventListener('click', remember, true);
    };
  }, [root, screenKey]);
}
