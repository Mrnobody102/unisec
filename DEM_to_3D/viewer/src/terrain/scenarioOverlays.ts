import * as THREE from 'three';
import type {
  Community,
  Hazard,
  RoadSegment,
  ScenarioRoute
} from '../types/dear';
import type { TerrainMetadata } from '../types/terrain';
import { bilinearElevation } from './elevationGrid';
import { projectedToScene } from './coordinate';

export type OverlayHit =
  | { type: 'community'; id: string }
  | { type: 'road'; id: string }
  | { type: 'hazard'; id: string }
  | { type: 'poi'; id: string };

type ScenarioOverlayOptions = {
  metadata: TerrainMetadata;
  grid: Float32Array;
  communities: Community[];
  hazards: Hazard[];
  roads: RoadSegment[];
  selectedRoute: ScenarioRoute | null;
  selectedCommunityId: string | null;
  selectedObjectId: string | null;
  layers: Record<string, boolean>;
};

function getSurfaceElevation(grid: Float32Array, metadata: TerrainMetadata, x: number, y: number): number {
  const result = bilinearElevation(grid, metadata, x, y);
  return result.elevation ?? metadata.elevation.base_elevation;
}

function interpolateSegmentPoints(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  intervalM: number = 40
): Array<{ x: number; y: number }> {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / intervalM));
  const points: Array<{ x: number; y: number }> = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    points.push({ x: p1.x + dx * t, y: p1.y + dy * t });
  }
  return points;
}

