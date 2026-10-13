import { useLayoutEffect, useState, type RefObject } from 'react';

type DetailLayout = { mode: 'dock' | 'pane'; fitsProfile: boolean };

/** Keep a usable map beside the detail dock, including when the list is resized. */
export function useResponseDetailLayout(
  root: RefObject<HTMLDivElement>
): DetailLayout {
  const [layout, setLayout] = useState<DetailLayout>({
    mode: 'pane',
    fitsProfile: true
  });
  useLayoutEffect(() => {
    const map = root.current?.querySelector<HTMLElement>('.map-area');
    if (!map) return;
    const update = () => {
      const styles = getComputedStyle(map);
      const reserve =
        parseFloat(styles.getPropertyValue('--response-detail-reserve')) || 408;
      const toolbar =
        parseFloat(styles.getPropertyValue('--size-workspace-toolbar')) || 48;
      const mode =
        window.innerWidth > 900 && map.clientWidth >= reserve + 360
          ? 'dock'
          : 'pane';
      const fitsProfile = map.clientHeight - toolbar - 16 - 336 >= 300;
      setLayout((previous) =>
        previous.mode === mode && previous.fitsProfile === fitsProfile
          ? previous
          : { mode, fitsProfile }
      );
    };
    const observer = new ResizeObserver(update);
    observer.observe(map);
    update();
    return () => observer.disconnect();
  }, [root]);
  return layout;
}
