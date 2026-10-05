import { useEffect, useRef, useState, type Dispatch, type MutableRefObject } from 'react';
import * as L from 'leaflet';
import type { Locale } from '../../types/dear';
import { canFinish, measurementPoint, measurementPreviewPoints, minimumPoints, radiusRing, type MeasurePoint } from './measurement';
import { snapMeasurement, type MeasureGeometry } from './measurementGeometry';
import type { MeasureAction, MeasurementSession } from './measurementSession';
import { measurementResults, type MeasureUnits } from './measurementResults';
import { positionMeasurementLabels } from './measurementLabelLayout';

type Props = { mapRef: MutableRefObject<L.Map | null>; enabled: boolean; session: MeasurementSession; dispatch: Dispatch<MeasureAction>;
  sources: MeasureGeometry[]; snap: boolean; labels: boolean; units: MeasureUnits; locale: Locale; onClose: () => void };
export function useMeasurementMap(props: Props) {
  const live = useRef(props); live.current = props;
  const [hover, setHover] = useState<{ point: MeasurePoint; name?: string } | null>(null);
  const [outside, setOutside] = useState(false);
  const ink = useRef<L.LayerGroup | null>(null), preview = useRef<L.LayerGroup | null>(null);
  const resultLabels = useRef<L.Tooltip[]>([]);
  const drawing = props.enabled && !props.session.finished;
  useEffect(() => {
    if (props.enabled) props.mapRef.current?.getContainer().focus({ preventScroll: true });
  }, [props.enabled, props.mapRef]);
  useEffect(() => {
    const node = props.mapRef.current?.getContainer();
    if (!node) return;
    node.dataset.measureDrawing = String(drawing);
    return () => { delete node.dataset.measureDrawing; };
  }, [drawing, props.mapRef]);
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
  useEffect(() => {
    const map = props.mapRef.current;
    if (!map || !props.enabled) { setHover(null); return; }
    const zoom = map.doubleClickZoom.enabled(); if (drawing) map.doubleClickZoom.disable();
    let frame = 0, nextHover: { point: MeasurePoint; name?: string } | null = null;
    const pick = (position: L.LatLng) => {
      const point = measurementPoint(position.lat, position.lng);
      if (!point) return null;
      return live.current.snap ? snapMeasurement(point, live.current.sources, p => map.latLngToContainerPoint([p.lat, p.lng])) : { point };
    };
    const click = (event: L.LeafletMouseEvent) => {
      const { session, dispatch } = live.current;
      if (session.finished || event.originalEvent.detail > 1) return;
      if (!['distance', 'area'].includes(session.mode) && session.points.length >= minimumPoints(session.mode)) return;
      const hit = pick(event.latlng); setOutside(!hit);
      if (!hit) return;
      map.getContainer().focus({ preventScroll: true });
      const last = session.points.at(-1);
      if (last && Math.hypot(last.x - hit.point.x, last.y - hit.point.y) < 0.1) return;
      dispatch({ type: 'points', points: [...session.points, hit.point], automatic: !['distance', 'area'].includes(session.mode) });
    };
    const move = (event: L.LeafletMouseEvent) => {
      nextHover = live.current.session.finished ? null : pick(event.latlng);
      if (!frame) frame = requestAnimationFrame(() => { frame = 0; setHover(nextHover); });
    };
    const leave = () => { nextHover = null; cancelAnimationFrame(frame); frame = 0; setHover(null); };
    const finish = () => { live.current.dispatch({ type: 'finish' }); leave(); };
    const keyboard = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (event.defaultPrevented || target?.closest('input,textarea,select,[data-popover],.settings-anchor,.map-help,.map-source-popover,.modal-overlay')) return;
      if (target !== document.body && !target?.closest('.map-area')) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        if (live.current.session.editing || live.current.session.points.length && !live.current.session.finished) live.current.dispatch({ type: 'cancel' }); else live.current.onClose();
        leave();
      }
      if (event.key === 'F2' || (event.key === 'Enter' && !target?.closest('button,summary,a'))) { event.preventDefault(); finish(); }
      if (event.key === 'Backspace' || ((event.ctrlKey || event.metaKey) && ['z', 'y'].includes(event.key.toLowerCase()))) {
        event.preventDefault(); live.current.dispatch({ type: event.key.toLowerCase() === 'y' || event.shiftKey ? 'redo' : 'undo' }); leave();
      }
    };
    map.on('click', click); map.on('mousemove', move); map.on('mouseout', leave); if (drawing) map.on('dblclick', finish);
    document.addEventListener('keydown', keyboard);
    return () => {
      cancelAnimationFrame(frame); map.off('click', click); map.off('mousemove', move); map.off('mouseout', leave); map.off('dblclick', finish);
      document.removeEventListener('keydown', keyboard); if (zoom) map.doubleClickZoom.enable();
    };
  }, [props.enabled, props.mapRef, drawing]);
  useEffect(() => { setHover(null); setOutside(false); }, [props.enabled, props.session.mode, props.session.finished, props.session.editing]);
  useEffect(() => {
    const layer = ink.current;
    if (!layer) return;
    layer.clearLayers();
    resultLabels.current = [];
    const { session, enabled, locale, units, labels } = props;
    const draw = (mode: MeasurementSession['mode'], points: MeasurePoint[], finished: boolean, editable: boolean, title?: string) => {
      const positions = points.map(point => L.latLng(point.lat, point.lng));
      const style = { pane: 'measurementPane', color: editable ? '#0c7560' : '#667f8a', weight: 2, interactive: false, dashArray: finished ? undefined : '5 4' };
      let path: L.Polyline | L.Polygon | undefined;
      let circle: L.Polygon | undefined;
      if (mode === 'radius' && points.length === 2) {
        const ring = radiusRing(points).map(point => L.latLng(point.lat, point.lng));
        if (ring.length) circle = L.polygon(ring, { ...style, fillOpacity: 0.06 }).addTo(layer);
      }
      if (mode === 'area' && points.length >= 3) path = L.polygon(positions, { ...style, fillOpacity: 0.08 }).addTo(layer);
      else if (points.length >= 2) path = L.polyline(positions, style).addTo(layer);
      points.forEach((point, index) => {
        if (!editable || !enabled) { L.circleMarker([point.lat, point.lng], { ...style, radius: 3, color: '#fff', fillColor: style.color, fillOpacity: 1 }).addTo(layer); return; }
        const canEdit = !finished || session.editing;
        const icon = L.divIcon({ className: `map-measure-vertex${canEdit ? ' is-editable' : ''}${mode === 'angle' ? ' has-number' : ''}`, html: `<span>${mode === 'angle' ? index + 1 : ''}</span>`, iconSize: [24, 24], iconAnchor: [12, 12] });
        const marker = L.marker([point.lat, point.lng], { icon, draggable: canEdit, interactive: canEdit, keyboard: canEdit, bubblingMouseEvents: false, title: canEdit ? (locale === 'vi' ? `Kéo điểm ${index + 1}` : `Drag point ${index + 1}`) : undefined }).addTo(layer);
        marker.on('drag', () => {
          const moved = positions.slice(); moved[index] = marker.getLatLng(); path?.setLatLngs(moved);
          if (circle) {
            const draft = moved.map(p => measurementPoint(p.lat, p.lng));
            if (draft.every(p => p !== null)) circle.setLatLngs(radiusRing(draft).map(p => L.latLng(p.lat, p.lng)));
          }
        });
        marker.on('dragend', () => {
          const position = marker.getLatLng(), updated = measurementPoint(position.lat, position.lng);
          if (!updated) { marker.setLatLng(positions[index]); path?.setLatLngs(positions); setOutside(true); return; }
          const hit = live.current.snap ? snapMeasurement(updated, live.current.sources, p => props.mapRef.current!.latLngToContainerPoint([p.lat, p.lng])).point : updated;
          live.current.dispatch({ type: 'points', points: live.current.session.points.map((old, i) => i === index ? hit : old) });
          setOutside(false);
        });
        marker.on('click', () => { if (!finished && index === 0 && mode === 'area' && canFinish(mode, points)) live.current.dispatch({ type: 'finish' }); });
        marker.on('dblclick', () => { if (!finished && index === points.length - 1) live.current.dispatch({ type: 'finish' }); });
      });
      if (labels && finished && canFinish(mode, points) && positions.length) {
        const label = document.createElement('span');
        const result = measurementResults(mode, points, units, locale)[0];
        label.textContent = (title ? title + '  ' : '') + (mode === 'location' ? `${points[0].lat.toFixed(5)}°, ${points[0].lng.toFixed(5)}°` : result?.[1]);
        label.title = result?.[0] ?? '';
        const anchor = mode === 'area' && path instanceof L.Polygon ? path.getCenter() : positions.at(-1)!;
        const tooltip = L.tooltip({ permanent: true, direction: 'auto', className: 'map-measure-label', offset: [10, 0] }).setLatLng(anchor).setContent(label).addTo(layer);
        if (editable) resultLabels.current.unshift(tooltip); else resultLabels.current.push(tooltip);
      }
    };
    session.saved.filter(item => item.visible).forEach(item => draw(item.mode, item.points, true, false, `#${item.id}`));
    if (enabled || session.finished) draw(session.mode, session.points, session.finished, true);
    if (props.mapRef.current) positionMeasurementLabels(props.mapRef.current, resultLabels.current);
  }, [props.session, props.enabled, props.units, props.locale, props.labels, props.mapRef]);
  useEffect(() => {
    const layer = preview.current; layer?.clearLayers();
    if (!layer || !props.enabled || props.session.finished || !hover) return;
    const points = measurementPreviewPoints(props.session.mode, props.session.points, hover.point), positions = points.map(point => L.latLng(point.lat, point.lng));
    const style = { pane: 'measurementPane', color: '#0c7560', weight: 1.5, interactive: false, dashArray: '4 5' };
    if (props.session.mode === 'radius' && points.length === 2) L.polygon(radiusRing(points).map(point => L.latLng(point.lat, point.lng)), { ...style, fillOpacity: 0.04 }).addTo(layer);
    else if (props.session.mode === 'area' && points.length >= 3) L.polygon(positions, { ...style, fillOpacity: 0.04 }).addTo(layer);
    else if (points.length >= 2) L.polyline(positions, style).addTo(layer);
    if (hover.name) L.circleMarker([hover.point.lat, hover.point.lng], { ...style, radius: 7, weight: 2, fillOpacity: 0 }).addTo(layer);
  }, [hover, props.enabled, props.session]);
  return { hover: props.session.finished ? null : hover, outside };
}
