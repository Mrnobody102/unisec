import * as THREE from 'three';
import type { Community, Hazard, Locale } from '../types/dear';
import type { TerrainMetadata } from '../types/terrain';
import type { OverlayHit } from './scenarioOverlays';
import { bilinearElevation } from './elevationGrid';
import { projectedToScene } from './coordinate';
import { mapSymbolSvg, type MapSymbolName } from './mapSymbols';

type Options = {
  metadata: TerrainMetadata; grid: Float32Array; transform: THREE.Matrix4;
  communities: Community[]; hazards: Hazard[]; layers: Record<string, boolean>;
  selectedCommunityId: string | null; selectedObjectId: string | null; locale: Locale;
  onSelect: (hit: OverlayHit) => void;
};
type Rect = { x: number; y: number; width: number; height: number };
const intersects = (a: Rect, b: Rect): boolean => a.x < b.x + b.width + 4 && a.x + a.width + 4 > b.x && a.y < b.y + b.height + 4 && a.y + a.height + 4 > b.y;

/** Screen-sized, keyboard-accessible markers remain legible while the terrain zooms. */
export function createScenarioMarkers(host: HTMLElement, options: Options): { update: (camera: THREE.Camera) => void; dispose: () => void } {
  const { metadata, grid, transform, communities, hazards, layers, locale } = options;
  const layer = document.createElement('div');
  layer.className = 'map-marker-layer';
  layer.dataset.basemap = layers.imagery === false ? 'terrain' : 'imagery';
  host.appendChild(layer);
  const markers: Array<{ button: HTMLButtonElement; label: HTMLSpanElement | null; point: THREE.Vector3; selected: boolean; priority: number; width: number; half: number }> = [];
  const add = (hit: OverlayHit, pos: { x: number; y: number }, name: string, kind: string, symbol: MapSymbolName, selected: boolean, labelVisible: boolean): void => {
    const sampled = bilinearElevation(grid, metadata, pos.x, pos.y);
    const displayName = name;
    const scene = projectedToScene(metadata, pos, (sampled.elevation ?? metadata.elevation.base_elevation) + 15);
    const button = document.createElement('button');
    button.className = `map-pin ${kind}${selected ? ' is-selected' : ''}`;
    button.type = 'button';
    button.title = displayName;
    button.setAttribute('aria-label', displayName);
    button.setAttribute('aria-pressed', String(selected));
    button.dataset.mapObject = `${hit.type}:${hit.id}`;
    button.innerHTML = mapSymbolSvg(symbol);
    let label: HTMLSpanElement | null = null;
    if (labelVisible) { label = document.createElement('span'); label.className = 'map-pin-label'; label.textContent = displayName; button.appendChild(label); }
    button.addEventListener('click', event => { event.stopPropagation(); options.onSelect(hit); });
    button.addEventListener('pointerdown', event => event.stopPropagation());
    layer.appendChild(button);
    markers.push({ button, label, point: new THREE.Vector3(scene.x, scene.y, scene.z).applyMatrix4(transform), selected, priority: selected ? 100 : kind.includes('is-priority') ? 50 : kind === 'staging' ? 30 : 10, width: 0, half: 14 });
  };
  if (layers.communities) communities.forEach(c => add({ type: 'community', id: c.id }, c.projected, c.name, `community${c.prio === 1 ? ' is-priority' : ''}`, 'community', c.id === options.selectedCommunityId, true));
  hazards.forEach(h => {
    const visible = h.kind === 'landslide' ? layers.landslide : h.kind === 'flood' ? layers.flood : layers.status;
    if (!visible) return;
    const name = locale === 'vi' ? h.name[0] : h.name[1];
    const selected = options.selectedObjectId === `hazard:${h.id}`;
    add({ type: 'hazard', id: h.id }, h.projected, name, `hazard ${h.kind}${h.observation === 'suspected' ? ' is-suspected' : ''}`, h.kind, selected, selected);
  });
  if (layers.staging) add({ type: 'poi', id: 'TOWN' }, { x: 399500, y: 2397000 }, locale === 'vi' ? 'Điểm tập kết' : 'Staging point', 'staging', 'staging', options.selectedObjectId === 'poi:TOWN', true);
  markers.sort((a, b) => b.priority - a.priority);
  // Measure the actual selected font, including Vietnamese diacritics.
  const measure = document.createElement('canvas').getContext('2d');
  const measureLabels = () => markers.forEach(marker => {
    if (!marker.label || !measure) return;
    const style = getComputedStyle(marker.label);
    measure.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    marker.width = Math.ceil(measure.measureText(marker.label.textContent ?? '').width) + 8;
  });
  measureLabels();
  let disposed = false;
  let lastCamera: THREE.Camera | undefined;
  const onFontsLoaded = () => { if (!disposed) { measureLabels(); if (lastCamera) update(lastCamera); } };
  document.fonts.addEventListener('loadingdone', onFontsLoaded);
  void document.fonts.ready.then(onFontsLoaded);
  const projected = new THREE.Vector3();
  const update = (camera: THREE.Camera): void => {
    lastCamera = camera;
    const width = host.clientWidth, height = host.clientHeight;
    const hostRect = host.getBoundingClientRect();
    const occupied: Rect[] = Array.from(host.parentElement?.querySelectorAll<HTMLElement>('.map-tools,.map-bottom-bar,.map-layer-launcher,.map-reference,.basemap-status,.layers-panel,.profile-panel') ?? []).filter(el => el.offsetHeight > 0).map(el => { const r = el.getBoundingClientRect(); return { x: r.x - hostRect.x, y: r.y - hostRect.y, width: r.width, height: r.height }; });
    const positions = markers.map(marker => {
      projected.copy(marker.point).project(camera);
      const x = (projected.x + 1) * width / 2, y = (1 - projected.y) * height / 2;
      const visible = projected.z >= -1 && projected.z <= 1 && x >= 14 && x <= width - 14 && y >= 14 && y <= height - 14;
      marker.button.hidden = !visible;
      if (visible) { marker.button.style.transform = `translate(${x - marker.half}px,${y - marker.half}px)`; occupied.push({ x: x - marker.half, y: y - marker.half, width: marker.half * 2, height: marker.half * 2 }); }
      return { marker, x, y, visible };
    });
    positions.forEach(({ marker, x, y, visible }) => {
      if (!visible || !marker.label) return;
      const choices = [{ x: x + 22, y: y - 10 }, { x: x - marker.width - 22, y: y - 10 }, { x: x - marker.width / 2, y: y - 43 }, { x: x - marker.width / 2, y: y + 22 }];
      const place = choices.find(p => p.x >= 6 && p.y >= 6 && p.x + marker.width <= width - 6 && p.y + 22 <= height - 6 && !occupied.some(r => intersects({ ...p, width: marker.width, height: 22 }, r)));
      marker.button.classList.toggle('is-label-hidden', !place);
      if (place) { marker.label.style.left = `${place.x - x + marker.half}px`; marker.label.style.top = `${place.y - y + marker.half}px`; occupied.push({ ...place, width: marker.width, height: 22 }); }
    });
  };
  return { update, dispose: () => { disposed = true; document.fonts.removeEventListener('loadingdone', onFontsLoaded); layer.remove(); } };
}
