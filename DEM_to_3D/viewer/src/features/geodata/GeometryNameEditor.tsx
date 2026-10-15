import { useState } from 'react';
import type { Locale } from '../../types/dear';

/** One explicit save/cancel flow for feature and AOI names. */
export function GeometryNameEditor({ name, label, inputLabel, locale, disabled, onSave, onNotice }: {
  name: string; label: string; inputLabel: string; locale: Locale; disabled: boolean;
  onSave: (name: string) => boolean; onNotice: (message: [string, string]) => void;
}): JSX.Element {
  const [draft, setDraft] = useState<string | null>(null);
  const value = draft ?? name;
  const dirty = value !== name;
  const t = (vi: string, en: string) => locale === 'vi' ? vi : en;
  return <form aria-label={t('Sửa tên', 'Edit name')}
    onSubmit={event => {
      event.preventDefault();
      const next = value.trim();
      if (next && onSave(next)) {
        setDraft(null);
        onNotice(['Đã lưu tên đối tượng.', 'Feature name saved.']);
      }
    }}
    onKeyDown={event => {
      if (event.key === 'Escape' && dirty) {
        event.preventDefault(); event.stopPropagation(); setDraft(null);
      }
    }}>
    <label className="geodata-field">{label}
      <input maxLength={160} aria-label={inputLabel} value={value} disabled={disabled} required onChange={event => setDraft(event.target.value)} />
    </label>
    {dirty && <div className="geodata-actions geodata-name-actions">
      <button type="submit" className="button primary" disabled={disabled || !value.trim()}>{t('Lưu tên', 'Save name')}</button>
      <button type="button" className="button" onClick={() => setDraft(null)}>{t('Hủy', 'Cancel')}</button>
    </div>}
  </form>;
}
