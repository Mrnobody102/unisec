type Name = 'plus' | 'minus' | 'close' | 'back' | 'help' | 'info' | 'expand' | 'collapse' | 'fit';

/** Shared 18 px control icons with a consistent optical center. */
export function UiIcon({ name, size = 18 }: { name: Name; size?: number }): JSX.Element {
  const paths: Record<Name, JSX.Element> = {
    plus: <path d="M12 5v14M5 12h14" />,
    minus: <path d="M5 12h14" />,
    close: <path d="M6 6l12 12M18 6 6 18" />,
    back: <path d="m14 6-6 6 6 6M8 12h12" />,
    expand: <path d="m6 9 6 6 6-6" />,
    collapse: <path d="m6 15 6-6 6 6" />,
    fit: <path d="M8 3H3v5M16 3h5v5M21 16v5h-5M8 21H3v-5" />,
    info: <><circle cx="12" cy="12" r="9"/><path d="M12 10v7M12 7h.01"/></>,
    help: <><circle cx="12" cy="12" r="9" /><path d="M9.8 9.4a2.4 2.4 0 1 1 3.4 2.2c-.9.4-1.2.9-1.2 1.9M12 17.4h.01" /></>
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{paths[name]}</svg>;
}
