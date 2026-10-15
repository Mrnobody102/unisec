import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import * as L from 'leaflet';
import type { Locale } from '../../../../types/dear';
import {
  canFinish, gridBearing, horizontalLength, measurementPoint, measurementPreviewPoints, minimumPoints,
  projectedMeasurementPoint, radiusRing, rectangleRing, takesVertices, type MeasurePoint, type SketchMode
} from '../../core/geometry';
import { snapMeasurement, type MeasureGeometry } from '../../core/snapping';
import type { Sketch, SketchAction } from '../../core/sketch';
import { formatArea, formatDistance, measurementResults, type MeasureUnits } from '../../core/results';
import { measurementMessages } from '../../locales';
import { positionMeasurementLabels } from './labelLayout';

export type SketchResult = { id: number; mode: SketchMode; points: MeasurePoint[]; visible: boolean };
type Props = {
  /** Names the map classes, e.g. map-measure-vertex or map-draw-vertex. */
  tool: 'measure' | 'draw';
  mapRef: MutableRefObject<L.Map | null>; enabled: boolean;
  sketch: Sketch; dispatch: (action: SketchAction) => void;
  /** Completed results drawn read-only beside the sketch; `activeId` is the sketch itself. */
  results?: SketchResult[]; activeId?: number;
  sources: MeasureGeometry[]; snap: boolean; labels: boolean; units: MeasureUnits; locale: Locale;
  /** Vertex hovered in the vertex table. */
  highlight?: number | null;
  onClose: () => void;
};
const colors = { measure: '#0c7560', draw: '#b87919', result: '#667f8a' };
/** Browsers may fire a click right after a drag; that click must not select or insert again. */
const afterDrag = (time: number) => performance.now() - time < 350;

/** The outline drawn for a sketch: ring for circles and rectangles, polygon for areas, line otherwise. */
function outline(mode: SketchMode, points: MeasurePoint[]): { positions: L.LatLng[]; closed: boolean } {
  const ring = mode === 'radius' ? radiusRing(points) : mode === 'rectangle' ? rectangleRing(points) : [];
  if (ring.length) return { positions: ring.map(p => L.latLng(p.lat, p.lng)), closed: true };
  return { positions: points.map(p => L.latLng(p.lat, p.lng)), closed: mode === 'area' && points.length >= 3 };
}
const midpoint = (a: MeasurePoint, b: MeasurePoint) => projectedMeasurementPoint((a.x + b.x) / 2, (a.y + b.y) / 2);
/** Edges a vertex can be inserted into: each segment, plus the closing edge of an area. */
function edges(mode: SketchMode, points: MeasurePoint[]): Array<{ insertAt: number; a: MeasurePoint; b: MeasurePoint }> {
  if (!takesVertices(mode) || points.length < 2) return [];
  const list = points.slice(1).map((b, i) => ({ insertAt: i + 1, a: points[i], b }));
  if (mode === 'area' && points.length >= 3) list.push({ insertAt: points.length, a: points.at(-1)!, b: points[0] });
  return list;
}

