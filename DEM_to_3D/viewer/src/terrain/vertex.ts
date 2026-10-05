import * as THREE from 'three';
import type { TerrainMetadata } from '../types/terrain';
import type { ProjectedPoint, ScenePoint } from './coordinate';
import { projectedToPixel, sceneToProjected } from './coordinate';

export type ProjectedVertex = {
  id: string;
  projected: ProjectedPoint;
  elevation: number;
  scene?: ScenePoint;
};

export type VertexProfilePoint = ProjectedVertex & {
  t: number;
  distance: number;
  offset: number;
  row: number;
  column: number;
};

export function vertexTolerance(metadata: TerrainMetadata): number {
  const t = metadata.grid_transform;
  const pixelWidth = Math.hypot(t.a, t.d);
  const pixelHeight = Math.hypot(t.b, t.e);
  return 0.5 * Math.hypot(pixelWidth, pixelHeight);
}

export function selectVerticesAlongLine(
  vertices: ProjectedVertex[],
  start: ProjectedPoint,
  end: ProjectedPoint,
  metadata: TerrainMetadata,
  tolerance = vertexTolerance(metadata),
  epsilon = 1e-6,
): VertexProfilePoint[] {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lineLength = Math.hypot(dx, dy);
  if (lineLength <= epsilon) return [];
  const denominator = lineLength * lineLength;
  const candidates = vertices.flatMap((vertex) => {
    const px = vertex.projected.x - start.x;
    const py = vertex.projected.y - start.y;
    const t = (px * dx + py * dy) / denominator;
    const offset = Math.abs(dx * py - dy * px) / lineLength;
    if (t < -epsilon || t > 1 + epsilon || offset > tolerance) return [];
    const pixel = projectedToPixel(metadata, vertex.projected.x, vertex.projected.y);
    return [{ ...vertex, t: Math.min(1, Math.max(0, t)), distance: Math.min(1, Math.max(0, t)) * lineLength, offset, row: Math.round(pixel.row), column: Math.round(pixel.column) }];
  });
  candidates.sort((left, right) => left.distance - right.distance || left.id.localeCompare(right.id));
  return candidates.filter((candidate, index) => index === 0 || candidate.distance - candidates[index - 1].distance > epsilon);
}

export function extractProjectedVertices(root: THREE.Object3D, metadata: TerrainMetadata): ProjectedVertex[] {
  root.updateWorldMatrix(true, true);
  const vertices: ProjectedVertex[] = [];
  const position = new THREE.Vector3();
  let ordinal = 0;
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh || !mesh.geometry.getAttribute('position')) return;
    const attribute = mesh.geometry.getAttribute('position');
    for (let index = 0; index < attribute.count; index += 1) {
      position.fromBufferAttribute(attribute, index).applyMatrix4(mesh.matrixWorld);
      const scene: ScenePoint = { x: position.x, y: position.y, z: position.z };
      const converted = sceneToProjected(metadata, scene);
      vertices.push({ id: `${mesh.uuid}:${index}:${ordinal++}`, projected: converted.projected, elevation: converted.elevation, scene });
    }
  });
  return vertices;
}
