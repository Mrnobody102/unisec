import { useEffect, useState, type Dispatch, type MutableRefObject } from 'react';
import type * as L from 'leaflet';
import type { Locale } from '../../../types/dear';
import { UiIcon } from '../../../shared/ui/UiIcon';
import { ChoiceGroup } from '../../../shared/ui/ChoiceGroup';
import { canFinish, measurementPreviewPoints, minimumPoints, takesVertices } from '../core/geometry';
import type { MeasureAction, MeasurementSession } from '../core/session';
import { defaultMeasureUnits, measureModes, measurementResults, modeName } from '../core/results';
import type { MeasureGeometry } from '../core/snapping';
import { useSketchLayer } from '../adapters/leaflet/useSketchLayer';
import { measurementMessages } from '../locales';
import { MeasurementOptions } from './MeasurementOptions';
import { ResultList } from './ResultList';
import { ToolPanel } from './ToolPanel';
import { VertexTable } from './VertexTable';
import './measurement.css';

type Props = {
  mapRef: MutableRefObject<L.Map | null>; enabled: boolean; locale: Locale; onClose: () => void;
  session: MeasurementSession; dispatch: Dispatch<MeasureAction>; sources: MeasureGeometry[]; selected?: MeasureGeometry;
};
export function MapMeasurement({ mapRef, enabled, locale, session, dispatch, sources, selected, onClose }: Props): JSX.Element | null {
  const m = measurementMessages[locale];
  const [collapsed, setCollapsed] = useState(false), [snap, setSnap] = useState(true), [labels, setLabels] = useState(true);
  const [view, setView] = useState<'measure' | 'saved' | 'options'>('measure');
  const [units, setUnits] = useState(defaultMeasureUnits), [copyState, setCopyState] = useState<'ready' | 'copied' | 'error'>('ready');
  const [highlight, setHighlight] = useState<number | null>(null);
  const close = () => { if (session.editing) dispatch({ type: 'cancel' }); onClose(); };
  const { hover, outside } = useSketchLayer({ tool: 'measure', mapRef, enabled, sketch: session, dispatch, results: session.saved,
    activeId: session.activeId, sources, snap, labels, units, locale, highlight, onClose: close });
  useEffect(() => { setCopyState('ready'); }, [session, units, locale]);
  const displayPoints = session.finished || !session.points.length ? session.points : measurementPreviewPoints(session.mode, session.points, hover?.point);
  const results = measurementResults(session.mode, displayPoints, units, locale);
  const finalResults = measurementResults(session.mode, session.points, units, locale);
  const canComplete = canFinish(session.mode, session.points);
  const copy = async () => {
    const report = [modeName(session.mode, locale), ...finalResults.map(([label, value]) => `${label}: ${value}`),
      ...(session.source ? [m.measuredFeature + session.source] : []), 'EPSG:32648 (UTM 48N), WGS84',
      ...session.points.map((point, i) => `${i + 1}: ${point.lat.toFixed(6)}, ${point.lng.toFixed(6)} | E ${point.x.toFixed(1)} m, N ${point.y.toFixed(1)} m`)].join('\n');
    try { await navigator.clipboard.writeText(report); setCopyState('copied'); } catch { setCopyState('error'); }
  };
  const workspace = mapRef.current?.getContainer().closest('.map-area');
  if (!enabled || !workspace) return null;
  const { mode, points } = session;
  const hint = outside ? m.hintOutside
    : mode === 'area' && points.length >= 3 && !canComplete ? m.hintSelfIntersect
    : mode === 'radius' && points.length === 2 && !canComplete ? m.hintCircleOutside
    : session.editing ? m.hintEditing
    : session.finished ? (takesVertices(mode) ? m.hintSelect : '')
    : mode === 'location' ? m.hintLocation
    : mode === 'angle' ? m.hintAngle
    : mode === 'radius' ? m.hintRadius
    : mode === 'bearing' ? m.hintBearing
    : points.length < minimumPoints(mode) ? (mode === 'area' ? m.hintAreaStart : m.hintLineStart)
    : m.hintFinish;
  const stage = session.editing ? 'editing' : session.finished ? 'finished' : 'drawing';
  return <ToolPanel workspace={workspace} panelKey="measure" className="map-measure-panel" headingClassName="map-measure-heading"
    label={m.panelTitle} title={m.panelTitle} stage={stage} collapsed={collapsed} onCollapsed={setCollapsed} onClose={close}
    text={{ position: m.panelPosition, move: m.moveHint, collapse: m.collapse, expand: m.expand, close: m.close }}
    headerActions={<button className="icon-button" aria-label={m.settings} title={m.settings} aria-expanded={view === 'options' && !collapsed} aria-controls="measurement-options"
      onClick={() => { setCollapsed(false); setView(value => value === 'options' ? 'measure' : 'options'); }}><UiIcon name="settings" size={16}/></button>}
    compact={<button className="map-tool-compact map-measure-compact" onClick={() => setCollapsed(false)}><span>{modeName(mode, locale)}</span><strong>{results[0]?.[1] ?? m.selectPoints}</strong></button>}>
    <div className="map-tool-choice map-measure-type">
      <ChoiceGroup label={m.modeLabel} value={mode} options={measureModes.map(value => ({ value, label: modeName(value, locale) }))}
        onChange={value => { dispatch({ type: 'mode', mode: value }); setView('measure'); }}/>
    </div>
    <div className="map-tool-tabs measure-tabs" aria-label={m.views}>
      <button aria-pressed={view === 'measure'} aria-controls="measurement-result-view" onClick={() => setView('measure')}>{m.measurement}</button>
      <button aria-pressed={view === 'saved'} aria-controls="measurement-saved-view" onClick={() => setView('saved')}>{m.results}{session.saved.length > 0 && <span>{session.saved.length}</span>}</button>
    </div>
    <div className="map-tool-body measure-body" id="measurement-result-view" hidden={view !== 'measure'}>
      <div className="map-tool-result-header">
        <dl className="map-tool-result map-measure-result" data-empty={!results.length} aria-label={m.resultLabel}>
          {(results.length ? results : [[modeName(mode, locale), m.noMeasurement]]).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
        </dl>
        {session.finished && !session.editing && <button className="icon-button map-tool-copy" onClick={copy} aria-label={copyState === 'copied' ? m.copied : m.copy} title={copyState === 'copied' ? m.copied : m.copy}><UiIcon name={copyState === 'copied' ? 'check' : 'copy'} size={16}/></button>}
      </div>
      <p className="map-measure-context map-measure-source" title={session.source ?? hover?.name}>{session.source ?? (hover?.name && !session.finished ? m.snapped + hover.name : '')}</p>
      <p className="map-tool-hint map-measure-hint" role="status">{copyState === 'error' ? m.copyFailed : hint}</p>
      {selected && <button className="text-button measure-feature" disabled={session.editing} title={selected.name}
        onClick={() => dispatch({ type: 'import', points: selected.points, mode: selected.closed ? 'area' : 'distance', source: selected.name })}>
        {selected.kind === 'road' ? m.measureRoad : selected.kind === 'aoi' ? m.measureAoi : m.measureRoute}</button>}
      <VertexTable mode={mode} points={points} selected={session.selected} units={units} locale={locale} onHover={setHighlight}
        onSelect={index => dispatch({ type: 'select', index })} onRemove={index => dispatch({ type: 'remove', index })}
        onMove={(index, point) => dispatch({ type: 'move', index, point })}/>
    </div>
    <div className="map-tool-body measure-body" id="measurement-options" role="group" aria-label={m.settings} hidden={view !== 'options'}>
      <MeasurementOptions mode={mode} units={units} onUnits={setUnits} snap={snap} onSnap={setSnap} labels={labels} onLabels={setLabels} locale={locale}/>
    </div>
    <div className="map-tool-body measure-body" id="measurement-saved-view" hidden={view !== 'saved'}>
      <ResultList session={session} dispatch={dispatch} units={units} locale={locale}/>
    </div>
    <div className="map-tool-actions map-measure-actions">
      {session.finished && !session.editing ? <>
        <button className="button" onClick={() => { dispatch({ type: 'edit' }); setView('measure'); }}>{m.edit}</button>
        <button className="button primary" onClick={() => { dispatch({ type: 'new' }); setView('measure'); }}>{m.new}</button>
      </> : <>
        <button className="icon-button" title={m.undoTitle} aria-label={m.undo} disabled={!session.undo.length} onClick={() => dispatch({ type: 'undo' })}><UiIcon name="undo" size={16}/></button>
        <button className="icon-button measure-redo" title={m.redoTitle} aria-label={m.redo} disabled={!session.redo.length} onClick={() => dispatch({ type: 'redo' })}><UiIcon name="undo" size={16}/></button>
        <button className="text-button" disabled={!points.length} onClick={() => dispatch({ type: 'cancel' })}>{m.cancel}</button>
        <button className="button primary" disabled={!canComplete} onClick={() => { dispatch({ type: 'finish' }); setView('measure'); }}>{session.editing ? m.apply : m.finish}</button>
      </>}
    </div>
  </ToolPanel>;
}
