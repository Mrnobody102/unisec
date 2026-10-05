import { LoadingManager } from 'three';
import type { GLTFLoader, GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { LoadedModel, TerrainMetadata } from '../types/terrain';
import { assetUrlMatchesFilename, validateGltfMeshCounts } from './loadTerrain';
import { disposeObjectResources } from './raycast';
import { TerrainAssetError, validateGridBuffer, validateMetadata } from './validation';
import { applyTextureToModel, basename as textureBasename, decodeTextureFile, isTextureFile } from './texture';

const modelExtensions = new Set(['.glb', '.gltf']);
const sidecarExtensions = new Set(['.terrain.json', '.grid.bin']);

export type UploadedFilePair = {
  model: File;
  metadata?: File;
  grid?: File;
  texture?: File;
  resources: File[];
};

export function selectUploadedFiles(files: readonly File[], mode: 'single' | 'merge'): File[] {
  if (mode === 'merge') return [...files];
  const model = files.find(isModel);
  if (!model) throw new TerrainAssetError('Choose at least one .glb or .gltf model file');
  const key = basename(model);
  return files.filter((file) => {
    if (file === model) return true;
    if (isSidecar(file)) return basename(file) === key;
    if (isTextureFile(file)) return textureMatchesModel(file, key);
    return !isModel(file);
  });
}

function lowerName(file: File): string {
  return file.name.toLowerCase();
}

function extension(name: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith('.terrain.json')) return '.terrain.json';
  if (lower.endsWith('.grid.bin')) return '.grid.bin';
  const dot = lower.lastIndexOf('.');
  return dot >= 0 ? lower.slice(dot) : '';
}

function basename(file: File): string {
  const name = lowerName(file);
  const suffix = extension(name);
  return suffix ? name.slice(0, -suffix.length) : name;
}

function isModel(file: File): boolean {
  return modelExtensions.has(extension(file.name));
}

function isSidecar(file: File): boolean {
  return sidecarExtensions.has(extension(file.name));
}

function findUniqueByName(files: File[], name: string): File | undefined {
  const matches = files.filter((file) => lowerName(file) === name);
  if (matches.length > 1) throw new TerrainAssetError(`Duplicate uploaded file name ${name} is ambiguous`);
  return matches[0];
}

function textureMatchesModel(file: File, modelKey: string): boolean {
  const key = textureBasename(file);
  // Accept both `name.tif` and the exporter default
  // `name.texture.tif` naming convention.
  return key === modelKey || key === `${modelKey}.texture`;
}

function findUniqueTexture(files: File[], modelKey: string): File | undefined {
  const matches = files.filter((file) => textureMatchesModel(file, modelKey));
  if (matches.length > 1) {
    throw new TerrainAssetError(`Multiple texture files match model ${modelKey}: ${matches.map((file) => file.name).join(', ')}`);
  }
  return matches[0];
}

export function pairUploadedFiles(files: readonly File[]): UploadedFilePair[] {
  const models = files.filter(isModel);
  if (models.length === 0) throw new TerrainAssetError('Choose at least one .glb or .gltf model file');

  const metadataFiles = files.filter((file) => extension(file.name) === '.terrain.json');
  const gridFiles = files.filter((file) => extension(file.name) === '.grid.bin');
  const textureFiles = files.filter(isTextureFile);
  const pairs = models.map((model) => {
    const key = basename(model);
    const metadata = findUniqueByName(metadataFiles, `${key}.terrain.json`);
    const grid = findUniqueByName(gridFiles, `${key}.grid.bin`);
    const texture = findUniqueTexture(textureFiles, key);
    return { model, metadata, grid, texture, resources: files.filter((file) => !isModel(file) && !isSidecar(file) && !isTextureFile(file)) };
  });

  const pairedNames = new Set(pairs.flatMap((pair) => [pair.metadata?.name.toLowerCase(), pair.grid?.name.toLowerCase()].filter((name): name is string => Boolean(name))));
  const orphanSidecar = [...metadataFiles, ...gridFiles].find((file) => !pairedNames.has(lowerName(file)));
  if (orphanSidecar) {
    throw new TerrainAssetError(`Sidecar ${orphanSidecar.name} does not match uploaded model(s): ${models.map((model) => model.name).join(', ')}`);
  }
  return pairs;
}

