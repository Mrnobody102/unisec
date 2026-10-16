import { useId, useRef, type ReactNode } from 'react';
import type { Locale } from '../../types/dear';
import { useNativeDialog } from '../hooks/useNativeDialog';
import './action-feedback.css';

/** Review one explicit action; Escape and Cancel leave the data unchanged. */
export function ConfirmDialog({ title, children, confirmLabel, locale, onConfirm, onCancel, destructive = false, error }: {
  title: string;
  children: ReactNode;
  confirmLabel: string;
  locale: Locale;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
  error?: string;
}): JSX.Element {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useNativeDialog(ref);
  return <dialog ref={ref} className="confirm-dialog" aria-labelledby={id} aria-describedby={id + '-body'}
    onCancel={event => { event.preventDefault(); event.stopPropagation(); onCancel(); }}>
    <h2 id={id}>{title}</h2>
    <div id={id + '-body'} className="confirm-dialog-body">{children}</div>
    {error && <p className="field-error" role="alert">{error}</p>}
    <footer>
      <button type="button" className="button" autoFocus onClick={onCancel}>{locale === 'vi' ? 'Hủy' : 'Cancel'}</button>
      <button type="button" className={'button ' + (destructive ? 'confirm-destructive' : 'primary')} onClick={onConfirm}>{confirmLabel}</button>
    </footer>
  </dialog>;
}
