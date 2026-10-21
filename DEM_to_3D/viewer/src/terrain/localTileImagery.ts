import * as THREE from 'three';
import type { LoadedModel } from '../types/terrain';
import type { TilePyramidMetadata } from './tileMetadata';
import { logicalTilePath } from './tileMetadata';
import { visibleImageryPoints } from './viewImagery';

export type LocalTileWindow = { zoom: number; column: number; row: number; columns: number; rows: number };

/** Cover the whole visible surface at the finest level fitting the atlas budget. */
export function planLocalTileWindow(metadata: TilePyramidMetadata, points: Array<{ x: number; y: number }>, maxSize: number): LocalTileWindow | null {
  if (!points.length || !points.every(point => Number.isFinite(point.x) && Number.isFinite(point.y))) return null;
  const bounds = metadata.bounds_projected;
  const left = Math.max(bounds.min_x, Math.min(...points.map(point => point.x)));
  const right = Math.min(bounds.max_x, Math.max(...points.map(point => point.x)));
  const bottom = Math.max(bounds.min_y, Math.min(...points.map(point => point.y)));
  const top = Math.min(bounds.max_y, Math.max(...points.map(point => point.y)));
  if (right < left || top < bottom) return null;
  const slots = Math.floor(maxSize / metadata.tile_size);
  for (const level of [...metadata.levels].reverse()) {
    const xSize = metadata.tile_size * level.pixel_size_x, ySize = metadata.tile_size * level.pixel_size_y;
    const column = Math.max(0, Math.floor((left - bounds.min_x) / xSize));
    const row = Math.max(0, Math.floor((bounds.max_y - top) / ySize));
    const endColumn = Math.min(level.columns - 1, Math.floor((right - bounds.min_x) / xSize));
    const endRow = Math.min(level.rows - 1, Math.floor((bounds.max_y - bottom) / ySize));
    const columns = endColumn - column + 1, rows = endRow - row + 1;
    if (columns > 0 && rows > 0 && columns <= slots && rows <= slots) return { zoom: level.zoom, column, row, columns, rows };
  }
  return null;
}

type Entry = { model: LoadedModel; root: THREE.Object3D; group: THREE.Group; meshes: THREE.Mesh[] };

