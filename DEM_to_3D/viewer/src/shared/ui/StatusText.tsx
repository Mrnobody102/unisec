import type { ReactNode } from 'react';

type Props = {
  tone?: 'neutral' | 'critical' | 'warning' | 'selected';
  icon?: 'blocked' | 'uncertain' | 'priority';
  children: ReactNode;
};

/** Status stays readable without a colored badge or reliance on color alone. */
export function StatusText({ tone = 'neutral', icon, children }: Props): JSX.Element {
  return <span className={`status-text ${tone}`}>
    {icon && <svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {icon === 'blocked' ? <><circle cx="10" cy="10" r="7"/><path d="M6 10h8"/></>
        : icon === 'uncertain' ? <><path d="m10 3 8 14H2L10 3Z"/><path d="M10 8v4M10 14h.01"/></>
        : <><path d="M5 17V3h10l-2 3 2 3H5"/></>}
    </svg>}
    {children}
  </span>;
}
