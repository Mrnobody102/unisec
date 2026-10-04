import type { GLTFLoader, GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { LoadedTerrain, MeshMetadata, TerrainData } from '../types/terrain';
import { TerrainAssetError, validateGridBuffer, validateMetadata } from './validation';
import { readResponse } from '../shared/http/readResponse';

export type TerrainAssetUrls = { glb: string; metadata: string; grid: string };

/** Return true only when the URL's final path component exactly matches the contract filename. */
export function assetUrlMatchesFilename(url: string, filename: string): boolean {
  if (!filename || filename === '.' || filename === '..' || /[\\/]/.test(filename)) return false;
  try {
    const parsed = new URL(url, 'http://terrain.invalid/');
    const pathPart = parsed.pathname.split('/').filter(Boolean).at(-1);
    return pathPart !== undefined && decodeURIComponent(pathPart) === filename;
  } catch {
    return false;
  }
}

/** Validate that the renderable GLB geometry belongs to the metadata/grid pair. */
export function validateGltfMeshCounts(root: import('three').Object3D, meshMetadata: MeshMetadata): void {
  let vertexCount = 0;
  let triangleCount = 0;
  root.traverse((object) => {
    const mesh = object as import('three').Mesh;
    if (!mesh.isMesh) return;
    const position = mesh.geometry.getAttribute('position');
    if (!position) throw new TerrainAssetError('GLB mesh is missing a position attribute');
    vertexCount += position.count;
    const indexCount = mesh.geometry.getIndex()?.count;
    const meshTriangles = (indexCount ?? position.count) / 3;
    if (!Number.isInteger(meshTriangles)) throw new TerrainAssetError('GLB mesh position/index count is not triangular');
    triangleCount += meshTriangles;
  });
  if (vertexCount !== meshMetadata.vertex_count) {
    throw new TerrainAssetError(`GLB vertex_count ${vertexCount} does not match metadata ${meshMetadata.vertex_count}`);
  }
  if (triangleCount !== meshMetadata.triangle_count) {
    throw new TerrainAssetError(`GLB triangle_count ${triangleCount} does not match metadata ${meshMetadata.triangle_count}`);
  }
}

function parseGltf(loader: GLTFLoader, buffer: ArrayBuffer, url: string): Promise<GLTF> {
  return new Promise((resolve, reject) => loader.parse(buffer, new URL(url, window.location.href).href, resolve, reject));
}

export async function loadTerrainData(urls: Pick<TerrainAssetUrls, 'metadata' | 'grid'>, signal?: AbortSignal): Promise<TerrainData> {
  // Read and validate metadata first.  This lets us reject a mismatched sidecar
  // URL before opening either binary request and avoids partially initialized
  // asset work when a caller accidentally mixes export versions.
  const metadataValue = await (await readResponse(urls.metadata, signal)).json();
  const metadata = validateMetadata(metadataValue);
  if (!assetUrlMatchesFilename(urls.grid, metadata.grid.file)) {
    throw new TerrainAssetError(`Grid URL does not match metadata grid.file (${metadata.grid.file})`);
  }
  const gridBuffer = await (await readResponse(urls.grid, signal, 30000)).arrayBuffer();
  validateGridBuffer(metadata, gridBuffer);
  // The contract is little-endian. Browser platforms are overwhelmingly
  // little-endian, but decode explicitly so a future big-endian target cannot
  // silently display corrupt elevations.
  const view = new DataView(gridBuffer);
  const grid = new Float32Array(metadata.grid.shape[0] * metadata.grid.shape[1]);
  for (let i = 0; i < grid.length; i += 1) grid[i] = view.getFloat32(i * 4, true);
  return { metadata, grid, gridBuffer };
}

export async function loadTerrain(urls: TerrainAssetUrls, data?: TerrainData, signal?: AbortSignal): Promise<LoadedTerrain> {
  const { metadata, grid, gridBuffer } = data ?? await loadTerrainData(urls, signal);
  if (metadata.mesh?.file && !assetUrlMatchesFilename(urls.glb, metadata.mesh.file)) {
    throw new TerrainAssetError(`GLB URL does not match metadata mesh.file (${metadata.mesh.file})`);
  }
  const glbBuffer = await (await readResponse(urls.glb, signal, 60000)).arrayBuffer();
  const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
  signal?.throwIfAborted();
  const gltf = await parseGltf(new GLTFLoader(), glbBuffer, urls.glb);
  try {
    signal?.throwIfAborted();
    if (metadata.mesh) validateGltfMeshCounts(gltf.scene, metadata.mesh);
  } catch (error) {
    (await import('./raycast')).disposeObjectResources(gltf.scene);
    throw error;
  }
  return { metadata, grid, gridBuffer, gltf };
}
