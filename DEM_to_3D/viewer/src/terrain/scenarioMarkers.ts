import * as THREE from 'three';
import type { TerrainMetadata } from '../types/terrain';
import { bilinearElevation } from './elevationGrid';
import { projectedToScene } from './coordinate';
import { createScreenMarkers, type ScreenMarkerOptions } from './screenMarkers';

export function createScenarioMarkers(host: HTMLElement, options: ScreenMarkerOptions & {
  metadata: TerrainMetadata; grid: Float32Array; transform: THREE.Matrix4;
}) {
  const screen = createScreenMarkers(host, options);
  const point = new THREE.Vector3();
  return {
    update(camera: THREE.Camera): void {
      screen.update(position => {
        const sampled = bilinearElevation(options.grid, options.metadata, position.x, position.y);
        const local = projectedToScene(options.metadata, position, (sampled.elevation ?? options.metadata.elevation.base_elevation) + 15);
        point.set(local.x, local.y, local.z).applyMatrix4(options.transform).project(camera);
        return point.z >= -1 && point.z <= 1 ? {
          x: (point.x + 1) * host.clientWidth / 2, y: (1 - point.y) * host.clientHeight / 2
        } : null;
      });
    },
    dispose: screen.dispose
  };
}
