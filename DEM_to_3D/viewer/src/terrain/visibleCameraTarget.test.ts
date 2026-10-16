import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { visibleCameraOffset } from "./visibleCameraTarget";
describe("selection beside the detail dock", () => {
  it("keeps scale, tilt and vertical position while centring in the visible width", () => {
    const camera = new THREE.PerspectiveCamera(45, 1000 / 700, 0.1, 10000),
      point = new THREE.Vector3(12, 3, -8);
    camera.position.set(12, 103, 92);
    camera.lookAt(point);
    camera.updateMatrixWorld();
    const before = camera.position.distanceTo(point),
      orientation = camera.quaternion.clone();
    const offset = visibleCameraOffset(camera, point, 400, 1000);
    camera.position.add(offset);
    camera.updateMatrixWorld();
    const pixel = point.clone().project(camera);
    expect(pixel.x).toBeCloseTo(-0.4, 6);
    expect(pixel.y).toBeCloseTo(0, 6);
    expect(camera.quaternion.equals(orientation)).toBe(true);
    // Translation along the view plane preserves depth and zoom.
    expect(point.clone().applyMatrix4(camera.matrixWorldInverse).z).toBeCloseTo(
      -before,
      6,
    );
  });
  it("ignores absent or invalid reserved width", () => {
    const camera = new THREE.PerspectiveCamera();
    expect(
      visibleCameraOffset(camera, new THREE.Vector3(), 0, 1000).length(),
    ).toBe(0);
    expect(
      visibleCameraOffset(camera, new THREE.Vector3(), 400, 0).length(),
    ).toBe(0);
  });
});
