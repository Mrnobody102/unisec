import { expect, it } from 'vitest';
import * as THREE from 'three';
import { frameCameraPoints } from './cameraFraming';
it('fits the route beside a dock at the same orbit angle and leaves empty data alone', () => {
  const camera = new THREE.PerspectiveCamera(45,1000/700,.1,100000);
  const target = new THREE.Vector3();camera.position.set(400,600,500);camera.lookAt(target);camera.updateMatrixWorld();
  const orientation = camera.quaternion.clone();
  const points = [new THREE.Vector3(-900,0,0),new THREE.Vector3(0,320,-150),new THREE.Vector3(700,110,220)];
  const view = {width:1000,height:700,right:400,minDistance:50,maxDistance:100000};
  const pose = frameCameraPoints(camera,target,points,view)!;
  camera.position.copy(pose.position);camera.lookAt(pose.target);camera.updateMatrixWorld();
  expect(camera.quaternion.angleTo(orientation)).toBeLessThan(.000001);
  for(const point of points) {
    const projected = point.clone().project(camera), x = (projected.x+1)*500, y = (1-projected.y)*350;
    expect(x).toBeGreaterThan(30);expect(x).toBeLessThan(600-30);expect(y).toBeGreaterThan(30);expect(y).toBeLessThan(700-30);
  }
  expect(frameCameraPoints(camera,target,[],view)).toBeNull();
});
