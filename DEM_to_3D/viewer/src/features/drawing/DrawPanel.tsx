import { useState, type Dispatch, type MutableRefObject } from 'react';
import type * as L from 'leaflet';
import type { Locale } from '../../types/dear';
import type { GeometryRecord } from '../../geo/vector/types';
import { UiIcon } from '../../shared/ui/UiIcon';
import { ChoiceGroup } from '../../shared/ui/ChoiceGroup';
import {
  canFinish, defaultMeasureUnits, measurementPreviewPoints, measurementResults, ToolPanel, useSketchLayer, VertexTable,
  type MeasureGeometry
} from '../measurement';
import { drawingRecord, drawKinds, drawnFeature, kindMode } from './drawShapes';
import type { DrawAction, DrawSession } from './useDrawSession';
import { drawingMessages } from './locales';
import './drawing.css';

type Props = {
  mapRef: MutableRefObject<L.Map | null>; enabled: boolean; locale: Locale;
  session: DrawSession; dispatch: Dispatch<DrawAction>; sources: MeasureGeometry[];
  /** Existing GIS records, to number default names per shape. */
  records: GeometryRecord[];
  onSave: (record: GeometryRecord) => void; onClose: () => void;
};

/** Draws points, lines, areas, rectangles, circles and notes, and saves them as GIS reference data. */
export function DrawPanel({ mapRef, enabled, locale, session, dispatch, sources, records, onSave, onClose }: Props): JSX.Element | null {
  const m = drawingMessages[locale];
  const [collapsed, setCollapsed] = useState(false), [highlight, setHighlight] = useState<number | null>(null);
  const units = defaultMeasureUnits;
  const close = () => { if (session.editing) dispatch({ type: 'cancel' }); onClose(); };
  const { hover, outside } = useSketchLayer({ tool: 'draw', mapRef, enabled, sketch: session, dispatch, sources,
    snap: true, labels: true, units, locale, highlight, onClose: close });
  const workspace = mapRef.current?.getContainer().closest('.map-area');
  if (!enabled || !workspace) return null;
  const { kind, points } = session, mode = kindMode[kind];
  const ready = canFinish(mode, points), noteMissing = kind === 'note' && !session.note.trim();
  const defaultName = `${m.kinds[kind]} ${records.filter(record => record.feature.properties.shape === kind).length + 1}`;
  const displayPoints = session.finished || !points.length ? points : measurementPreviewPoints(mode, points, hover?.point);
  const results = measurementResults(mode, displayPoints, units, locale);
  const kindHints = { point: m.hintPoint, line: m.hintLine, polygon: m.hintPolygon, rectangle: m.hintRectangle, circle: m.hintCircle, note: m.hintNote };
  const hint = outside ? m.hintOutside : ready ? (noteMissing ? m.hintNeedNote : m.hintReady) : kindHints[kind];
  const save = () => {
    const note = session.note.trim();
    const name = kind === 'note' ? note.split('\n')[0] : session.name.trim() || defaultName;
    const feature = drawnFeature(kind, points, name, note);
    if (!feature || noteMissing) return;
    onSave(drawingRecord(feature, name, m.source));
    dispatch({ type: 'discard' });
  };
  return <ToolPanel workspace={workspace} panelKey="draw" className="map-draw-panel" label={m.panelTitle} title={m.panelTitle}
    stage={session.editing ? 'editing' : session.finished ? 'finished' : 'drawing'} collapsed={collapsed} onCollapsed={setCollapsed} onClose={close}
    text={{ position: m.panelPosition, move: m.moveHint, collapse: m.collapse, expand: m.expand, close: m.close }}
    compact={<button className="map-tool-compact" onClick={() => setCollapsed(false)}><span>{m.kinds[kind]}</span><strong>{results[0]?.[1] ?? ''}</strong></button>}>
    <div className="map-tool-choice">
      <ChoiceGroup label={m.kindLabel} value={kind} options={drawKinds.map(value => ({ value, label: m.kinds[value] }))}
        onChange={value => dispatch({ type: 'kind', kind: value })}/>
    </div>
    <div className="map-tool-body">
      {kind === 'note'
        ? <label className="draw-field"><span>{m.note}</span><textarea rows={2} maxLength={500} value={session.note} onChange={event => dispatch({ type: 'note', note: event.target.value })}/></label>
        : <label className="draw-field"><span>{m.name}</span><input maxLength={160} value={session.name} placeholder={defaultName} onChange={event => dispatch({ type: 'name', name: event.target.value })}/></label>}
      {results.length > 0 && <dl className="map-tool-result map-draw-result">
        {results.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
      </dl>}
      <p className="map-tool-hint" role="status">{hint}</p>
      <VertexTable mode={mode} points={points} selected={session.selected} units={units} locale={locale} onHover={setHighlight}
        onSelect={index => dispatch({ type: 'select', index })} onRemove={index => dispatch({ type: 'remove', index })}
        onMove={(index, point) => dispatch({ type: 'move', index, point })}/>
      <p className="draw-note">{m.savedNote}</p>
    </div>
    <div className="map-tool-actions">
      <button className="icon-button" title={m.undoTitle} aria-label={m.undo} disabled={!session.undo.length} onClick={() => dispatch({ type: 'undo' })}><UiIcon name="undo" size={16}/></button>
      <button className="icon-button" title={m.redoTitle} aria-label={m.redo} disabled={!session.redo.length} onClick={() => dispatch({ type: 'redo' })}><UiIcon name="redo" size={16}/></button>
      <button className="text-button" disabled={!points.length} onClick={() => dispatch({ type: 'discard' })}>{m.discard}</button>
      <button className="button primary" disabled={!ready || noteMissing} onClick={save}>{m.save}</button>
    </div>
  </ToolPanel>;
}
