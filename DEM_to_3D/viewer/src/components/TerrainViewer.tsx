import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { LoadedModel, HoverInfo, TerrainPoint } from '../types/terrain';
import { bilinearElevation } from '../terrain/elevationGrid';
import { formatHover, projectedToScene, projectedToPixel, sceneToProjected } from '../terrain/coordinate';
import { buildBvh, disposeBvh } from '../terrain/raycast';
import type { SurfaceProfile } from '../terrain/profile';
import type { GeographicPlacement } from '../terrain/geographic';
import { applyElevationColorRamp } from '../terrain/colorRamp';

type Props = {
  models: LoadedModel[];
  geographicPlacements?: GeographicPlacement[];
  onHover: (info: HoverInfo | null) => void;
  measureMode?: boolean;
  onPick?: (point: TerrainPoint) => void;
  focusPoint?: { x: number; y: number; z: number } | null;
  profile?: SurfaceProfile | null;
  profileMetadata?: LoadedModel['metadata'];
};

type ModelEntry = { model: LoadedModel; root: THREE.Object3D; group: THREE.Group; meshes: THREE.Mesh[] };

function configureRoot(root: THREE.Object3D, model: LoadedModel): void {
  if (root.userData.terrainViewerConfigured) return;
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    const material = mesh.material as THREE.MeshStandardMaterial;
    if (material?.isMeshStandardMaterial) {
      material.roughness = 0.92;
      material.metalness = 0;
    }
  });
  if (model.metadata) applyElevationColorRamp(root, model.metadata);
  root.userData.terrainViewerConfigured = true;
}

function sampleModel(model: LoadedModel, localPoint: THREE.Vector3): { projected: { x: number; y: number }; elevation: number; row: number; column: number; interpolated: boolean } | null {
  if (!model.metadata) return null;
  const converted = sceneToProjected(model.metadata, localPoint);
  const pixel = projectedToPixel(model.metadata, converted.projected.x, converted.projected.y);
  const sampled = model.grid
    ? bilinearElevation(model.grid, model.metadata, converted.projected.x, converted.projected.y)
    : { elevation: undefined, row: Math.round(pixel.row), column: Math.round(pixel.column), interpolated: false };
  return { projected: converted.projected, elevation: sampled.elevation ?? converted.elevation, row: sampled.row, column: sampled.column, interpolated: sampled.interpolated };
}

