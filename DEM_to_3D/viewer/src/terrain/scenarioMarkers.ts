import * as THREE from 'three';
import type { TerrainMetadata } from '../types/terrain';
import { terrainSurfaceElevation } from './terrainSurface';
import { projectedToScene } from './coordinate';
import { createScreenMarkers, type ScreenMarkerOptions } from './screenMarkers';

export function createScenarioMarkers(host: HTMLElement, options: ScreenMarkerOptions & {
  metadata: TerrainMetadata; grid: Float32Array; transform: THREE.Matrix4;
  elevationAt?: (x: number, y: number) => number | undefined;
}) {
  const screen = createScreenMarkers(host, options);
  const point = new THREE.Vector3();
  return {
    update(camera: THREE.Camera): void {
      screen.update(position => {
        const elevation = options.elevationAt ? options.elevationAt(position.x, position.y) : terrainSurfaceElevation(options.grid, options.metadata, position.x, position.y);
        // Outside every DEM a point can only rest on the flat regional basemap.
        if (elevation === undefined && options.layers.context === false) return null;
        const local = projectedToScene(options.metadata, position, (elevation ?? options.metadata.elevation.base_elevation) + 3);
        point.set(local.x, local.y, local.z).applyMatrix4(options.transform).project(camera);
        return point.z >= -1 && point.z <= 1 ? {
          x: (point.x + 1) * host.clientWidth / 2, y: (1 - point.y) * host.clientHeight / 2
        } : null;
      });
    },
    dispose: screen.dispose
  };
}
