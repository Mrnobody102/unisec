import * as THREE from 'three';
import type { Locale } from '../types/dear';
import type { TerrainMetadata } from '../types/terrain';
import { sceneToProjected } from './coordinate';

export function mapScale(metersPerPixel: number, maxWidth = 100): { meters: number; pixels: number } | null {
  if (!Number.isFinite(metersPerPixel) || metersPerPixel <= 0) return null;
  const limit = metersPerPixel * maxWidth;
  const magnitude = 10 ** Math.floor(Math.log10(limit));
  const factor = [5, 2, 1].find(n => n * magnitude <= limit) ?? 1;
  const meters = factor * magnitude;
  return { meters, pixels: meters / metersPerPixel };
}

/** Grid north in both modes. Local horizontal scale only in the overhead view. */
export function createMapReference(host: HTMLElement) {
  const north = document.createElement('div');
  north.className = 'map-reference map-north';
  north.innerHTML = '<span>N</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 5 17-5-4-5 4Z" fill="currentColor"/></svg>';
  const scale = document.createElement('div');
  scale.className = 'map-reference map-scale';
  const bar = document.createElement('i'), label = document.createElement('span');
  scale.append(label, bar);
  host.append(north, scale);
  const ray = new THREE.Raycaster(), plane = new THREE.Plane(), hitA = new THREE.Vector3(), hitB = new THREE.Vector3();
  return {
    update(camera: THREE.Camera, target: THREE.Vector3, bearing: number, mode: '2d' | '3d', locale: Locale, metadata?: TerrainMetadata, transform?: THREE.Matrix4) {
      const valid = Boolean(metadata && metadata.crs.linear_unit === 'metre' && transform);
      north.hidden = !valid;
      north.title = locale === 'vi' ? 'Bắc lưới tọa độ' : 'Grid north';
      north.setAttribute('aria-label', north.title);
      north.querySelector('svg')!.style.transform = `rotate(${bearing * 180 / Math.PI}deg)`;
      scale.hidden = true;
      if (!valid || mode !== '2d' || !host.clientWidth) return;
      plane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 1, 0), target);
      ray.setFromCamera(new THREE.Vector2(0, 0), camera);
      if (!ray.ray.intersectPlane(plane, hitA)) return;
      ray.setFromCamera(new THREE.Vector2(2 / host.clientWidth, 0), camera);
      if (!ray.ray.intersectPlane(plane, hitB)) return;
      const inverse = transform!.clone().invert();
      const a = sceneToProjected(metadata!, hitA.applyMatrix4(inverse)).projected;
      const b = sceneToProjected(metadata!, hitB.applyMatrix4(inverse)).projected;
      const value = mapScale(Math.hypot(a.x - b.x, a.y - b.y));
      if (!value) return;
      const text = value.meters >= 1000 ? `${value.meters / 1000} km` : `${value.meters} m`;
      if (label.textContent !== text) label.textContent = text;
      bar.style.width = `${value.pixels}px`;
      scale.title = locale === 'vi' ? 'Khoảng cách trên mặt phẳng ngang tại tâm bản đồ' : 'Horizontal distance at map center';
      scale.hidden = false;
    },
    dispose() { north.remove(); scale.remove(); },
  };
}