function parseGltf(loader: GLTFLoader, buffer: ArrayBuffer): Promise<GLTF> {
  return new Promise((resolve, reject) => loader.parse(buffer, 'https://uploads.invalid/', resolve, reject));
}

function decodeGrid(buffer: ArrayBuffer, metadata: TerrainMetadata): Float32Array {
  validateGridBuffer(metadata, buffer);
  const view = new DataView(buffer);
  const grid = new Float32Array(metadata.grid.shape[0] * metadata.grid.shape[1]);
  for (let index = 0; index < grid.length; index += 1) grid[index] = view.getFloat32(index * 4, true);
  return grid;
}

function resourceUrlMap(files: File[], objectUrls: string[]): Map<string, string> {
  const urls = new Map<string, string>();
  files.forEach((file) => {
    const url = URL.createObjectURL(file);
    objectUrls.push(url);
    const key = file.name.toLowerCase();
    if (urls.has(key)) throw new TerrainAssetError(`Duplicate uploaded resource name ${file.name} is ambiguous`);
    urls.set(key, url);
  });
  return urls;
}

function resolveResourceUrl(url: string, resources: Map<string, string>): string {
  if (/^(data:|blob:|https?:|\/\/)/i.test(url)) {
    const name = decodeURIComponent(url).split(/[\\/]/).filter(Boolean).at(-1)?.toLowerCase();
    return name && resources.get(name) ? resources.get(name)! : url;
  }
  const name = decodeURIComponent(url).split(/[\\/]/).filter(Boolean).at(-1)?.toLowerCase();
  return name && resources.get(name) ? resources.get(name)! : url;
}

export function releaseUploadedModels(models: readonly LoadedModel[]): void {
  models.forEach((model) => {
    if (!model.released) {
      model.released = true;
      disposeObjectResources(model.gltf.scene, !model.bvhDisposed);
    }
    model.objectUrls.forEach((url) => URL.revokeObjectURL(url));
    model.objectUrls.length = 0;
  });
}

export async function loadUploadedModels(files: readonly File[]): Promise<LoadedModel[]> {
  const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
  const pairs = pairUploadedFiles(files);
  const loaded: LoadedModel[] = [];
  try {
    for (const pair of pairs) {
      const objectUrls: string[] = [];
      try {
        const resources = resourceUrlMap([pair.model, ...pair.resources], objectUrls);
        let metadata: TerrainMetadata | undefined;
        let grid: Float32Array | undefined;
        let gridBuffer: ArrayBuffer | undefined;
        if (pair.metadata) {
          metadata = validateMetadata(JSON.parse(await pair.metadata.text()) as unknown);
          if (pair.grid) {
            if (!assetUrlMatchesFilename(pair.grid.name, metadata.grid.file)) {
              throw new TerrainAssetError(`Grid file ${pair.grid.name} does not match metadata grid.file (${metadata.grid.file})`);
            }
            gridBuffer = await pair.grid.arrayBuffer();
            grid = decodeGrid(gridBuffer, metadata);
          }
          if (metadata.mesh && !assetUrlMatchesFilename(pair.model.name, metadata.mesh.file)) {
            throw new TerrainAssetError(`Model file ${pair.model.name} does not match metadata mesh.file (${metadata.mesh.file})`);
          }
        }
        const manager = new LoadingManager();
        manager.setURLModifier((url) => resolveResourceUrl(url, resources));
        const gltf = await parseGltf(new GLTFLoader(manager), await pair.model.arrayBuffer());
        try {
          if (metadata?.mesh) validateGltfMeshCounts(gltf.scene, metadata.mesh);
        } catch (error) {
          disposeObjectResources(gltf.scene);
          throw error;
        }
        if (pair.texture) {
          const decoded = await decodeTextureFile(pair.texture);
          applyTextureToModel(gltf.scene, pair.model.name, decoded);
        }
        loaded.push({ id: `${pair.model.name}-${loaded.length}`, name: pair.model.name, metadata, grid, gridBuffer, gltf, objectUrls });
      } catch (error) {
        objectUrls.forEach((url) => URL.revokeObjectURL(url));
        throw error;
      }
    }
    return loaded;
  } catch (error) {
    releaseUploadedModels(loaded);
    throw error;
  }
}
