import { useState } from 'react';
import { ChoiceGroup } from '../../shared/ui/ChoiceGroup';
import type { Locale } from '../../types/dear';
import { UiIcon } from '../../shared/ui/UiIcon';
import { downloadBlob } from '../../shared/downloadBlob';
import {
  workState,
  workStatusText,
  type ResponseWork,
  type WorkEntry,
  type WorkStatus
} from './responseWork';
import './response-operations.css';
import '../geodata/scenario-card.css';

export function ResponseWorkDialog({
  tasks,
  initialTaskId,
  entries,
  locale,
  readOnly,
  storageError,
  onRecord,
  onVerifyRoad,
  onVerifyHazard,
  onInspect,
  onReport,
  onClose
}: {
  tasks: ResponseWork[];
  entries: WorkEntry[];
  locale: Locale;
  readOnly: boolean;
  storageError: boolean;
  initialTaskId: string | null;
  onRecord: (task: ResponseWork, status: WorkStatus, note: string, owner: string) => void;
  /** Records a finished check against the road or hazard; absent when data cannot change here. */
  onVerifyRoad?: (roadId: string, status: 'open' | 'blocked', note: string) => boolean;
  onVerifyHazard?: (hazardId: string, confirmed: boolean, note: string) => boolean;
  onInspect: (id: string) => void;
  onReport: () => void;
  onClose: () => void;
}): JSX.Element {
  const t = (vi: string, en: string) => (locale === 'vi' ? vi : en);
  const [selected, setSelected] = useState(initialTaskId),
    [filter, setFilter] = useState('open');
  const [error, setError] = useState(false);
  const active = tasks.find((task) => task.id === selected);
  const state = active ? workState(active, entries) : null;
  const rows = tasks.filter(
    (task) => filter === 'all' || workState(task, entries).status !== 'done'
  );
  return (
    <div className="modal-overlay" onClick={onClose}>
      <section
        className="modal-dialog response-work-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="response-work-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal-head">
          <h2 id="response-work-title">{t('Theo dõi xác minh', 'Verification tracking')}</h2>
          <button
            className="icon-button"
            aria-label={t('Xuất công việc', 'Export work')}
            title={t('Xuất công việc', 'Export work')}
            onClick={() =>
              downloadBlob(
                new Blob(
                  [JSON.stringify({ type: 'local-response-work', tasks, entries }, null, 2)],
                  { type: 'application/json' }
                ),
                'dear-response-work.json'
              )
            }
          >
            <UiIcon name="download" />
          </button>
          <button className="icon-button" aria-label={t('Đóng', 'Close')} onClick={onClose}>
            <UiIcon name="close" />
          </button>
        </header>
        {(readOnly || storageError) && <div className="response-work-notices">
          {readOnly && (
            <p className="operations-notice" role="status">
              {t(
                'Đang xem bản dữ liệu cũ. Về bản mới nhất để cập nhật công việc.',
                'Viewing an older revision. Return to the latest revision to update work.'
              )}
            </p>
          )}
          {storageError && (
            <p className="operations-notice" role="alert">
              {t(
                'Không đọc hoặc lưu được nhật ký cục bộ. Xuất công việc để giữ bản hiện tại.',
                'Local history could not be read or saved. Export work to keep this session.'
              )}
            </p>
          )}
        </div>}
        <div className={'modal-body response-work-body' + (active ? ' has-work' : '')}>
          <nav className="operations-filters" aria-label={t('Lọc công việc', 'Work filters')}>
            {[
              ['open', t('Chưa hoàn tất', 'Open')],
              ['all', t('Tất cả', 'All')]
            ].map(([id, label]) => (
              <button key={id} aria-pressed={filter === id} onClick={() => setFilter(id)}>
                {label}
              </button>
            ))}
          </nav>
          <ul className="response-work-list">
            {rows.map((task) => (
              <li key={task.id}>
                <button
                  className="response-work-row"
                  data-task-id={task.id}
                  aria-pressed={selected === task.id}
                  onClick={() => {
                    setSelected(task.id);
                    setError(false);
                  }}
                >
                  <span>
                    <strong>{t(...task.action)}</strong>
                    <small>{t(...task.subject)}</small>
                  </span>
                  {workState(task, entries).status !== 'pending' && (
                    <span className={`work-status work-${workState(task, entries).status}`}>
                      {t(...workStatusText[workState(task, entries).status])}
                    </span>
                  )}
                </button>
              </li>
            ))}
          {!rows.length && (
            <li className="small">
              {t(
                'Không có việc chưa hoàn tất trong danh sách hiện tại.',
                'No open work in the current list.'
              )}
            </li>
          )}
          </ul>
          {active && state && (
            <section className="response-work-edit" key={active.id + state.status + state.note}>
              <button className="text-button work-back" onClick={() => setSelected(null)}>
                <UiIcon name="back" />
                {t('Danh sách công việc', 'Work list')}
              </button>
              <header className="work-detail-head">
                <div>
                  <h3>{t(...active.action)}</h3>
                  <p className="work-subject">{t(...active.subject)}</p>
                </div>
                <button
                  className="button work-locate"
                  onClick={() => (active.kind === 'report' ? onReport() : onInspect(active.objectId))}
                >
                  <UiIcon name={active.kind === 'report' ? 'info' : 'location'} size={16} />
                  {active.kind === 'report'
                    ? t('Xem báo cáo', 'View report')
                    : t('Xem trên bản đồ', 'View on map')}
                </button>
              </header>
              <section className="work-basis"><h4>{t('Căn cứ', 'Evidence')}</h4><p>{t(...active.reason)}</p></section>
              {state.changed && (
                <p className="operations-notice">
                  {t(
                    'Căn cứ đã thay đổi. Cần kiểm tra lại; ghi nhận trước vẫn còn trong nhật ký.',
                    'Evidence changed. Review again; previous records remain in the journal.'
                  )}
                </p>
              )}
              {active.kind !== 'report' && (
                <WorkForm task={active} state={state} locale={locale} readOnly={readOnly}
                  onInvalid={() => setError(true)}
                  onSubmit={(status, note, owner, outcome) => {
                    try {
                      // A finished road check settles the road: the work log and road status agree.
                      const [kind, id] = [active.id.slice(0, active.id.indexOf(':')), active.id.slice(active.id.indexOf(':') + 1)];
                      const saved = !outcome ? true
                        : kind === 'road' ? onVerifyRoad?.(id, outcome as 'open' | 'blocked', note.trim())
                        : kind === 'hazard' ? onVerifyHazard?.(id, outcome === 'confirmed', note.trim()) : true;
                      if (!saved) throw new Error('Check result not saved');
                      onRecord(active, status, note, owner);
                      setError(false);
                    } catch {
                      setError(true);
                    }
                  }}
                  error={error}
                />
              )}
            </section>
          )}
          {!active && (
            <div className="work-selection-empty">
              {t('Chọn công việc để xem và cập nhật.', 'Select work to view and update.')}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function WorkForm({ task, state, locale, readOnly, error, onInvalid, onSubmit }: {
  task: ResponseWork; state: ReturnType<typeof workState>; locale: Locale; readOnly: boolean; error: boolean;
  onInvalid: () => void;
  onSubmit: (status: WorkStatus, note: string, owner: string, outcome: string | null) => void;
}): JSX.Element {
  const t = (vi: string, en: string) => (locale === 'vi' ? vi : en);
  const [status, setStatus] = useState<WorkStatus>(state.status);
  const [outcome, setOutcome] = useState<string | null>(null);
  // Finishing a check must say what was found; that result updates the road or hazard.
  const outcomes = task.id.startsWith('road:')
    ? [{ value: 'open', label: t('Đi được', 'Passable'), tone: 'is-open' }, { value: 'blocked', label: t('Bị chặn', 'Blocked'), tone: 'is-blocked' }]
    : task.id.startsWith('hazard:')
      ? [{ value: 'confirmed', label: t('Xác nhận có', 'Confirmed'), tone: 'is-blocked' }, { value: 'absent', label: t('Không phát hiện', 'Not found'), tone: 'is-open' }]
      : [];
  const finishingCheck = outcomes.length > 0 && status === 'done';
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const note = String(data.get('note') ?? ''), owner = String(data.get('owner') ?? '');
        // Check everything before the road changes, so a rejected work entry never leaves a stray status edit.
        if (finishingCheck && (!outcome || !note.trim() || !owner.trim())) { onInvalid(); return; }
        onSubmit(status, note, owner, finishingCheck ? outcome : null);
      }}
    >
      <fieldset disabled={readOnly}>
        <div className="work-fields">
          <label>
            {t('Trạng thái công việc', 'Work status')}
            <select name="status" aria-label={t('Trạng thái công việc', 'Work status')} value={status}
              onChange={(event) => setStatus(event.target.value as WorkStatus)}>
              {(Object.keys(workStatusText) as WorkStatus[]).map((value) => (
                <option key={value} value={value}>{t(...workStatusText[value])}</option>
              ))}
            </select>
          </label>
          <label>
            {t('Người phụ trách', 'Owner')}
            <input name="owner" maxLength={100} defaultValue={state.owner} />
          </label>
        </div>
        {finishingCheck && (
          <div className="work-outcome"><ChoiceGroup label={t('Kết quả xác minh', 'Verification result')}
            options={outcomes} value={outcome} onChange={setOutcome} columns={outcomes.length}/></div>
        )}
        <label>
          {t('Kết quả / lý do chờ', 'Result / reason for waiting')}
          <textarea name="note" rows={3} maxLength={1000} defaultValue={state.note} placeholder={t(...task.completion)} />
        </label>
        {error && (
          <p className="operations-notice" role="alert">
            {finishingCheck
              ? t('Chọn kết quả xác minh, người phụ trách và ghi kết quả.', 'Choose the result, an owner and describe it.')
              : t('Nhập người phụ trách; ghi kết quả khi hoàn tất hoặc lý do chờ hỗ trợ.', 'Enter an owner, plus a result when completed or a reason for waiting.')}
          </p>
        )}
        <button className="button primary" type="submit">{t('Cập nhật', 'Update')}</button>
      </fieldset>
    </form>
  );
}
