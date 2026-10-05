import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { applyElevationColorRamp } from './colorRamp';
import type { TerrainMetadata } from '../types/terrain';

const metadata: TerrainMetadata = {
  schema_version: 1,
  asset_id: 'color-ramp-test',
  crs: { authority: 'EPSG', code: 32648, proj4: '+proj=utm +zone=48 +units=m', linear_unit: 'metre' },
  scene_axes: { x: 'east', y: 'up', z: 'negative_north' },
  world_origin: { x: 0, y: 0 },
  grid: { file: 'terrain.grid.bin', shape: [2, 2], shape_order: 'rows_cols', dtype: 'float32', byte_order: 'little_endian', layout: 'row_major', nodata_encoding: 'nan', elevation_unit: 'metre', sampling_method: 'nearest_subsample', source_step: 1, byte_length: 16 },
  grid_transform: { a: 1, b: 0, c: 0, d: 0, e: -1, f: 2, convention: 'rasterio_affine', pixel_reference: 'center' },
  elevation: { base_elevation: 100, exaggeration: 2, normalize_base: true, min: 100, max: 200 },
  analysis_supported: true,
};

function meshAtHeights(heights: number[], material: THREE.Material): THREE.Mesh {
  const positions = new Float32Array(heights.flatMap((height, index) => [index, height, 0]));
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  return new THREE.Mesh(geometry, material);
}

describe('applyElevationColorRamp', () => {
  it('assigns non-white vertex colors from actual scene elevation', () => {
    const root = new THREE.Group();
    const mesh = meshAtHeights([0, 100, 200], new THREE.MeshStandardMaterial({ color: '#ffffff' }));
    root.add(mesh);

    const changed = applyElevationColorRamp(root, metadata);

    expect(changed).toBe(1);
    const colors = mesh.geometry.getAttribute('color');
    expect(colors).toBeDefined();
    expect(colors!.count).toBe(3);
    expect(Array.from(colors!.array)).not.toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1]);
    expect(Array.from(colors!.array.slice(0, 3))).not.toEqual(Array.from(colors!.array.slice(6, 9)));
    expect((mesh.material as THREE.MeshStandardMaterial).vertexColors).toBe(true);
  });

  it('leaves textured meshes unchanged', () => {
    const root = new THREE.Group();
    const material = new THREE.MeshStandardMaterial({ color: '#ffffff', map: new THREE.Texture() });
    const mesh = meshAtHeights([0, 100, 200], material);
    root.add(mesh);

    expect(applyElevationColorRamp(root, metadata)).toBe(0);
    expect(mesh.geometry.getAttribute('color')).toBeUndefined();
    expect((mesh.material as THREE.MeshStandardMaterial).vertexColors).toBe(false);
  });
});
