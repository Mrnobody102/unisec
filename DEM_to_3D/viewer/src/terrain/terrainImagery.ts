import type { ImageryDetailAtlas } from './imageryAtlas';
import * as THREE from 'three';
import proj4 from 'proj4';
import type { TerrainMetadata } from '../types/terrain';
import { sceneToProjected } from './coordinate';
import { planBasemapTiles, planRegionalTiles, type MapTile } from './regionalBasemap';

export type ImageryAtlas = {
  zoom: number; minX: number; minY: number; maxX: number; maxY: number;
};
const tileKey = (tile: MapTile) => `${tile.z}/${tile.x}/${tile.y}`;

/** Each level must cover the whole DEM before replacing the previous image. */
export function planImageryAtlases(metadata: TerrainMetadata, maxZoom: number, planned?: MapTile[]): ImageryAtlas[] {
  let tiles: MapTile[];
  try { tiles = planned ?? planBasemapTiles(metadata, maxZoom); } catch { return []; }
  const requested = new Set(tiles.map(tileKey));
  return [...new Set(tiles.map(tile => tile.z))].sort((a, b) => a - b).flatMap(zoom => {
    const required = planRegionalTiles(metadata, { padding: 0, maxZoom: zoom, budget: Infinity });
    if (!required.length || required.some(tile => !requested.has(tileKey(tile)))) return [];
    return [{ zoom, minX: Math.min(...required.map(t => t.x)), minY: Math.min(...required.map(t => t.y)),
      maxX: Math.max(...required.map(t => t.x)) + 1, maxY: Math.max(...required.map(t => t.y)) + 1 }];
  });
}

export function atlasComplete(atlas: ImageryAtlas, loaded: ReadonlySet<string>): boolean {
  for (let x = atlas.minX; x < atlas.maxX; x++) for (let y = atlas.minY; y < atlas.maxY; y++) {
    if (!loaded.has(`${atlas.zoom}/${x}/${y}`)) return false;
  }
  return true;
}

