import * as THREE from 'three';
import proj4 from 'proj4';
import type { GeometryRecord } from '../geo/vector/types';
import type { TerrainMetadata } from '../types/terrain';
import { terrainSurfaceElevation } from './terrainSurface';
import { projectedToScene } from './coordinate';
import { surveyPointSvg } from './poiFrame';

type Surface = {
  model: {metadata?: TerrainMetadata | null; grid?: Float32Array | null};
  group: THREE.Object3D;
};

/** Preserve survey Z in the record; place its display anchor on an available DEM. */
export function terrainReferencePoints(
  host: HTMLElement,
  records: GeometryRecord[],
  selectedId: string | null,
  surfaces: Surface[],
  onSelect: (id: string) => void,
  contextPoint?: (x:number,y:number)=>THREE.Vector3|undefined,
) {
  const layer = document.createElement('div');
  layer.className = 'terrain-reference-layer';
  host.append(layer);

  const markers = records.flatMap(record => {
    if (!record.visible || !record.feature.properties.sourceDatasetId || record.feature.geometry.type !== 'Point') return [];
    let anchor: THREE.Vector3 | null = null;
    for (const surface of surfaces) {
      const {metadata, grid} = surface.model;
      if (!metadata || !grid) continue;
      const crs = metadata.crs.proj4 || `${metadata.crs.authority}:${metadata.crs.code}`;
      const [x, y] = proj4('EPSG:4326', crs, record.feature.geometry.coordinates.slice(0, 2));
      const elevation = terrainSurfaceElevation(grid, metadata, x, y);
      if (elevation === undefined) continue;
      const point = projectedToScene(metadata, {x, y}, elevation + 3);
      anchor = new THREE.Vector3(point.x, point.y, point.z).applyMatrix4(surface.group.matrixWorld);
      break;
    }
    if (!anchor && contextPoint) {
      const metadata=surfaces.find(surface=>surface.model.metadata)?.model.metadata;
      if(metadata){const [x,y]=proj4('EPSG:4326',metadata.crs.proj4||`${metadata.crs.authority}:${metadata.crs.code}`,record.feature.geometry.coordinates.slice(0,2));anchor=contextPoint(x,y)??null;}
    }
    if (!anchor) return [];

    const selected = record.id === selectedId;
    const button = document.createElement('button');
    button.className = 'terrain-reference-point' + (selected ? ' is-selected' : '');
    button.setAttribute('aria-label', record.name);
    button.setAttribute('aria-pressed', String(selected));
    button.dataset.mapReference = record.id;
    button.innerHTML = surveyPointSvg(selected);
    const label = document.createElement('span');
    label.className = 'terrain-reference-label';
    label.textContent = record.name;
    button.append(label);
    for (const event of ['pointerdown', 'mousedown', 'touchstart', 'dblclick']) {
      button.addEventListener(event, e => e.stopPropagation());
    }
    button.addEventListener('click', e => {
      e.stopPropagation();
      onSelect(record.id);
    });
    layer.append(button);
    return [{button, anchor, selected}];
  });

  const projected = new THREE.Vector3();
  return {
    update: (camera: THREE.Camera) => {
      const bounds = host.getBoundingClientRect();
      const controls = [...(host.closest('.workspace')?.querySelectorAll<HTMLElement>(
        '#response-details,.field-map-card,.map-toolbar,.map-advanced-tools,.layers-panel,.map-tools',
      ) ?? [])].map(element => element.getBoundingClientRect());
      for (const marker of markers) {
        projected.copy(marker.anchor).project(camera);
        const x = (projected.x + 1) * host.clientWidth / 2;
        const y = (1 - projected.y) * host.clientHeight / 2;
        const covered = controls.some(rect => rect.width > 0 && rect.height > 0 &&
          x + bounds.x > rect.left - 12 && x + bounds.x < rect.right + 12 &&
          y + bounds.y > rect.top - 12 && y + bounds.y < rect.bottom + 12);
        marker.button.hidden = projected.z < -1 || projected.z > 1 || covered ||
          x < 0 || y < 0 || x > host.clientWidth || y > host.clientHeight;
        marker.button.style.transform = `translate(${x - 14}px,${y - 14}px)`;
        // Use the side with room; long survey names remain inspectable in the card.
        const left = x - 40, right = host.clientWidth - x - 40;
        marker.button.classList.toggle('label-left', left > right);
        marker.button.style.setProperty('--reference-label-width', `${Math.max(32, Math.min(260, Math.max(left, right)))}px`);
      }
    },
    dispose: () => layer.remove(),
  };
}
