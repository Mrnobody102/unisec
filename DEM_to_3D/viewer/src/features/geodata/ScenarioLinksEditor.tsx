import { useState } from 'react';
import { ConfirmDialog } from '../../shared/ui/ConfirmDialog';
import { roadHazardIds, roadsForHazard, sameLinks } from '../incident/roadHazards';
import type { ScenarioChange } from '../access/scenarioEdits';
import type { ScenarioOverlay, ScenarioTarget } from './scenarioOverlay';
import type { Locale } from '../../types/dear';

/** Relationships describe evidence, independently of a road's passability. */
export function ScenarioLinksEditor({
  scenario, target, locale, readOnly, onSave, onSelect
}: {
  scenario: ScenarioOverlay;
  target: ScenarioTarget;
  locale: Locale;
  readOnly: boolean;
  onSave: (change: ScenarioChange, note: string) => boolean;
  onSelect: (target: ScenarioTarget) => void;
}) {
  const t = (vi: string, en: string) => locale === 'vi' ? vi : en;
  const pick = (name: [string, string]) => t(...name);
  const hazard = target.type === 'hazard'
    ? scenario.hazards.find(h => h.id === target.id) : undefined;
  const road = target.type === 'road'
    ? scenario.roads.find(r => r.id === target.id) : undefined;
  const original = hazard
    ? roadsForHazard(scenario.roads, hazard.id).map(r => r.id)
    : road ? roadHazardIds(road) : [];
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(original);
  const [note, setNote] = useState('');
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  if (!hazard && !road) return null;

  const options = hazard ? scenario.roads : scenario.hazards;
  const heading = hazard
    ? t('Đoạn đường liên quan', 'Linked road sections')
    : t('Điểm ghi nhận liên quan', 'Linked point reports');
  const linked = options.filter(item => original.includes(item.id));
  const needle = query.trim().toLocaleLowerCase(locale);
  const filtered = options.filter(item =>
    !needle || pick(item.name).toLocaleLowerCase(locale).includes(needle));
  const save = () => {
    // A moved report can reaffirm the same links after reviewing the new position.
    if (sameLinks(original, draft) && !hazard?.roadLinksNeedReview) {
      setEditing(false);
      return;
    }
    if (!note.trim()) {
      setError(t('Ghi căn cứ liên kết.', 'Add supporting evidence.'));
      return;
    }
    if (onSave({ kind: 'links', from: original, to: draft }, note.trim()))
      setEditing(false);
    else setError(t('Không lưu được liên kết.', 'Could not save links.'));
  };
  return (
    <section className="scenario-card-block scenario-links">
      <div className="scenario-section-heading">
        <h3>{heading}</h3>
        {!readOnly && <button type="button" className="text-button" onClick={() => {
          setDraft(original);
          setNote('');
          setQuery('');
          setError('');
          setEditing(true);
        }}>{t('Sửa liên kết', 'Edit links')}</button>}
      </div>
      {hazard?.roadLinksNeedReview && <p className="scenario-card-error" role="status">
        {t('Vị trí đã đổi. Kiểm tra lại đoạn đường liên quan.',
          'Position changed. Review the linked road sections.')}
      </p>}
      {linked.length ? (
        <ul className="scenario-linked-list">
          {linked.map(item => <li key={item.id}>
            <button type="button" className="text-button"
              data-map-preview={(hazard ? 'road:' : 'hazard:') + item.id}
              onClick={() => onSelect({ type: hazard ? 'road' : 'hazard', id: item.id })}
            >{pick(item.name)}</button>
          </li>)}
        </ul>
      ) : <p className="scenario-card-empty">{t('Chưa có liên kết', 'No links')}</p>}
      {editing && <ConfirmDialog
        title={t('Sửa liên kết', 'Edit links')}
        locale={locale}
        confirmLabel={t('Lưu vào bản nháp', 'Save to draft')}
        onCancel={() => setEditing(false)}
        error={error}
        onConfirm={save}
      >
        <p className="scenario-card-empty">{hazard ? pick(hazard.name) : pick(road!.name)}</p>
        <label className="scenario-card-field">
          {t('Tìm theo tên', 'Find by name')}
          <input type="search" value={query} onChange={event => setQuery(event.target.value)} />
        </label>
        <fieldset className="scenario-link-options">
          <legend>{heading}</legend>
          {filtered.map(item => <label key={item.id}>
            <input type="checkbox" checked={draft.includes(item.id)}
              onChange={event => setDraft(ids => event.target.checked
                ? [...ids, item.id] : ids.filter(id => id !== item.id))} />
            <span>{pick(item.name)}</span>
          </label>)}
          {!filtered.length && <p className="scenario-card-empty">{t('Không có kết quả', 'No matches')}</p>}
        </fieldset>
        <p className="scenario-card-empty">{t(`${draft.length} đã chọn`, `${draft.length} selected`)}</p>
        <label className="scenario-card-field">
          {t('Căn cứ liên kết', 'Supporting evidence')}
          <textarea rows={2} maxLength={2000} value={note}
            onChange={event => setNote(event.target.value)} />
        </label>
        <p className="scenario-card-hint">
          {t('Liên kết này không thay đổi tình trạng đường.', 'Linking does not change road status.')}
        </p>
      </ConfirmDialog>}
    </section>
  );
}
