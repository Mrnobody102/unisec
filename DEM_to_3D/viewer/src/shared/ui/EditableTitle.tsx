import { useRef, useState } from 'react';
import type { Locale } from '../../types/dear';
import { UiIcon } from './UiIcon';
import './editable-title.css';

/** Panel heading that managers can rename in place. Without `onRename` it is a plain heading. */
export function EditableTitle({
  id,
  title,
  names,
  bilingual = true,
  headingLevel = 1,
  locale,
  onRename
}: {
  id: string;
  title: string;
  /** Current [Vietnamese, English] names used to prefill the form. */
  names: [string, string];
  bilingual?: boolean;
  headingLevel?: 1 | 2;
  locale: Locale;
  onRename?: (names: [string, string]) => boolean;
}): JSX.Element {
  const renameButton = useRef<HTMLButtonElement>(null);
  const finish = () => {
    setEditing(false);
    requestAnimationFrame(() =>
      renameButton.current?.focus({ preventScroll: true })
    );
  };
  const Heading = headingLevel === 2 ? 'h2' : 'h1';
  const t = (vi: string, en: string) => (locale === 'vi' ? vi : en);
  const [editing, setEditing] = useState(false),
    [vi, setVi] = useState(names[0]),
    [en, setEn] = useState(names[1]),
    [failed, setFailed] = useState(false);
  if (!editing)
    return (
      <div className="editable-title">
        <Heading id={id}>{title}</Heading>
        {onRename && (
          <button
            ref={renameButton}
            className="icon-button"
            aria-label={t('Đổi tên', 'Rename')}
            title={t('Đổi tên', 'Rename')}
            onClick={() => {
              setVi(names[0]);
              setEn(names[1]);
              setFailed(false);
              setEditing(true);
            }}
          >
            <UiIcon name="edit" size={16} />
          </button>
        )}
      </div>
    );
  return (
    <form
      className="editable-title-form"
      aria-labelledby={id}
      onSubmit={(event) => {
        event.preventDefault();
        const next: [string, string] = [
          vi.trim(),
          (bilingual ? en : vi).trim() || vi.trim()
        ];
        if (!next[0]) return;
        if (onRename?.(next)) finish();
        else setFailed(true);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          finish();
        }
      }}
    >
      <Heading id={id} className="visually-hidden">
        {title}
      </Heading>
      <label>
        {bilingual ? t('Tên tiếng Việt', 'Vietnamese name') : t('Tên', 'Name')}
        <input
          autoFocus
          required
          maxLength={160}
          value={vi}
          onChange={(event) => setVi(event.target.value)}
        />
      </label>
      {bilingual && (
        <label>
          {t('Tên tiếng Anh', 'English name')}
          <input
            maxLength={160}
            value={en}
            onChange={(event) => setEn(event.target.value)}
          />
        </label>
      )}
      {failed && (
        <p role="alert">
          {t('Không lưu được tên.', 'Could not save the name.')}
        </p>
      )}
      <div className="editable-title-actions">
        <button type="submit" className="button primary">
          {t('Lưu', 'Save')}
        </button>
        <button type="button" className="button" onClick={finish}>
          {t('Hủy', 'Cancel')}
        </button>
      </div>
    </form>
  );
}
