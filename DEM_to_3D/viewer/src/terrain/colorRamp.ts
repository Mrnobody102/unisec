import * as THREE from 'three';
import type { TerrainMetadata } from '../types/terrain';

type RampStop = {
  position: number;
  color: THREE.Color;
};

// A deliberately muted palette keeps bare terrain readable without competing
// with the application's overlays.  The stops are ordered from low to high
// real-world elevation.
const RAMP_STOPS: readonly RampStop[] = [
  { position: 0, color: new THREE.Color('#12355b') },
  { position: 0.3, color: new THREE.Color('#1f7a6e') },
  { position: 0.55, color: new THREE.Color('#6b9e4a') },
  { position: 0.75, color: new THREE.Color('#c69c4a') },
  { position: 1, color: new THREE.Color('#8c4f2f') },
];

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

function colorAt(value: number): THREE.Color {
  const t = clamp01(value);
  if (t <= RAMP_STOPS[0].position) return RAMP_STOPS[0].color.clone();

  for (let index = 1; index < RAMP_STOPS.length; index += 1) {
    const upper = RAMP_STOPS[index];
    const lower = RAMP_STOPS[index - 1];
    if (t <= upper.position) {
      const span = upper.position - lower.position;
      const localT = span > 0 ? (t - lower.position) / span : 0;
      return lower.color.clone().lerp(upper.color, localT);
    }
  }

  return RAMP_STOPS[RAMP_STOPS.length - 1].color.clone();
}

function containsTexture(value: unknown, seen: Set<object>): boolean {
  if (!value || typeof value !== 'object') return false;
  if ((value as { isTexture?: boolean }).isTexture === true) return true;
  if (seen.has(value)) return false;
  seen.add(value);

  // Built-in materials expose maps directly.  Looking through arrays and
  // uniform-like records also protects custom materials without requiring a
  // list of every possible map property.
  if (Array.isArray(value)) return value.some((item) => containsTexture(item, seen));
  if (value instanceof THREE.Material) return Object.values(value).some((item) => containsTexture(item, seen));
  return false;
}

function materialHasTexture(material: THREE.Material): boolean {
  return containsTexture(material, new Set<object>());
}

function meshMaterials(mesh: THREE.Mesh): THREE.Material[] {
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  return materials.filter((material): material is THREE.Material => Boolean(material));
}

/**
 * Add elevation-derived vertex colors to meshes that do not have textures.
 *
 * Scene Y is converted back to real elevation using the asset contract before
 * normalization, so vertical exaggeration does not distort the color bands.
 * Textured meshes are intentionally left untouched.
 */
export function applyElevationColorRamp(root: THREE.Object3D, metadata: TerrainMetadata): number {
  root.updateMatrixWorld(true);

  const { min, max, base_elevation: baseElevation, exaggeration } = metadata.elevation;
  const range = max - min;
  const safeExaggeration = Number.isFinite(exaggeration) && exaggeration > 0 ? exaggeration : 1;
  let changedMeshes = 0;

  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh || !mesh.geometry?.isBufferGeometry) return;

    const materials = meshMaterials(mesh);
    if (materials.length === 0 || materials.some(materialHasTexture)) return;

    const position = mesh.geometry.getAttribute('position');
    if (!position || position.itemSize < 3 || position.count === 0) return;

    const colors = new Float32Array(position.count * 3);
    const vertex = new THREE.Vector3();
    for (let index = 0; index < position.count; index += 1) {
      vertex.fromBufferAttribute(position, index).applyMatrix4(mesh.matrixWorld);
      const elevation = Number.isFinite(vertex.y) ? vertex.y / safeExaggeration + baseElevation : min;
      const normalized = range > 0 && Number.isFinite(elevation) ? (elevation - min) / range : 0.5;
      const color = colorAt(normalized);
      const offset = index * 3;
      colors[offset] = color.r;
      colors[offset + 1] = color.g;
      colors[offset + 2] = color.b;
    }

    mesh.geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    materials.forEach((material) => {
      material.vertexColors = true;
      material.needsUpdate = true;
    });
    changedMeshes += 1;
  });

  return changedMeshes;
}
