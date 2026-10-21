import { placeMapLabel } from '../../terrain/markerLayout';
import { areaLabelObstacles } from './areaLabelLayout';
import * as THREE from 'three';
import pointOnFeature from '@turf/point-on-feature';
import proj4 from 'proj4';
import type { GeometryRecord } from '../../geo/vector/types';
import type { Locale } from '../../types/dear';
import type { TerrainMetadata } from '../../types/terrain';
import { areaMapLabel } from './areaMapLabel';
import { landslideAreaOf } from './landslideAreas';
import { terrainSurfaceElevation } from '../../terrain/terrainSurface';
import { projectedToScene } from '../../terrain/coordinate';

export function terrainAreaLabel(host: HTMLElement, record: GeometryRecord, metadata: TerrainMetadata, grid: Float32Array, transform: THREE.Matrix4, locale: Locale) {
  if (!landslideAreaOf(record)) return null;
  const [x,y] = proj4('EPSG:4326',metadata.crs.proj4 || `${metadata.crs.authority}:${metadata.crs.code}`,pointOnFeature(record.feature).geometry.coordinates);
  const elevation = terrainSurfaceElevation(grid,metadata,x,y);
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
      const position=placeMapLabel({x,y},{width,height},{width:host.clientWidth,height:host.clientHeight},areaLabelObstacles(host));
      label.hidden = !position;
      if (position) label.style.transform = `translate(${position.x}px,${position.y}px)`;
    },
    dispose: () => label.remove()
  };
}
