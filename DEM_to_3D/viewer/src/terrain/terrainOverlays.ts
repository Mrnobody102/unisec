import * as THREE from 'three';
import type { LoadedModel } from '../types/terrain';
import type { TerrainOverlayOptions } from '../features/terrain/useTerrainOverlays';
import { buildContours, createContourBudget } from './contours';
import { buildContourLabels, formatContourElevation, labelCollides, MAX_LABEL_CANDIDATES, MAX_VISIBLE_LABELS, projectContourLabel, projectContourTangent, rotatedLabelBox, terrainOccludesLabel, type LabelBox } from './contourLabels';
import { createSarOverlay, type SarSurface } from './sarOverlay';

type Entry = { model: LoadedModel; root: THREE.Object3D; group: THREE.Group; meshes: THREE.Mesh[] };
type Label = { element: HTMLDivElement; point: THREE.Vector3; tangent: THREE.Vector3; group: THREE.Group };

/** Owns optional overlays without remounting the renderer or resetting the camera. */
export function createTerrainOverlays(host: HTMLElement, entries: Entry[], invalidate: () => void,
  report: (kind: 'contours' | 'sar', message: string | null) => void) {
  let disposed = false, options: TerrainOverlayOptions | undefined;
  let controller: AbortController | undefined, sarGeneration = 0;
  let sarController: AbortController | undefined;
  let surface: SarSurface | null = null;
  let lines: THREE.LineSegments[] = [], labels: Label[] = [];
  const clearContours = () => {
    controller?.abort();
    labels.forEach(label => label.element.remove()); labels = [];
    lines.forEach(line => { line.removeFromParent(); line.geometry.dispose(); (line.material as THREE.Material).dispose(); }); lines = [];
    invalidate();
  };
  const contours = async (next: TerrainOverlayOptions) => {
    clearContours(); report('contours', null);
    if (!next.contours) return;
    const run = new AbortController(); controller = run;
    const supported = entries.filter(entry => entry.model.metadata?.analysis_supported && entry.model.grid);
    const budget = createContourBudget();
    report('contours', document.documentElement.lang === 'en' ? 'Generating contours' : 'Đang tạo đường đồng mức');
    try {
      for (const entry of supported) {
        const positions = await buildContours(entry.model.grid!, entry.model.metadata!, next.interval, run.signal, budget);
        run.signal.throwIfAborted();
        const geometry = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const material = new THREE.LineBasicMaterial({ color: '#947947', depthTest: true, depthWrite: false, toneMapped: false });
        material.onBeforeCompile = shader => { shader.vertexShader = shader.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\ngl_Position.z -= 0.00002 * gl_Position.w;'); };
        const line = new THREE.LineSegments(geometry, material); line.name = 'elevation-contours'; line.renderOrder = 5;
        entry.group.add(line); lines.push(line); invalidate();
        const anchors = await buildContourLabels(positions, entry.model.metadata!, next.interval, run.signal, Math.floor(MAX_LABEL_CANDIDATES / supported.length));
        run.signal.throwIfAborted();
        for (const anchor of anchors) {
          const element = document.createElement('div'); element.className = 'terrain-contour-label';
          element.textContent = formatContourElevation(anchor.elevation); element.hidden = true; element.setAttribute('aria-hidden', 'true'); host.append(element);
          labels.push({ element, point: anchor.point, tangent: anchor.tangent, group: entry.group });
        }
      }
      report('contours', supported.length ? null : (document.documentElement.lang === 'en' ? 'Contours require a metric DEM grid.' : 'Đồng mức cần lưới DEM có tọa độ theo mét.'));
      invalidate();
    } catch (reason) {
      if (!run.signal.aborted && !disposed) { clearContours(); report('contours', reason instanceof Error ? reason.message : String(reason)); }
    }
  };
  const sar = async (next: TerrainOverlayOptions) => {
    sarController?.abort(); sarController = new AbortController();
    const run = ++sarGeneration; surface?.dispose(); surface = null; report('sar', null); invalidate();
    if (!next.sar) return;
    try {
      const supported = entries.flatMap(entry => entry.model.metadata ? [{ root: entry.root, metadata: entry.model.metadata }] : []);
      if (!supported.length) throw new Error(document.documentElement.lang === 'en' ? 'SAR requires terrain coordinate metadata.' : 'Lớp SAR cần metadata tọa độ của địa hình.');
      const nextSurface = await createSarOverlay(next.sar, next.band, supported, sarController.signal);
      if (disposed || run !== sarGeneration) { nextSurface.dispose(); return; }
      surface = nextSurface; invalidate();
    } catch (reason) { if (!disposed && run === sarGeneration) report('sar', reason instanceof Error ? reason.message : String(reason)); }
  };
  const raycaster = new THREE.Raycaster(); raycaster.firstHitOnly = true;
  const meshes = entries.flatMap(entry => entry.meshes);
  return {
    setOptions(next: TerrainOverlayOptions) {
      if (disposed) return;
      const previous = options; options = next;
      if (!previous || previous.contours !== next.contours || previous.interval !== next.interval) void contours(next);
      if (!previous || previous.sar !== next.sar || previous.band !== next.band) void sar(next);
      invalidate();
    },
    render(draw: () => void) {
      if (surface && options) surface.render(true, options.sarVisible, options.opacity, draw); else draw();
    },
    updateLabels(camera: THREE.Camera) {
      camera.updateMatrixWorld();
      const width = host.clientWidth, height = host.clientHeight;
      // Respect already visible scenario and imported-data labels as well.
      const hostBox = host.getBoundingClientRect();
      const area = host.closest('.map-area') ?? host;
      const occupied: LabelBox[] = Array.from(area.querySelectorAll<HTMLElement>('.map-pin:not([hidden]), .map-pin:not(.is-label-hidden) .map-pin-label, .terrain-area-label, .terrain-reference-point, .terrain-reference-label, .layers-panel, .map-toolbar,.map-advanced-tools, .map-tools, .map-bottom-bar, .map-measure-panel')).filter(element => element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden').map(element => { const box = element.getBoundingClientRect(); return {x:box.x-hostBox.x,y:box.y-hostBox.y,width:box.width,height:box.height}; });
      let visible = 0;
      for (const label of labels) {
        label.element.hidden = true;
        if (visible >= MAX_VISIBLE_LABELS) continue;
        const world = label.group.localToWorld(label.point.clone());
        const box = projectContourLabel(world, camera, width, height);
        if (!box) continue;
        const tangent = label.group.localToWorld(label.point.clone().add(label.tangent)).sub(world);
        const angle = projectContourTangent(world, tangent, camera, width, height);
        if (angle === null) continue;
        const rotated = rotatedLabelBox(box, angle);
        if (rotated.x < 0 || rotated.y < 0 || rotated.x + rotated.width > width || rotated.y + rotated.height > height || labelCollides(rotated, occupied)) continue;
        const direction = world.clone().sub(camera.position), distance = direction.length();
        raycaster.set(camera.position, direction.normalize()); raycaster.far = distance;
        if (terrainOccludesLabel(raycaster.intersectObjects(meshes, false)[0]?.distance, distance)) continue;
        occupied.push(rotated); visible++;
        Object.assign(label.element.style, { transform: `rotate(${angle}deg)`, left: `${box.x}px`, top: `${box.y}px` }); label.element.hidden = false;
      }
    },
    dispose() { disposed = true; sarGeneration++; sarController?.abort(); clearContours(); surface?.dispose(); surface = null; }
  };
}
