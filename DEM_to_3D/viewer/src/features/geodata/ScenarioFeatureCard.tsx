import {ScenarioLinksEditor} from './ScenarioLinksEditor';
import type { GeometryRecord } from '../../geo/vector/types';
import { landslideAreaOf } from '../landslides/landslideAreas';
import { ConfirmDialog } from '../../shared/ui/ConfirmDialog';
import { scenarioProperties } from '../access/scenarioProperties';
import { ScenarioPropertiesEditor } from './ScenarioPropertiesEditor';
import { ScenarioCoordinatesDialog } from './ScenarioCoordinatesDialog';
import { EditableTitle } from '../../shared/ui/EditableTitle';
import type { RenameScenario } from '../access/ScenarioLabels';
import { useState } from 'react';
import type { Locale, RoadStatus } from '../../types/dear';
import { StatusText } from '../../shared/ui/StatusText';
import { roadStatusIcon, roadStatusTone, roadStatusShortLabels } from '../routes/roadStatus';
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
const statusLabel = roadStatusShortLabels;

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
  onPreviewPosition,
  onPickPosition,
  onResponse,
  readOnly = false,
  mappedAreas = [],
  onOpenMappedArea,
  onSelectRelated,
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
  onPreviewPosition: (point: Point) => void;
  onPickPosition: () => void;
  onResponse?: () => void;
  readOnly?: boolean;
  mappedAreas?: GeometryRecord[];
  onOpenMappedArea?: (id: string) => void;
  onSelectRelated: (target: ScenarioTarget) => void;
  onClose: () => void;
}): JSX.Element | null {
  const t = (vi: string, en: string) => (locale === 'vi' ? vi : en);
  const pick = (pair: readonly [string, string]) =>
    locale === 'vi' ? pair[0] : pair[1];
  const [note, setNote] = useState(''),
    [status, setStatus] = useState<RoadStatus | null>(null),
    [error, setError] = useState('');
  const [statusEditing, setStatusEditing] = useState(false);
  const [review, setReview] = useState<ScenarioChange | null>(null), [coordinatesOpen, setCoordinatesOpen] = useState(false);
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
  const landingSite = target.type === 'site' && 'kind' in feature && feature.kind === 'hlz' ? feature : null;
  const history = editsFor(edits, target.type, target.id);
  const statusEdit = history.find(edit => edit.change.kind === 'status');
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
    if (c.kind === 'links') return t('Cập nhật liên kết đường–sự cố','Updated road–hazard links');
    if (c.kind === 'create') return target.type === 'site' ? t('Thêm bãi đáp đề xuất', 'Added candidate landing site') : t('Thêm sự cố', 'Added hazard');
    if (c.kind === 'properties') return c.from.names[0] !== c.to.names[0] ? t('Đổi tên: ', 'Renamed: ') + c.to.names[0]
      : c.from.siteAssessment !== c.to.siteAssessment ? t('Cập nhật khảo sát', 'Assessment updated')
      : c.from.hazardKind !== c.to.hazardKind ? t('Cập nhật loại sự cố', 'Hazard type updated') : t('Cập nhật nhãn bản đồ', 'Map label updated');
    return t(`Đổi tên: ${c.from} → ${c.to}`, `Renamed: ${c.from} → ${c.to}`);
  };
  const save = (change: ScenarioChange) => {
    if (!note.trim()) {
      setError(t('Ghi lý do thay đổi.', 'Add a reason for the change.'));
      return;
    }
    if (onRecord(change, note.trim(), name)) {
      setReview(null);
      setNote('');
      setStatus(null);
      setStatusEditing(false);
      setError('');
    } else
      setError(t('Không lưu được thay đổi.', 'Could not save the change.'));
  };
  const prepare = (change: ScenarioChange) => {
    if (!note.trim()) {setError(t('Ghi lý do thay đổi.', 'Add a reason for the change.'));return;}
    setError('');setReview(change);
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
              onRename && !readOnly ? (names) => onRecord({kind:'properties',from:scenarioProperties(feature),to:{...scenarioProperties(feature),names}},t('Cập nhật tên hiển thị','Update display name'),name) : undefined
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

      {readOnly && <p className="scenario-card-block scenario-card-hint">{t('Bản dữ liệu cũ, chỉ xem.', 'Older revision, read only.')}</p>}
      {landingSite && !moving && <div className="scenario-card-block">
        <StatusText tone={landingSite.assessment === 'unavailable' ? 'critical' : landingSite.assessment === 'assessed' ? 'neutral' : 'warning'}>
          {landingSite.assessment === 'assessed' ? t('Đã ghi nhận khảo sát', 'Survey recorded') : landingSite.assessment === 'unavailable' ? t('Không sử dụng', 'Unavailable') : t('Đề xuất, chưa khảo sát', 'Candidate, not surveyed')}
        </StatusText>
      </div>}
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
          {!readOnly && (!moving ? (
            <div className="scenario-card-actions">
              <button className="button" onClick={onStartMove}><UiIcon name="pointer" size={16} />{t('Di chuyển trên bản đồ', 'Move on map')}</button>
              <button className="button" onClick={() => setCoordinatesOpen(true)}>{t('Sửa tọa độ', 'Edit coordinates')}</button>
            </div>
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
                    prepare({ kind: 'move', from: position, to: pending })
                  }
                >
                  {t('Lưu vị trí', 'Save position')}
                </button>
                <button className="button" onClick={onCancelMove}>
                  {t('Hủy', 'Cancel')}
                </button>
              </div>
            </>
          ))}
        </div>
      )}

      {road && !moving && (
        <section className="scenario-card-block">
          <div className="scenario-section-heading">
            <h3>{t('Tình trạng đường', 'Road status')}</h3>
            {!readOnly && <button type="button" className="text-button" onClick={() => {
              setStatus(null); setNote(''); setError(''); setStatusEditing(true);
            }}>{t('Cập nhật tình trạng', 'Update status')}</button>}
          </div>
          <StatusText tone={roadStatusTone(road.status)} icon={roadStatusIcon(road.status)}>{pick(statusLabel[road.status])}</StatusText>
          {statusEdit && <div className="scenario-status-evidence">
            <p>{statusEdit.note}</p>
            <time dateTime={statusEdit.at}>{time(statusEdit.at)}</time>
          </div>}
        </section>
      )}
      {!moving && ['hazard','road'].includes(target.type) && <ScenarioLinksEditor scenario={scenario} target={target} locale={locale} readOnly={readOnly} onSelect={onSelectRelated} onSave={(c,n)=>onRecord(c,n,name)}/>}
      {!readOnly && !moving && target.type !== 'road' && <details className="scenario-card-block scenario-disclosure">
        <summary>{target.type === 'site' && 'kind' in feature && feature.kind === 'hlz' ? t('Khảo sát và hiển thị', 'Survey and display') : t('Ký hiệu và nhãn', 'Symbol and label')}</summary>
        <ScenarioPropertiesEditor key={JSON.stringify(scenarioProperties(feature))} value={scenarioProperties(feature)}
          type={target.type} landingSite={'kind' in feature && feature.kind === 'hlz'} locale={locale} onSave={(change, note) => onRecord(change, note, name)} />
      </details>}
      {road && onOpenMappedArea && mappedAreas.some(record => landslideAreaOf(record)?.roadLinks.some(link => link.roadId === road.id)) && (
        <section className="scenario-card-block">
          <h3>{t('Vùng liên quan', 'Linked areas')}</h3>
          {mappedAreas.filter(record => landslideAreaOf(record)?.roadLinks.some(link => link.roadId === road.id)).map(record => (
            <button key={record.id} className="text-button" onClick={() => onOpenMappedArea(record.id)}>{record.name}</button>
          ))}
        </section>
      )}
      {error && !statusEditing && !review && (
        <p className="scenario-card-error" role="alert">
          {error}
        </p>
      )}

      {history.length > 0 && !moving && <details className="scenario-card-block scenario-disclosure">
        <summary>{t('Lịch sử chỉnh sửa', 'Edit history')} ({history.length})</summary>
          <ol className="scenario-history">
            {history.map((edit) => (
              <li key={edit.id}>
                <strong>{describe(edit)}</strong>
                <small>
                  {edit.author.name}, {time(edit.at)}
                  {edit.reverts && t(' (hoàn tác)', ' (undo)')}
                </small>
                {edit.note && <p>{edit.note}</p>}
                {edit === latest && edit.change.kind !== 'create' && !readOnly && !moving && !status && (
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
      </details>}
      {onResponse && <div className="scenario-card-block"><button className="button" onClick={onResponse}>{t('Xem trên bản đồ ứng phó', 'View on response map')}</button></div>}
      {statusEditing && road && <ConfirmDialog title={t('Cập nhật tình trạng đường', 'Update road status')} locale={locale}
        confirmLabel={t('Lưu tình trạng', 'Save status')} error={error}
        onCancel={() => {setStatusEditing(false);setStatus(null);setNote('');setError('');}}
        onConfirm={() => {if (!status || status === road.status) {setError(t('Chọn tình trạng mới.', 'Choose a new status.'));return;} save({kind:'status',from:road.status,to:status});}}>
        <p>{name}</p>
        <fieldset className="scenario-status-options"><legend>{t('Tình trạng đường', 'Road status')}</legend>
          {(['open','uncertain','blocked'] as const).map(value => <label key={value}>
            <input type="radio" name="road-status" checked={(status ?? road.status) === value} onChange={() => setStatus(value)}/>
            <span>{pick(statusLabel[value])}</span>
          </label>)}
        </fieldset>
        {reason}
      </ConfirmDialog>}
      {coordinatesOpen && position && <ScenarioCoordinatesDialog point={position} locale={locale} onClose={() => setCoordinatesOpen(false)} onPreview={onPreviewPosition} onPick={onPickPosition} />}
      {review && <ConfirmDialog title={review.kind === 'move' ? t('Cập nhật vị trí?', 'Update position?') : t('Cập nhật tình trạng đường?', 'Update road status?')} locale={locale}
        confirmLabel={t('Cập nhật', 'Update')} onCancel={() => setReview(null)} error={error} onConfirm={() => save(review)}>
        <p>{name}</p><p>{note || t('Chưa có lý do thay đổi.', 'A reason is required.')}</p>
        {review.kind === 'move' && <p>{t('Dời vị trí', 'Move position')}: {Math.round(Math.hypot(review.to.x-review.from.x,review.to.y-review.from.y))} m</p>}
        {review.kind === 'move' && target.type === 'site' && 'kind' in feature && feature.kind === 'hlz' && <p>{t('Vị trí mới trở lại trạng thái đề xuất, chưa khảo sát.', 'The new position becomes an unsurveyed candidate.')}</p>}
      </ConfirmDialog>}
    </section>
  );
}
