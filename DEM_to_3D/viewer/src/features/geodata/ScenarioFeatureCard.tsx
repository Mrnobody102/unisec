import { EditableTitle } from '../../shared/ui/EditableTitle';
import type { RenameScenario } from '../access/ScenarioLabels';
import { useState } from 'react';
import type { Locale, RoadStatus } from '../../types/dear';
import { UiIcon } from '../../shared/ui/UiIcon';
import { roadGeographic } from '../routes/selectedRoadJourney';
import {
  editsFor,
  type ScenarioChange,
  type ScenarioEdit
} from '../access/scenarioEdits';
import {
  scenarioKindLabel,
  type ScenarioOverlay,
  type ScenarioTarget
} from './scenarioOverlay';
import './scenario-card.css';

type Point = { x: number; y: number };
const statusLabel: Record<RoadStatus, [string, string]> = {
  open: ['Thông thường', 'Open'],
  uncertain: ['Cần xác minh', 'To verify'],
  blocked: ['Bị chặn', 'Blocked']
};

/** Edit panel for one scenario feature. Every change needs a reason and lands in the history. */
export function ScenarioFeatureCard({
  scenario,
  target,
  edits,
  locale,
  moving,
  pending,
  onRename,
  onStartMove,
  onCancelMove,
  onRecord,
  onRevert,
  onClose
}: {
  scenario: ScenarioOverlay;
  target: ScenarioTarget;
  edits: ScenarioEdit[];
  locale: Locale;
  moving: boolean;
  pending: Point | null;
  onRename?: RenameScenario;
  onStartMove: () => void;
  onCancelMove: () => void;
  onRecord: (change: ScenarioChange, note: string, name: string) => boolean;
  onRevert: (id: string, note: string) => boolean;
  onClose: () => void;
}): JSX.Element | null {
  const t = (vi: string, en: string) => (locale === 'vi' ? vi : en);
  const pick = (pair: readonly [string, string]) =>
    locale === 'vi' ? pair[0] : pair[1];
  const [note, setNote] = useState(''),
    [status, setStatus] = useState<RoadStatus | null>(null),
    [error, setError] = useState('');
  const feature =
    target.type === 'community'
      ? scenario.communities.find((item) => item.id === target.id)
      : target.type === 'site'
        ? scenario.responseSites.find((item) => item.id === target.id)
        : target.type === 'hazard'
          ? scenario.hazards.find((item) => item.id === target.id)
          : scenario.roads.find((item) => item.id === target.id);
  if (!feature) return null;
  const name =
    typeof feature.name === 'string' ? feature.name : pick(feature.name);
  const kind =
    target.type === 'site' &&
    'kind' in feature &&
    (feature.kind === 'staging' || feature.kind === 'hlz')
      ? scenarioKindLabel[feature.kind]
      : scenarioKindLabel[target.type === 'site' ? 'staging' : target.type];
  const road = target.type === 'road' && 'status' in feature ? feature : null;
  const position = 'projected' in feature ? feature.projected : null;
  const history = editsFor(edits, target.type, target.id);
  const latest = history.find((edit) => edit.change.kind !== 'rename');
  const time = (iso: string) =>
    new Date(iso).toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-GB', {
      dateStyle: 'short',
      timeStyle: 'short'
    });
  const describe = (edit: ScenarioEdit) => {
    const c = edit.change;
    if (c.kind === 'move')
      return t(
        `Dời vị trí ${Math.round(Math.hypot(c.to.x - c.from.x, c.to.y - c.from.y))} m`,
        `Moved ${Math.round(Math.hypot(c.to.x - c.from.x, c.to.y - c.from.y))} m`
      );
    if (c.kind === 'status')
      return `${pick(statusLabel[c.from])} → ${pick(statusLabel[c.to])}`;
    return t(`Đổi tên: ${c.from} → ${c.to}`, `Renamed: ${c.from} → ${c.to}`);
  };
  const save = (change: ScenarioChange) => {
    if (!note.trim()) {
      setError(t('Ghi lý do thay đổi.', 'Add a reason for the change.'));
      return;
    }
    if (onRecord(change, note.trim(), name)) {
      setNote('');
      setStatus(null);
      setError('');
    } else
      setError(t('Không lưu được thay đổi.', 'Could not save the change.'));
  };
  const reason = (
    <label className="scenario-card-field">
      {t('Lý do', 'Reason')}
      <textarea
        rows={2}
        maxLength={2000}
        value={note}
        onChange={(event) => setNote(event.target.value)}
      />
    </label>
  );
  const geo = position && roadGeographic(pending ?? position);
  return (
    <section className="field-map-card scenario-card" aria-label={name}>
      <header>
        <div>
          <span className="scenario-card-kind">{pick(kind)}</span>
          <EditableTitle
            id="scenario-feature-title"
            title={name}
            headingLevel={2}
            locale={locale}
            names={
              typeof feature.name === 'string'
                ? [feature.name, feature.name]
                : feature.name
            }
            bilingual={target.type !== 'community'}
            onRename={
              onRename &&
              (target.type === 'community' || target.type === 'road')
                ? (names) =>
                    onRename(
                      target.type as 'community' | 'road',
                      target.id,
                      names
                    )
                : undefined
            }
          />
        </div>
        <button
          className="icon-button"
          aria-label={t('Đóng', 'Close')}
          onClick={onClose}
        >
          <UiIcon name="close" />
        </button>
      </header>

      {position && geo && (
        <div className="scenario-card-block">
          <dl className="scenario-card-facts">
            <div>
              <dt>{t('Vị trí', 'Position')}</dt>
              <dd>
                {geo.latitude.toFixed(5)}°, {geo.longitude.toFixed(5)}°
              </dd>
            </div>
          </dl>
          {!moving ? (
            <button className="button" onClick={onStartMove}>
              <UiIcon name="pointer" size={16} />
              {t('Di chuyển trên bản đồ', 'Move on map')}
            </button>
          ) : !pending ? (
            <p className="scenario-card-hint" role="status">
              {t(
                'Kéo điểm đang chọn tới vị trí mới.',
                'Drag the selected point to its new position.'
              )}
              <button className="text-button" onClick={onCancelMove}>
                {t('Hủy', 'Cancel')}
              </button>
            </p>
          ) : (
            <>
              <p className="scenario-card-hint">
                {t('Dời', 'Moves')}{' '}
                {Math.round(
                  Math.hypot(pending.x - position.x, pending.y - position.y)
                )}{' '}
                m
              </p>
              {reason}
              <div className="scenario-card-actions">
                <button
                  className="button primary"
                  onClick={() =>
                    save({ kind: 'move', from: position, to: pending })
                  }
                >
                  {t('Lưu vị trí', 'Save position')}
                </button>
                <button className="button" onClick={onCancelMove}>
                  {t('Hủy', 'Cancel')}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {road && (
        <div className="scenario-card-block">
          <div
            className="scenario-status"
            role="radiogroup"
            aria-label={t('Tình trạng đường', 'Road status')}
          >
            {(['open', 'uncertain', 'blocked'] as const).map((value) => (
              <button
                key={value}
                role="radio"
                aria-checked={(status ?? road.status) === value}
                className={'is-' + value}
                onClick={() => setStatus(value === road.status ? null : value)}
              >
                {pick(statusLabel[value])}
              </button>
            ))}
          </div>
          {status && (
            <>
              {reason}
              <div className="scenario-card-actions">
                <button
                  className="button primary"
                  onClick={() =>
                    save({ kind: 'status', from: road.status, to: status })
                  }
                >
                  {t('Lưu tình trạng', 'Save status')}
                </button>
                <button className="button" onClick={() => setStatus(null)}>
                  {t('Hủy', 'Cancel')}
                </button>
              </div>
            </>
          )}
        </div>
      )}
      {error && (
        <p className="scenario-card-error" role="alert">
          {error}
        </p>
      )}

      <div className="scenario-card-block">
        <h3>{t('Lịch sử chỉnh sửa', 'Edit history')}</h3>
        {!history.length ? (
          <p className="scenario-card-empty">
            {t('Chưa có chỉnh sửa.', 'No edits yet.')}
          </p>
        ) : (
          <ol className="scenario-history">
            {history.map((edit) => (
              <li key={edit.id}>
                <strong>{describe(edit)}</strong>
                <small>
                  {edit.author.name}, {time(edit.at)}
                  {edit.reverts && t(' (hoàn tác)', ' (undo)')}
                </small>
                {edit.note && <p>{edit.note}</p>}
                {edit === latest && !moving && !status && (
                  <button
                    className="text-button"
                    onClick={() =>
                      onRevert(
                        edit.id,
                        t('Hoàn tác thay đổi trước', 'Undo previous change')
                      )
                    }
                  >
                    {t('Hoàn tác', 'Undo')}
                  </button>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