/** Reuse fetched basemap tiles on the DEM. Never expose a patchwork of imagery sources. */
export function createTerrainImagery(metadata: TerrainMetadata, terrain: THREE.Group, meshes: THREE.Mesh[], maxZoom: number, anisotropy: number, planned?: MapTile[]) {
  const levels = planImageryAtlases(metadata, maxZoom, planned);
  const reference = levels.at(-1);
  if (!reference) return null;
  const atlases = levels.map(bounds => {
    const canvas = document.createElement('canvas');
    const columns = bounds.maxX - bounds.minX, rows = bounds.maxY - bounds.minY;
    const scale = Math.min(1, 4096 / (columns * 256), 4096 / (rows * 256));
    canvas.width = Math.max(1, Math.round(columns * 256 * scale));
    canvas.height = Math.max(1, Math.round(rows * 256 * scale));
    const context = canvas.getContext('2d');
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = anisotropy;
    // Geometry UVs use the finest atlas; map a complete coarser level onto that same footprint.
    const ratio = 2 ** (bounds.zoom - reference.zoom);
    texture.repeat.set((reference.maxX - reference.minX) * ratio / columns, (reference.maxY - reference.minY) * ratio / rows);
    texture.offset.set((reference.minX * ratio - bounds.minX) / columns, (bounds.maxY - reference.maxY * ratio) / rows);
    return { ...bounds, canvas, context, texture, columns, rows };
  });
  const material = new THREE.MeshLambertMaterial({ depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, side: THREE.DoubleSide });
  const group = new THREE.Group(); group.name = 'terrain-online-imagery';
  const toWgs84 = proj4(metadata.crs.proj4 || `${metadata.crs.authority}:${metadata.crs.code}`, 'EPSG:4326');
  terrain.updateWorldMatrix(true, true);
  const inverse = terrain.matrixWorld.clone().invert();
  const point = new THREE.Vector3();
  const columns = reference.maxX - reference.minX, rows = reference.maxY - reference.minY;
  for (const source of meshes) {
    const geometry = source.geometry.clone();
    const relative = inverse.clone().multiply(source.matrixWorld);
    const positions = geometry.getAttribute('position'), uv = new Float32Array(positions.count * 2);
    for (let i = 0; i < positions.count; i++) {
      point.fromBufferAttribute(positions, i).applyMatrix4(relative);
      const projected = sceneToProjected(metadata, point).projected;
      const [lon, lat] = toWgs84.forward([projected.x, projected.y]);
      const n = 2 ** reference.zoom, latitude = THREE.MathUtils.degToRad(THREE.MathUtils.clamp(lat, -85.05112878, 85.05112878));
      const x = (lon + 180) / 360 * n, y = (1 - Math.asinh(Math.tan(latitude)) / Math.PI) / 2 * n;
      uv[i * 2] = (x - reference.minX) / columns; uv[i * 2 + 1] = 1 - (y - reference.minY) / rows;
    }
    geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    const mesh = new THREE.Mesh(geometry, material);
    mesh.matrix.copy(relative); mesh.matrixAutoUpdate = false; mesh.renderOrder = 3; group.add(mesh);
  }
  terrain.add(group); group.visible = false;
  const focusGroup = new THREE.Group();
  focusGroup.name = 'terrain-detail-imagery';
  focusGroup.visible = false;
  terrain.add(focusGroup);
  const focusMaterial = new THREE.MeshLambertMaterial({
    transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4,
    polygonOffsetUnits: -4, side: THREE.DoubleSide,
  });
  focusMaterial.onBeforeCompile = shader => {
    shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>',
      'if(any(lessThan(vMapUv,vec2(0.0))) || any(greaterThan(vMapUv,vec2(1.0)))) discard;\n#include <map_fragment>\nvec2 edge=min(vMapUv,1.0-vMapUv); diffuseColor.a*=smoothstep(0.0,0.015,min(edge.x,edge.y));');
  };
  let focusTexture: THREE.Texture | null = null;
  let disposed = false, enabled = false, activeZoom = -1;
  const loaded = new Set<string>();

  const clearFocusMeshes = () => {
    for (const child of [...focusGroup.children]) {
      const mesh = child as THREE.Mesh;
      // Attributes belong to the complete terrain mesh; dispose only the patch index.
      for (const key of Object.keys(mesh.geometry.attributes)) mesh.geometry.deleteAttribute(key);
      mesh.geometry.dispose();
      focusGroup.remove(child);
    }
  };
  const buildFocusMeshes = (texture: THREE.Texture) => {
    const {x: sx, y: sy} = texture.repeat, {x: ox, y: oy} = texture.offset;
    for (const object of group.children) {
      const source = object as THREE.Mesh;
      const uv = source.geometry.getAttribute('uv'), index = source.geometry.index;
      const chosen: number[] = [];
      for (let i = 0; i < (index?.count ?? uv.count); i += 3) {
        const a=index?index.getX(i):i,b=index?index.getX(i+1):i+1,c=index?index.getX(i+2):i+2;
        const ax=uv.getX(a)*sx+ox,bx=uv.getX(b)*sx+ox,cx=uv.getX(c)*sx+ox;
        const ay=uv.getY(a)*sy+oy,by=uv.getY(b)*sy+oy,cy=uv.getY(c)*sy+oy;
        if(Math.min(ax,bx,cx)<=1 && Math.max(ax,bx,cx)>=0 && Math.min(ay,by,cy)<=1 && Math.max(ay,by,cy)>=0)chosen.push(a,b,c);
      }
      if (!chosen.length) continue;
      const geometry = new THREE.BufferGeometry();
      for (const name of Object.keys(source.geometry.attributes)) geometry.setAttribute(name, source.geometry.getAttribute(name));
      geometry.setIndex(chosen);
      const mesh = new THREE.Mesh(geometry, focusMaterial);
      mesh.matrix.copy(source.matrix);
      mesh.matrixAutoUpdate = false;
      mesh.renderOrder = 4;
      focusGroup.add(mesh);
    }
  };
  const setDetail = (atlas: ImageryDetailAtlas | null) => {
    if (disposed) return;
    clearFocusMeshes();
    focusTexture?.dispose(); focusTexture = null; focusMaterial.map = null; focusGroup.visible = false;
    if (!atlas) return;
    const width = atlas.maxX - atlas.minX, height = atlas.maxY - atlas.minY;
    const ratio = 2 ** (atlas.zoom - reference.zoom);
    focusTexture = atlas.texture.clone();
    focusTexture.repeat.set(columns * ratio / width, rows * ratio / height);
    focusTexture.offset.set((reference.minX * ratio - atlas.minX) / width, (atlas.maxY - reference.maxY * ratio) / height);
    focusMaterial.map = focusTexture; focusMaterial.needsUpdate = true;
    buildFocusMeshes(focusTexture);
    focusGroup.visible = enabled;
  };
  return {
    group, setDetail,
    setVisible: (visible: boolean) => {
      enabled = visible;
      group.visible = enabled && activeZoom >= 0;
      focusGroup.visible = enabled && !!focusTexture;
    },
    tile: (tile: MapTile, bitmap: ImageBitmap) => {
      if (disposed) return;
      const atlas = atlases.find(a => a.zoom === tile.z && tile.x >= a.minX && tile.x < a.maxX && tile.y >= a.minY && tile.y < a.maxY);
      if (!atlas?.context) return;
      const width = atlas.canvas.width / atlas.columns, height = atlas.canvas.height / atlas.rows;
      // Regional bitmaps are decoded with flipY. Undo it in the canvas atlas.
      atlas.context.save();
      atlas.context.translate((tile.x - atlas.minX) * width, (tile.y - atlas.minY + 1) * height);
      atlas.context.scale(1, -1); atlas.context.drawImage(bitmap, 0, 0, width, height); atlas.context.restore();
      loaded.add(tileKey(tile));
      if (atlas.zoom > activeZoom && atlasComplete(atlas, loaded)) {
        atlas.texture.needsUpdate = true; material.map = atlas.texture; material.needsUpdate = true;
        activeZoom = atlas.zoom; group.visible = enabled;
      }
    },
    dispose: () => {
      disposed = true;
      clearFocusMeshes();
      focusTexture?.dispose();
      focusMaterial.dispose();
      focusGroup.removeFromParent();
      group.removeFromParent();
      group.children.forEach(child => (child as THREE.Mesh).geometry.dispose()); material.dispose();
      atlases.forEach(atlas => { atlas.texture.dispose(); atlas.canvas.width = atlas.canvas.height = 1; });
    }
  };
}