export function TerrainViewer({ models, geographicPlacements, onHover, measureMode = false, onPick, focusPoint, profile = null, profileMetadata }: Props): JSX.Element {
  const hostRef = useRef<HTMLDivElement>(null);
  const measureModeRef = useRef(measureMode);
  const onPickRef = useRef(onPick);
  const focusPointRef = useRef(focusPoint);
  const profileRef = useRef(profile);
  measureModeRef.current = measureMode;
  onPickRef.current = onPick;
  focusPointRef.current = focusPoint;
  profileRef.current = profile;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0b1220');
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1_000_000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setSize(host.clientWidth, host.clientHeight, false);
    renderer.domElement.className = 'terrain-canvas';
    host.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.screenSpacePanning = true;
    controls.target.set(0, 0, 0);

    scene.add(new THREE.HemisphereLight('#dbeafe', '#172033', 2.2));
    const sun = new THREE.DirectionalLight('#ffffff', 2.8);
    sun.position.set(1, 2, 1);
    scene.add(sun);

    const entries: ModelEntry[] = models.map((model, index) => {
      const root = model.gltf.scene;
      const group = new THREE.Group();
      group.name = `terrain-model-${model.id}`;
      const placement = geographicPlacements?.[index];
      if (placement) {
        group.position.set(placement.position.x, placement.position.y, placement.position.z);
        group.scale.set(1, placement.scaleY, 1);
      }
      configureRoot(root, model);
      group.add(root);
      scene.add(group);
      const meshes = buildBvh(root);
      model.bvhDisposed = false;
      return { model, root, group, meshes };
    });
    scene.updateMatrixWorld(true);
    const overlay = new THREE.Group();
    overlay.name = 'profile-overlay';
    scene.add(overlay);
    const focusMarker = new THREE.Mesh(
      new THREE.SphereGeometry(2.5, 16, 12),
      new THREE.MeshBasicMaterial({ color: '#fbbf24', depthTest: false }),
    );
    focusMarker.visible = false;
    focusMarker.renderOrder = 10;
    scene.add(focusMarker);
    // GLB coordinates already follow the contract.  The origin is therefore
    // applied exactly once by the exporter; do not translate again here.
    const bounds = new THREE.Box3();
    entries.forEach((entry) => bounds.expandByObject(entry.group));
    const center = bounds.isEmpty() ? new THREE.Vector3() : bounds.getCenter(new THREE.Vector3());
    const size = bounds.isEmpty() ? new THREE.Vector3(1, 1, 1) : bounds.getSize(new THREE.Vector3());
    const maxDimension = Math.max(size.x, size.y, size.z, 1);
    const distance = (maxDimension / 2) / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * 1.35;
    camera.position.copy(center).add(new THREE.Vector3(distance * 0.72, distance * 0.62, distance * 0.72));
    camera.near = Math.max(distance / 10_000, 0.01);
    camera.far = Math.max(distance * 20, 1000);
    camera.updateProjectionMatrix();
    controls.target.copy(center);
    const meshEntries = new Map<THREE.Object3D, ModelEntry>();
    entries.forEach((entry) => entry.meshes.forEach((mesh) => meshEntries.set(mesh, entry)));
    const raycaster = new THREE.Raycaster();
    (raycaster as THREE.Raycaster & { firstHitOnly?: boolean }).firstHitOnly = true;
    const pointer = new THREE.Vector2();
    let pendingFrame = 0;
    let renderedProfile: SurfaceProfile | null | undefined;
    const clearOverlay = (): void => {
      while (overlay.children.length) {
        const child = overlay.children[0];
        if (!child) continue;
        overlay.remove(child);
        child.traverse((object) => {
          const line = object as THREE.Line;
          line.geometry?.dispose();
          const material = line.material as THREE.Material | undefined;
          material?.dispose();
        });
      }
    };
    const updateProfileOverlay = (): void => {
      const nextProfile = profileRef.current;
      if (nextProfile !== renderedProfile) {
        clearOverlay();
        renderedProfile = nextProfile;
        if (nextProfile) {
          // Split each segment into measured vs gap-filled runs: gap-filled
          // (bridged over nodata) stretches render dashed so the measurement
          // line stays connected across tile seams / nodata regions.
          nextProfile.segments.forEach((segment) => {
            const runs: Array<{ dashed: boolean; indices: number[] }> = [];
            segment.forEach((index) => {
              const dashed = Boolean(nextProfile.samples[index].gapFilled);
              const last = runs[runs.length - 1];
              if (last && last.dashed === dashed) last.indices.push(index);
              else runs.push({ dashed, indices: [index] });
            });
            runs.forEach((run) => {
              const points = run.indices.map((index) => {
                const sample = nextProfile.samples[index];
                const metadata = profileMetadata;
                if (!metadata) return new THREE.Vector3();
                const scenePoint = projectedToScene(metadata, sample.projected, sample.elevation!);
                return new THREE.Vector3(scenePoint.x, scenePoint.y + 0.35, scenePoint.z);
              });
              if (points.length < 2) return;
              const geometry = new THREE.BufferGeometry().setFromPoints(points);
              const material = run.dashed
                ? new THREE.LineDashedMaterial({ color: '#fbbf24', dashSize: 8, gapSize: 6, depthTest: false })
                : new THREE.LineBasicMaterial({ color: '#fbbf24', depthTest: false });
              const line = new THREE.Line(geometry, material);
              if (run.dashed) line.computeLineDistances();
              line.renderOrder = 9;
              overlay.add(line);
            });
          });
        }
      }
      const point = focusPointRef.current;
      focusMarker.visible = Boolean(point);
      if (point) focusMarker.position.set(point.x, point.y + 0.8, point.z);
    };

    const updateHover = (): void => {
      pendingFrame = 0;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((lastPointerX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((lastPointerY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(entries.flatMap((entry) => entry.meshes), false)[0];
      const entry = hit ? meshEntries.get(hit.object) : undefined;
      if (!hit || !entry || !entry.model.metadata) {
        onHover(null);
        return;
      }
      const localPoint = entry.root.worldToLocal(hit.point.clone());
      const sample = sampleModel(entry.model, localPoint);
      if (!sample) return;
      onHover(formatHover(entry.model.metadata, { x: hit.point.x, y: hit.point.y, z: hit.point.z }, sample.projected, sample.elevation, sample.row, sample.column, sample.interpolated));
    };
    let lastPointerX = -1;
    let lastPointerY = -1;
    const onPointerMove = (event: PointerEvent): void => {
      lastPointerX = event.clientX;
      lastPointerY = event.clientY;
      if (!pendingFrame) pendingFrame = requestAnimationFrame(updateHover);
    };
    const onPointerLeave = (): void => {
      lastPointerX = -1;
      lastPointerY = -1;
      onHover(null);
    };
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerleave', onPointerLeave);
    const onClick = (event: MouseEvent): void => {
      if (!measureModeRef.current || !onPickRef.current) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(entries.flatMap((entry) => entry.meshes), false)[0];
      const entry = hit ? meshEntries.get(hit.object) : undefined;
      if (!hit || !entry || !entry.model.metadata) return;
      const localPoint = entry.root.worldToLocal(hit.point.clone());
      const sample = sampleModel(entry.model, localPoint);
      if (!sample) return;
      onPickRef.current({ scene: { x: hit.point.x, y: hit.point.y, z: hit.point.z }, projected: sample.projected, elevation: sample.elevation, row: sample.row, column: sample.column, interpolated: sample.interpolated });
    };
    renderer.domElement.addEventListener('click', onClick);

    const resize = (): void => {
      const width = Math.max(host.clientWidth, 1);
      const height = Math.max(host.clientHeight, 1);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    resize();
    let animationFrame = 0;
    const animate = (): void => {
      animationFrame = requestAnimationFrame(animate);
      controls.enabled = !measureModeRef.current;
      updateProfileOverlay();
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationFrame);
      if (pendingFrame) cancelAnimationFrame(pendingFrame);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerleave', onPointerLeave);
      renderer.domElement.removeEventListener('click', onClick);
      clearOverlay();
      focusMarker.geometry.dispose();
      (focusMarker.material as THREE.Material).dispose();
      entries.forEach((entry) => {
        if (entry.model.preserveResources) return;
        if (!entry.model.released && !entry.model.bvhDisposed) {
          disposeBvh(entry.root);
          entry.model.bvhDisposed = true;
        }
      });
      controls.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [geographicPlacements, models, onHover]);

  return <div ref={hostRef} className="terrain-viewer" aria-label="3D terrain viewer" />;
}
