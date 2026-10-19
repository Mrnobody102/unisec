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
export function planImageryAtlases(metadata: TerrainMetadata, maxZoom: number): ImageryAtlas[] {
  let tiles: MapTile[];
  try { tiles = planBasemapTiles(metadata, maxZoom); } catch { return []; }
  const planned = new Set(tiles.map(tileKey));
  return [...new Set(tiles.map(tile => tile.z))].sort((a, b) => a - b).flatMap(zoom => {
    const required = planRegionalTiles(metadata, { padding: 0, maxZoom: zoom, budget: Infinity });
    if (!required.length || required.some(tile => !planned.has(tileKey(tile)))) return [];
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
export function createTerrainImagery(metadata: TerrainMetadata, terrain: THREE.Group, meshes: THREE.Mesh[], maxZoom: number, anisotropy: number) {
  const levels = planImageryAtlases(metadata, maxZoom);
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
  const loaded = new Set<string>();
  let disposed = false, enabled = false, activeZoom = -1;
  return {
    group,
    setVisible: (visible: boolean) => { enabled = visible; group.visible = enabled && activeZoom >= 0; },
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
      disposed = true; group.removeFromParent();
      group.children.forEach(child => (child as THREE.Mesh).geometry.dispose()); material.dispose();
      atlases.forEach(atlas => { atlas.texture.dispose(); atlas.canvas.width = atlas.canvas.height = 1; });
    }
  };
}