/** Leaflet adapter: renders a sketch and its results, and turns pointer/keyboard input into sketch actions. */
export function useSketchLayer(props: Props) {
  const live = useRef(props); live.current = props;
  const [hover, setHover] = useState<{ point: MeasurePoint; name?: string } | null>(null);
  const [outside, setOutside] = useState(false);
  const ink = useRef<L.LayerGroup | null>(null), preview = useRef<L.LayerGroup | null>(null);
  const resultLabels = useRef<L.Tooltip[]>([]);
  const drawing = props.enabled && !props.sketch.finished;
  useEffect(() => {
    if (props.enabled) props.mapRef.current?.getContainer().focus({ preventScroll: true });
  }, [props.enabled, props.mapRef]);
  useEffect(() => {
    const node = props.mapRef.current?.getContainer();
    if (!node || !props.enabled) return;
    node.dataset.measureDrawing = String(drawing);
    return () => { delete node.dataset.measureDrawing; };
  }, [drawing, props.enabled, props.mapRef]);
  useEffect(() => {
    const map = props.mapRef.current;
    if (!map) return;
    const pane = map.getPane('measurementPane') ?? map.createPane('measurementPane');
    pane.style.zIndex = '450';
    ink.current = L.layerGroup().addTo(map); preview.current = L.layerGroup().addTo(map);
    let frame = 0;
    const schedule = () => { if (!frame) frame = requestAnimationFrame(() => { frame = 0; positionMeasurementLabels(map, resultLabels.current); }); };
    map.on('move zoom resize', schedule);
    const observer = new MutationObserver(schedule);
    const area = map.getContainer().closest('.map-area');
    area?.addEventListener('dear:map-layout', schedule);
    if (area) observer.observe(area, { childList: true, subtree: true, characterData: true });
    return () => {
      cancelAnimationFrame(frame); observer.disconnect(); map.off('move zoom resize', schedule);
      area?.removeEventListener('dear:map-layout', schedule);
      resultLabels.current = []; ink.current?.remove(); preview.current?.remove(); ink.current = null; preview.current = null;
    };
  }, [props.mapRef]);
  // Pointer and keyboard input, only while this tool is open.
  useEffect(() => {
    const map = props.mapRef.current;
    if (!map || !props.enabled) { setHover(null); return; }
    const zoom = map.doubleClickZoom.enabled(); if (drawing) map.doubleClickZoom.disable();
    let frame = 0, nextHover: { point: MeasurePoint; name?: string } | null = null;
    // Alt places a point freely, without snapping to visible features.
    const pick = (position: L.LatLng, free = false) => {
      const point = measurementPoint(position.lat, position.lng);
      if (!point) return null;
      return live.current.snap && !free ? snapMeasurement(point, live.current.sources, p => map.latLngToContainerPoint([p.lat, p.lng])) : { point };
    };
    const click = (event: L.LeafletMouseEvent) => {
      const { sketch, dispatch } = live.current;
      if (sketch.finished || event.originalEvent.detail > 1) return;
      if (!takesVertices(sketch.mode) && sketch.points.length >= minimumPoints(sketch.mode)) return;
      const hit = pick(event.latlng, event.originalEvent.altKey); setOutside(!hit);
      if (!hit) return;
      map.getContainer().focus({ preventScroll: true });
      const last = sketch.points.at(-1);
      if (last && Math.hypot(last.x - hit.point.x, last.y - hit.point.y) < 0.1) return;
      dispatch({ type: 'points', points: [...sketch.points, hit.point], automatic: !takesVertices(sketch.mode) });
    };
    const move = (event: L.LeafletMouseEvent) => {
      nextHover = live.current.sketch.finished ? null : pick(event.latlng, event.originalEvent.altKey);
      if (!frame) frame = requestAnimationFrame(() => { frame = 0; setHover(nextHover); });
    };
    const leave = () => { nextHover = null; cancelAnimationFrame(frame); frame = 0; setHover(null); };
    const finish = () => { live.current.dispatch({ type: 'finish' }); leave(); };
    const keyboard = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (event.defaultPrevented || document.querySelector('dialog[open]') || target?.closest('input,textarea,select,[data-popover],.settings-anchor,.map-help,.map-source-popover,.modal-overlay')) return;
      if (target !== document.body && !target?.closest('.map-area')) return;
      const { sketch, dispatch } = live.current;
      if (event.key === 'Escape') {
        event.preventDefault();
        if (sketch.editing || sketch.points.length && !sketch.finished) dispatch({ type: 'cancel' });
        else if (sketch.selected !== null) dispatch({ type: 'select', index: null });
        else live.current.onClose();
        leave();
      }
      if (event.key === 'F2' || (event.key === 'Enter' && !target?.closest('button,summary,a'))) { event.preventDefault(); finish(); }
      // A selected vertex is deleted; otherwise Backspace removes the last point as before.
      if ((event.key === 'Delete' || event.key === 'Backspace') && sketch.selected !== null && !target?.closest('button,summary,a')) {
        event.preventDefault(); dispatch({ type: 'remove', index: sketch.selected }); leave(); return;
      }
      if (event.key === 'Backspace' || ((event.ctrlKey || event.metaKey) && ['z', 'y'].includes(event.key.toLowerCase()))) {
        event.preventDefault(); dispatch({ type: event.key.toLowerCase() === 'y' || event.shiftKey ? 'redo' : 'undo' }); leave();
      }
    };
    map.on('click', click); map.on('mousemove', move); map.on('mouseout', leave); if (drawing) map.on('dblclick', finish);
    document.addEventListener('keydown', keyboard);
    return () => {
      cancelAnimationFrame(frame); map.off('click', click); map.off('mousemove', move); map.off('mouseout', leave); map.off('dblclick', finish);
      document.removeEventListener('keydown', keyboard); if (zoom) map.doubleClickZoom.enable();
    };
  }, [props.enabled, props.mapRef, drawing]);
  useEffect(() => { setHover(null); setOutside(false); }, [props.enabled, props.sketch.mode, props.sketch.finished, props.sketch.editing]);
  // Results and the sketch.
  useEffect(() => {
    const layer = ink.current, map = props.mapRef.current;
    if (!layer || !map) return;
    layer.clearLayers();
    resultLabels.current = [];
    const { sketch, enabled, locale, units, labels, tool } = props;
    const m = measurementMessages[locale];
    const draw = (mode: SketchMode, points: MeasurePoint[], finished: boolean, active: boolean, title?: string) => {
      const { positions, closed } = outline(mode, points);
      const color = active ? colors[tool] : colors.result;
      const style = { pane: 'measurementPane', color, weight: 2, interactive: false, dashArray: finished ? undefined : '5 4' };
      let path: L.Polyline | L.Polygon | undefined;
      if (closed) path = L.polygon(positions, { ...style, fillOpacity: 0.08 }).addTo(layer);
      else if (positions.length >= 2) path = L.polyline(positions, style).addTo(layer);
      const canEdit = !finished || sketch.editing;
      points.forEach((point, index) => {
        if (!active || !enabled) { L.circleMarker([point.lat, point.lng], { ...style, radius: 3, color: '#fff', fillColor: color, fillOpacity: 1 }).addTo(layer); return; }
        const classes = ['map-sketch-vertex', `map-${tool}-vertex`, canEdit ? 'is-editable' : 'is-selectable',
          index === sketch.selected ? 'is-selected' : '', index === props.highlight ? 'is-highlighted' : ''].filter(Boolean).join(' ');
        const number = mode === 'location' ? '' : String(index + 1);
        const icon = L.divIcon({ className: classes, html: `<span>${number}</span>`, iconSize: [24, 24], iconAnchor: [12, 12] });
        let draggedAt = -Infinity;
        const marker = L.marker([point.lat, point.lng], { icon, draggable: canEdit, keyboard: true, bubblingMouseEvents: false,
          title: (canEdit ? m.dragVertex : m.selectVertex).replace('{n}', String(index + 1)) }).addTo(layer);
        marker.on('drag', () => {
          const moved = points.map(p => L.latLng(p.lat, p.lng)); moved[index] = marker.getLatLng();
          const draft = moved.map(p => measurementPoint(p.lat, p.lng));
          if (draft.every((p): p is MeasurePoint => p !== null)) path?.setLatLngs(outline(mode, draft).positions);
        });
        marker.on('dragend', () => {
          draggedAt = performance.now();
          const position = marker.getLatLng(), updated = measurementPoint(position.lat, position.lng);
          if (!updated) { marker.setLatLng([point.lat, point.lng]); path?.setLatLngs(positions); setOutside(true); return; }
          const hit = live.current.snap ? snapMeasurement(updated, live.current.sources, p => map.latLngToContainerPoint([p.lat, p.lng])).point : updated;
          live.current.dispatch({ type: 'move', index, point: hit });
          setOutside(false);
        });
        marker.on('click', () => {
          if (afterDrag(draggedAt)) return;
          if (!finished) {
            // While drawing, a click must not redraw the vertices: the double-click that finishes
            // the sketch arrives on the same marker. The vertex table still selects them.
            if (index === 0 && mode === 'area' && canFinish(mode, points)) live.current.dispatch({ type: 'finish' });
            return;
          }
          live.current.dispatch({ type: 'select', index: index === sketch.selected ? null : index });
        });
        marker.on('dblclick', () => { if (!finished && index === points.length - 1) live.current.dispatch({ type: 'finish' }); });
      });
      // Handles insert a vertex into a segment by click or drag, while drawing or editing.
      if (active && enabled && canEdit) edges(mode, points).forEach(({ insertAt, a, b }) => {
        const mid = midpoint(a, b);
        if (!mid) return;
        const label = m.insertVertex.replace('{n}', String(insertAt)) + ' · ' + formatDistance(horizontalLength([a, b]), units, locale);
        const handle = L.marker([mid.lat, mid.lng], { draggable: true, keyboard: true, bubblingMouseEvents: false, title: label,
          icon: L.divIcon({ className: `map-sketch-midpoint map-${tool}-midpoint`, html: '<span></span>', iconSize: [18, 18], iconAnchor: [9, 9] }) }).addTo(layer);
        let draggedAt = -Infinity;
        handle.on('click', () => { if (!afterDrag(draggedAt)) live.current.dispatch({ type: 'insert', index: insertAt, point: mid }); });
        handle.on('dragend', () => {
          draggedAt = performance.now();
          const position = handle.getLatLng(), point = measurementPoint(position.lat, position.lng);
          if (point) live.current.dispatch({ type: 'insert', index: insertAt, point }); else setOutside(true);
        });
      });
      // While the tool is open, a finished shape shows its segment lengths; when editing, the handles show them.
      if (active && enabled && labels && finished && !sketch.editing) edges(mode, points).forEach(({ a, b }) => {
        const mid = midpoint(a, b);
        if (!mid) return;
        const tooltip = L.tooltip({ permanent: true, direction: 'top', className: `map-sketch-segment map-${tool}-segment`, offset: [0, -6] })
          .setLatLng([mid.lat, mid.lng]).setContent(formatDistance(horizontalLength([a, b]), units, locale)).addTo(layer);
        resultLabels.current.push(tooltip);
      });
      if (labels && finished && canFinish(mode, points) && positions.length) {
        const label = document.createElement('span');
        const result = measurementResults(mode, points, units, locale)[0];
        label.textContent = (title ? title + '  ' : '') + (mode === 'location' ? `${points[0].lat.toFixed(5)}°, ${points[0].lng.toFixed(5)}°` : result?.[1]);
        label.title = result?.[0] ?? '';
        const anchor = closed && path instanceof L.Polygon ? path.getCenter() : positions.at(-1)!;
        const tooltip = L.tooltip({ permanent: true, direction: 'auto', className: `map-sketch-label map-${tool}-label`, offset: [10, 0] }).setLatLng(anchor).setContent(label).addTo(layer);
        // The current result's label is placed first; segment labels yield to it.
        resultLabels.current.unshift(tooltip);
      }
    };
    // The active result is drawn once, as the sketch, and follows its visibility toggle.
    (props.results ?? []).filter(item => item.visible && item.id !== props.activeId).forEach(item => draw(item.mode, item.points, true, false, `#${item.id}`));
    const active = props.results?.find(item => item.id === props.activeId);
    if ((enabled || sketch.finished) && active?.visible !== false)
      draw(sketch.mode, sketch.points, sketch.finished, true, active && `#${active.id}`);
    positionMeasurementLabels(map, resultLabels.current);
  }, [props.sketch, props.results, props.activeId, props.enabled, props.units, props.locale, props.labels, props.highlight, props.mapRef, props.tool]);
  // Preview of the next point, with a label beside the pointer.
  useEffect(() => {
    const layer = preview.current; layer?.clearLayers();
    const { sketch, enabled, units, locale, tool } = props;
    if (!layer || !enabled || sketch.finished || !hover) return;
    const points = measurementPreviewPoints(sketch.mode, sketch.points, hover.point);
    const { positions, closed } = outline(sketch.mode, points);
    const style = { pane: 'measurementPane', color: colors[tool], weight: 1.5, interactive: false, dashArray: '4 5' };
    if (closed) L.polygon(positions, { ...style, fillOpacity: 0.04 }).addTo(layer);
    else if (positions.length >= 2) L.polyline(positions, style).addTo(layer);
    if (hover.name) L.circleMarker([hover.point.lat, hover.point.lng], { ...style, radius: 7, weight: 2, fillOpacity: 0 }).addTo(layer);
    const last = sketch.points.at(-1);
    if (!last) return;
    const m = measurementMessages[locale];
    const segment = horizontalLength([last, hover.point]);
    const text = takesVertices(sketch.mode)
      ? m.segmentAndTotal.replace('{segment}', formatDistance(segment, units, locale)).replace('{total}', formatDistance(horizontalLength(points), units, locale))
      : sketch.mode === 'bearing' ? `${(gridBearing(last, hover.point) ?? 0).toFixed(1)}° · ${formatDistance(segment, units, locale)}`
      : sketch.mode === 'rectangle' ? measurementResults('rectangle', [last, hover.point], units, locale)[0][1]
      : sketch.mode === 'radius' ? `${m.radius} ${formatDistance(segment, units, locale)} · ${formatArea(Math.PI * segment ** 2, units, locale)}`
      : formatDistance(segment, units, locale);
    L.tooltip({ permanent: true, direction: 'right', offset: [16, 0], className: 'map-sketch-cursor' }).setLatLng([hover.point.lat, hover.point.lng]).setContent(text).addTo(layer);
  }, [hover, props.enabled, props.sketch, props.units, props.locale, props.tool]);
  return { hover: props.sketch.finished ? null : hover, outside };
}