export function buildScenarioOverlays(options: ScenarioOverlayOptions): THREE.Group {
  const {
    metadata,
    grid,
    communities,
    hazards,
    roads,
    selectedRoute,
    selectedCommunityId,
    selectedObjectId,
    layers
  } = options;

  const rootGroup = new THREE.Group();
  rootGroup.name = 'dear-scenario-overlays';

  // 1. Roads Layer
  if (layers.roads) {
    const roadGroup = new THREE.Group();
    roadGroup.name = 'scenario-roads';

    roads.forEach((road) => {
      if (road.points.length < 2) return;

      const densePoints: Array<{ x: number; y: number }> = [];
      for (let i = 0; i < road.points.length - 1; i += 1) {
        const segPoints = interpolateSegmentPoints(road.points[i], road.points[i + 1], 40);
        if (i > 0) segPoints.shift();
        densePoints.push(...segPoints);
      }

      const isRoadSelected = selectedObjectId === `road:${road.id}`;
      const isPartOfSelectedRoute = selectedRoute?.segs.some((s) => s.id === road.id);

      const positions: number[] = [];
      densePoints.forEach((pt) => {
        const elev = getSurfaceElevation(grid, metadata, pt.x, pt.y);
        const scenePt = projectedToScene(metadata, pt, elev + (isPartOfSelectedRoute ? 7 : 4));
        positions.push(scenePt.x, scenePt.y, scenePt.z);
      });

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

      let lineColor = 0x9aa3ad; // default neutral road
      let lineWidth = 2;

      if (layers.status) {
        if (road.status === 'blocked') lineColor = 0xef4444; // red
        else if (road.status === 'uncertain') lineColor = 0xf59e0b; // amber
      }

      if (isPartOfSelectedRoute && layers.route) {
        lineColor = 0x2563eb; // blue
        lineWidth = 4;
      }

      if (isRoadSelected) {
        lineColor = 0x60a5fa; // bright highlight
        lineWidth = 5;
      }

      const material = new THREE.LineBasicMaterial({
        color: lineColor,
        linewidth: lineWidth,
        depthTest: true
      });

      const line = new THREE.Line(geometry, material);
      line.userData = { type: 'road', id: road.id };
      roadGroup.add(line);
    });

    rootGroup.add(roadGroup);
  }

  // 2. Communities Layer
  if (layers.communities) {
    const commGroup = new THREE.Group();
    commGroup.name = 'scenario-communities';

    communities.forEach((comm) => {
      const isSelected = selectedCommunityId === comm.id;
      const elev = getSurfaceElevation(grid, metadata, comm.projected.x, comm.projected.y);
      const scenePos = projectedToScene(metadata, comm.projected, elev + 12);

      const pinGroup = new THREE.Group();
      pinGroup.position.set(scenePos.x, scenePos.y, scenePos.z);
      pinGroup.userData = { type: 'community', id: comm.id };

      let pinColor = 0x64748b;
      if (comm.prio === 1) pinColor = 0xef4444;
      else if (comm.prio === 2) pinColor = 0xf59e0b;

      // Inner sphere pin
      const sphereGeo = new THREE.SphereGeometry(isSelected ? 30 : 22, 16, 16);
      const sphereMat = new THREE.MeshBasicMaterial({
        color: isSelected ? 0x2563eb : pinColor
      });
      const sphere = new THREE.Mesh(sphereGeo, sphereMat);
      sphere.userData = { type: 'community', id: comm.id };
      pinGroup.add(sphere);

      // Outer ring for selected or priority 1
      if (isSelected || comm.prio === 1) {
        const ringGeo = new THREE.RingGeometry(28, 36, 24);
        ringGeo.rotateX(-Math.PI / 2);
        const ringMat = new THREE.MeshBasicMaterial({
          color: isSelected ? 0x93c5fd : 0xfca5a5,
          side: THREE.DoubleSide
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.y = -6;
        pinGroup.add(ring);
      }

      // Small vertical stalk connecting marker to ground
      const stalkGeo = new THREE.CylinderGeometry(2, 2, 24, 8);
      const stalkMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const stalk = new THREE.Mesh(stalkGeo, stalkMat);
      stalk.position.y = -12;
      pinGroup.add(stalk);

      commGroup.add(pinGroup);
    });

    rootGroup.add(commGroup);
  }

  // 3. Hazards Layer
  if (layers.landslide) {
    const hazardGroup = new THREE.Group();
    hazardGroup.name = 'scenario-hazards';

    hazards.forEach((hz) => {
      const elev = getSurfaceElevation(grid, metadata, hz.projected.x, hz.projected.y);
      const scenePos = projectedToScene(metadata, hz.projected, elev + 16);

      const hzObj = new THREE.Group();
      hzObj.position.set(scenePos.x, scenePos.y, scenePos.z);
      hzObj.userData = { type: 'hazard', id: hz.id };

      const isSelected = selectedObjectId === `hazard:${hz.id}`;

      // Warning marker geometry (Tetrahedron / Diamond)
      const geo = new THREE.TetrahedronGeometry(isSelected ? 26 : 18);
      const mat = new THREE.MeshBasicMaterial({
        color: hz.kind === 'landslide' ? 0xdc2626 : 0xd97706,
        wireframe: false
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.userData = { type: 'hazard', id: hz.id };
      hzObj.add(mesh);

      hazardGroup.add(hzObj);
    });

    rootGroup.add(hazardGroup);
  }

  // 4. Staging FOB Point
  if (layers.staging) {
    const stagingGroup = new THREE.Group();
    stagingGroup.name = 'scenario-staging';
    const stagingCoords = { x: 399500, y: 2397000 };
    const elev = getSurfaceElevation(grid, metadata, stagingCoords.x, stagingCoords.y);
    const scenePos = projectedToScene(metadata, stagingCoords, elev + 16);

    const fobObj = new THREE.Group();
    fobObj.position.set(scenePos.x, scenePos.y, scenePos.z);
    fobObj.userData = { type: 'poi', id: 'TOWN' };

    const boxGeo = new THREE.BoxGeometry(26, 26, 26);
    const boxMat = new THREE.MeshBasicMaterial({ color: 0x0284c7 });
    const box = new THREE.Mesh(boxGeo, boxMat);
    box.userData = { type: 'poi', id: 'TOWN' };
    fobObj.add(box);

    stagingGroup.add(fobObj);
    rootGroup.add(stagingGroup);
  }

  return rootGroup;
}