/** Local file atlases share the existing Lambert materials and never replace online imagery. */
export function createLocalTileImagery(entries: Entry[], camera: THREE.Camera, maxTextureSize: number, invalidate: () => void) {
  const supported = entries.filter(entry => entry.model.tilePyramid && entry.model.metadata && entry.model.tileFiles);
  // Two complete atlas images per model during a swap; total GPU allocation <=64 MiB.
  const size = 2 ** Math.floor(Math.log2(Math.min(2048, maxTextureSize, Math.sqrt(64 * 1024 * 1024 / Math.max(1, supported.length) / 8))));
  let disposed = false, enabled = true, timer: ReturnType<typeof setTimeout> | undefined;
  const states = supported.map(entry => {
    const metadata = entry.model.tilePyramid!;
    const uniforms = { map: { value: null as THREE.CanvasTexture | null }, window: { value: new THREE.Vector4(0, 0, 1, 1) }, ready: { value: 0 } };
    const restores: Array<() => void> = [];
    entry.root.updateWorldMatrix(true, true);
    const inverse = entry.root.matrixWorld.clone().invert();
    for (const mesh of entry.meshes) {
      const matrix = inverse.clone().multiply(mesh.matrixWorld);
      const origin = entry.model.metadata!.world_origin, bounds = metadata.bounds_projected;
      for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
        const hook = material.onBeforeCompile, key = material.customProgramCacheKey;
        material.onBeforeCompile = (shader, renderer) => {
          hook.call(material, shader, renderer);
          Object.assign(shader.uniforms, { localTileMap: uniforms.map, localTileWindow: uniforms.window, localTileReady: uniforms.ready,
            localTileMatrix: { value: matrix }, localTileBounds: { value: new THREE.Vector4(bounds.min_x-origin.x, origin.y-bounds.max_y, bounds.max_x-bounds.min_x, bounds.max_y-bounds.min_y) } });
          shader.vertexShader = 'uniform mat4 localTileMatrix; uniform vec4 localTileBounds; varying vec2 vLocalTileUv;\n' + shader.vertexShader;
          shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvec3 localTilePoint = (localTileMatrix * vec4(position, 1.0)).xyz;\nvLocalTileUv = (vec2(localTilePoint.x, localTilePoint.z) - localTileBounds.xy) / localTileBounds.zw;');
          shader.fragmentShader = 'uniform sampler2D localTileMap; uniform vec4 localTileWindow; uniform float localTileReady; varying vec2 vLocalTileUv;\n' + shader.fragmentShader;
          shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
vec2 localTileUv = (vLocalTileUv - localTileWindow.xy) / localTileWindow.zw;
if (localTileReady > 0.5 && all(greaterThanEqual(localTileUv, vec2(0.0))) && all(lessThanEqual(localTileUv, vec2(1.0)))) {
  vec4 localTileSample = texture2D(localTileMap, localTileUv);
  diffuseColor.rgb = mix(diffuseColor.rgb, localTileSample.rgb, localTileSample.a);
}`);
        };
        material.customProgramCacheKey = () => key.call(material) + ':local-tiles-v1'; material.needsUpdate = true;
        restores.push(() => { material.onBeforeCompile = hook; material.customProgramCacheKey = key; material.needsUpdate = true; });
      }
    }
    return { entry, metadata, uniforms, restores, texture: null as THREE.CanvasTexture | null, key: '', run: null as AbortController | null, running: false, requested: false };
  });
  const releaseTexture = (texture: THREE.CanvasTexture | null) => { if (!texture) return; texture.dispose(); const canvas = texture.image as HTMLCanvasElement; canvas.width = canvas.height = 1; };
  const load = async (state: typeof states[number]) => {
    if (state.running) { state.requested = true; state.run?.abort(); return; }
    const { entry, metadata, uniforms } = state;
    const points = visibleImageryPoints(entry.model.metadata!, entry.group.matrixWorld, camera, entry.meshes);
    const window = planLocalTileWindow(metadata, points, size);
    if (!window) return;
    const key = JSON.stringify(window);
    if (key === state.key) return;
    state.running = true; state.requested = false;
    const run = new AbortController(); state.run = run;
    const canvas = document.createElement('canvas'); canvas.width = window.columns * metadata.tile_size; canvas.height = window.rows * metadata.tile_size;
    try {
      const context = canvas.getContext('2d'); if (!context) return;
      const tiles = Array.from({ length: window.rows }, (_, row) => Array.from({ length: window.columns }, (_, column) => ({ column: column + window.column, row: row + window.row }))).flat();
      let cursor = 0;
      const worker = async () => {
        while (cursor < tiles.length) {
          run.signal.throwIfAborted(); const tile = tiles[cursor++];
          const file = entry.model.tileFiles!.get(logicalTilePath(window.zoom, tile.column, tile.row));
          if (!file || file.size > 16 * 1024 * 1024) throw new Error('Invalid local terrain tile');
          const bitmap = await createImageBitmap(file);
          try {
            run.signal.throwIfAborted();
            const pixels = metadata.tile_size, gutter = metadata.gutter_px;
            if (bitmap.width !== pixels + 2 * gutter || bitmap.height !== pixels + 2 * gutter) throw new Error('Local tile dimensions do not match metadata');
            context.drawImage(bitmap, gutter, gutter, pixels, pixels, (tile.column-window.column)*pixels, (tile.row-window.row)*pixels, pixels, pixels);
          } finally { bitmap.close(); }
        }
      };
      const results = await Promise.allSettled([worker(), worker()]);
      if (results.some(result => result.status === 'rejected')) throw new Error('Local terrain detail unavailable');
      run.signal.throwIfAborted(); if (disposed) return;
      const texture = new THREE.CanvasTexture(canvas); texture.flipY = false; texture.colorSpace = THREE.SRGBColorSpace;
      texture.generateMipmaps = false; texture.minFilter = THREE.LinearFilter; texture.magFilter = THREE.LinearFilter;
      const level = metadata.levels[window.zoom]; const bounds = metadata.bounds_projected;
      const width = bounds.max_x - bounds.min_x, height = bounds.max_y - bounds.min_y;
      uniforms.window.value.set(window.column*metadata.tile_size*level.pixel_size_x/width, window.row*metadata.tile_size*level.pixel_size_y/height, canvas.width*level.pixel_size_x/width, canvas.height*level.pixel_size_y/height);
      uniforms.map.value = texture; uniforms.ready.value = enabled ? 1 : 0;
      releaseTexture(state.texture); state.texture = texture; state.key = key; invalidate();
    } catch { run.abort(); } // Keep the previous complete image and model preview.
    finally {
      if (state.texture?.image !== canvas) canvas.width = canvas.height = 1;
      state.running = false; state.run = null;
      if (state.requested && !disposed && enabled) schedule();
    }
  };
  const schedule = () => {
    if (disposed || !enabled || !states.length) return;
    clearTimeout(timer); timer = setTimeout(() => { for (const state of states) void load(state); }, 250);
  };
  return { schedule,
    setEnabled(value: boolean) { enabled = value; states.forEach(state => { state.uniforms.ready.value = value && state.texture ? 1 : 0; if (!value) state.run?.abort(); }); if (value) schedule(); },
    dispose() { disposed = true; clearTimeout(timer); states.forEach(state => { state.run?.abort(); state.uniforms.ready.value = 0; state.uniforms.map.value = null; state.restores.forEach(restore => restore()); releaseTexture(state.texture); state.texture = null; }); }
  };
}
