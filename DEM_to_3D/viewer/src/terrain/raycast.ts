import * as THREE from 'three';
import { acceleratedRaycast, computeBoundsTree, disposeBoundsTree } from 'three-mesh-bvh';

let patched = false;

export function enableBvh(): void {
  if (patched) return;
  const geometryPrototype = THREE.BufferGeometry.prototype as THREE.BufferGeometry & { computeBoundsTree?: typeof computeBoundsTree; disposeBoundsTree?: typeof disposeBoundsTree };
  geometryPrototype.computeBoundsTree = computeBoundsTree;
  geometryPrototype.disposeBoundsTree = disposeBoundsTree;
  (THREE.Mesh.prototype as THREE.Mesh & { raycast: typeof acceleratedRaycast }).raycast = acceleratedRaycast;
  patched = true;
}

export function buildBvh(root: THREE.Object3D): THREE.Mesh[] {
  enableBvh();
  const meshes: THREE.Mesh[] = [];
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    const geometry = mesh.geometry as THREE.BufferGeometry & { computeBoundsTree?: () => void };
    geometry.computeBoundsTree?.();
    meshes.push(mesh);
  });
  return meshes;
}

export function disposeBvh(root: THREE.Object3D): void {
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    const geometry = mesh.geometry as THREE.BufferGeometry & { disposeBoundsTree?: () => void };
    geometry.disposeBoundsTree?.();
  });
}

/** Dispose CPU/GPU resources owned by a loaded terrain exactly once. */
export function disposeObjectResources(root: THREE.Object3D, disposeBvhResources = true): void {
  if (disposeBvhResources) disposeBvh(root);
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    geometries.add(mesh.geometry);
    const meshMaterials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    meshMaterials.forEach((material) => {
      if (!material) return;
      materials.add(material);
      Object.values(material as unknown as Record<string, unknown>).forEach((value) => {
        if (value instanceof THREE.Texture) textures.add(value);
      });
    });
  });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
  textures.forEach((texture) => texture.dispose());
}
