import {poiFrameSvg, markerSize, poiMetrics} from '../../terrain/poiFrame';
import type {FieldObservation} from './model';

/** Same evidence symbol in Leaflet and the terrain's screen-space layer. */
export function observationSymbol(id: string, observation: FieldObservation, selected: boolean): HTMLSpanElement {
  const icon = document.createElement('span'), glyph = document.createElement('b');
  const metrics = poiMetrics(markerSize(false,selected),selected);
  icon.className = 'field-map-symbol';
  icon.style.width = `${metrics.half * 2}px`;
  icon.style.height = `${metrics.height}px`;
  icon.setAttribute('aria-hidden','true');
  icon.dataset.fieldId = id;
  icon.innerHTML = poiFrameSvg(selected);
  glyph.textContent = observation.kind === 'survey' ? 'i' : '!';
  icon.append(glyph);
  return icon;
}
