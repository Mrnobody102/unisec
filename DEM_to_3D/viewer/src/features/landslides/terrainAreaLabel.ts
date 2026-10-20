import * as THREE from 'three';
import pointOnFeature from '@turf/point-on-feature';
import proj4 from 'proj4';
import type { GeometryRecord } from '../../geo/vector/types';
import type { Locale } from '../../types/dear';
import type { TerrainMetadata } from '../../types/terrain';
import { areaMapLabel } from './areaMapLabel';
import { landslideAreaOf } from './landslideAreas';
import { bilinearElevation } from '../../terrain/elevationGrid';
import { projectedToScene } from '../../terrain/coordinate';

export function terrainAreaLabel(host: HTMLElement, record: GeometryRecord, metadata: TerrainMetadata, grid: Float32Array, transform: THREE.Matrix4, locale: Locale) {
  if (!landslideAreaOf(record)) return null;
  const [x,y] = proj4('EPSG:4326',metadata.crs.proj4 || `${metadata.crs.authority}:${metadata.crs.code}`,pointOnFeature(record.feature).geometry.coordinates);
  const elevation = bilinearElevation(grid,metadata,x,y).elevation;
  if (elevation === undefined) return null;
  const p = projectedToScene(metadata,{x,y},elevation + 5);
  const anchor = new THREE.Vector3(p.x,p.y,p.z).applyMatrix4(transform), projected = new THREE.Vector3();
  const label = areaMapLabel(record,locale);label.classList.add('terrain-area-label');host.append(label);
  return {
    update: (camera: THREE.Camera) => {
      projected.copy(anchor).project(camera);
      const x = (projected.x + 1)*host.clientWidth/2, y = (1-projected.y)*host.clientHeight/2;
      if (projected.z < -1 || projected.z > 1 || x < 0 || x > host.clientWidth || y < 0 || y > host.clientHeight || host.clientWidth < 120) {
        label.hidden = true; return;
      }
      // A hidden element has zero dimensions. Measure the actual label before placement.
      label.hidden = false;
      const width = label.offsetWidth, height = label.offsetHeight;
      const bounds = host.getBoundingClientRect();
      const controls = [...(host.closest('.map-area')?.querySelectorAll<HTMLElement>('#response-details,.field-map-card,.map-toolbar,.layers-panel,.map-tools,.profile-panel,.map-attribution') ?? [])]
        .map(control => control.getBoundingClientRect()).filter(rect => rect.width && rect.height);
      const left = Math.max(12, Math.min(host.clientWidth - width - 12, x - width/2));
      const top = [y - height - 14, y + 14].find(candidate => candidate >= 12 && candidate + height <= host.clientHeight - 12 &&
        !controls.some(rect => left+bounds.x < rect.right && left+bounds.x+width > rect.left && candidate+bounds.y < rect.bottom && candidate+bounds.y+height > rect.top));
      label.hidden = top === undefined;
      if (top !== undefined) label.style.transform = `translate(${left}px,${top}px)`;
    },
    dispose: () => label.remove()
  };
}
