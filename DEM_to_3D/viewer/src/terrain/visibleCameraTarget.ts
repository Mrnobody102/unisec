import * as THREE from "three";
/** World translation which keeps a centred point in the part of the view left of a dock. */
export function visibleCameraOffset(
  camera: THREE.Camera,
  point: THREE.Vector3,
  right: number,
  width: number,
): THREE.Vector3 {
  if (
    !Number.isFinite(right) ||
    !Number.isFinite(width) ||
    width <= 0 ||
    right <= 0
  )
    return new THREE.Vector3();
  camera.updateMatrixWorld();
  const depth = point.clone().project(camera).z;
  const centre = new THREE.Vector3(0, 0, depth).unproject(camera);
  const shifted = new THREE.Vector3(
    Math.min(right, Math.max(0, width - 120)) / width,
    0,
    depth,
  ).unproject(camera);
  return shifted.sub(centre);
}
