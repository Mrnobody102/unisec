import type { LoadedModel, TerrainData } from '../types/terrain';
import type { TerrainAssetUrls } from './loadTerrain';
import { loadTerrain } from './loadTerrain';

// Load Three.js and upload decoders only when an operator opens a 3D model.
let runtime: typeof import('./upload') | undefined;
async function modelRuntime() {
  return runtime ?? (runtime = await import('./upload'));
}

export async function loadModelFiles(files: File[], mode: 'single' | 'merge') {
  const tools = await modelRuntime();
  const selected = tools.selectUploadedFiles(files, mode);
  return { models: await tools.loadUploadedModels(selected), names: selected.map(file => file.name) };
}

export async function loadTerrain3D(urls: TerrainAssetUrls, data: TerrainData) {
  await modelRuntime();
  return loadTerrain(urls, data);
}

export function releaseModels(models: readonly LoadedModel[]): void {
  // Every model enters through one of the async loaders above.
  if (models.length) runtime?.releaseUploadedModels(models);
}
