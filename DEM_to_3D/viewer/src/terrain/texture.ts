import { Texture, SRGBColorSpace, Mesh, MeshStandardMaterial } from 'three';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { LoadedModel } from '../types/terrain';
import { TerrainAssetError } from './validation';

const imageExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp']);
const textureSidecarExtensions = new Set(['.tif', '.tiff']);

export type DecodedTexture = {
  texture: Texture;
  width: number;
  height: number;
};

function extension(name: string): string {
  const lower = name.toLowerCase();
  const dot = lower.lastIndexOf('.');
  return dot >= 0 ? lower.slice(dot) : '';
}

export function isImageFile(file: File): boolean {
  return imageExtensions.has(extension(file.name));
}

export function isTextureSidecarFile(file: File): boolean {
  return textureSidecarExtensions.has(extension(file.name));
}

export function isTextureFile(file: File): boolean {
  return isImageFile(file) || isTextureSidecarFile(file);
}

export function basename(file: File): string {
  const name = file.name.toLowerCase();
  const suffix = extension(name);
  return suffix ? name.slice(0, -suffix.length) : name;
}

async function decodeImageFile(file: File): Promise<DecodedTexture> {
  const bitmap = await createImageBitmap(file);
  const texture = new Texture(bitmap);
  // The exporter writes UV.v = 1 - row/(rows - 1), matching glTF's
  // bottom-left texture convention.  Keep external images in the same
  // orientation as the embedded GLB texture.
  texture.flipY = false;
  texture.needsUpdate = true;
  texture.colorSpace = SRGBColorSpace;
  return { texture, width: bitmap.width, height: bitmap.height };
}

/** Decode a GeoTIFF texture sidecar (as written by dem_to_3d_v2 --texture-crop-bbox). */
async function decodeGeoTiffFile(file: File): Promise<DecodedTexture> {
  const { fromBlob } = await import('geotiff');
  const tiff = await fromBlob(file);
  const image = await tiff.getImage();
  // `readRGB()` defaults to interleave=false and returns three separate
  // channel arrays. The canvas expects one interleaved RGB/RGBA byte stream;
  // reading interleaved here avoids uploading an almost entirely black image.
  const rgb = await image.readRGB({ interleave: true });
  const width = image.getWidth();
  const height = image.getHeight();
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new TerrainAssetError('Canvas 2D không khả dụng để decode GeoTIFF texture');
  const imageData = context.createImageData(width, height);
  const pixels = rgb as unknown as { length: number; [index: number]: number };
  const pixelCount = width * height;
  const channelCount = pixels.length >= pixelCount * 4 ? 4 : 3;
  for (let index = 0; index < pixelCount; index += 1) {
    const source = index * channelCount;
    const target = index * 4;
    imageData.data[target] = pixels[source] ?? 0;
    imageData.data[target + 1] = pixels[source + 1] ?? 0;
    imageData.data[target + 2] = pixels[source + 2] ?? 0;
    // readRGB() normally returns RGB, not RGBA. Leaving this at zero makes
    // the canvas fully transparent and the imported terrain look grey/blank.
    imageData.data[target + 3] = channelCount === 4 ? (pixels[source + 3] ?? 255) : 255;
  }
  context.putImageData(imageData, 0, 0);
  const bitmap = await createImageBitmap(canvas);
  const texture = new Texture(bitmap);
  texture.flipY = false;
  texture.needsUpdate = true;
  texture.colorSpace = SRGBColorSpace;
  return { texture, width, height };
}

export async function decodeTextureFile(file: File): Promise<DecodedTexture> {
  if (isImageFile(file)) return decodeImageFile(file);
  if (isTextureSidecarFile(file)) return decodeGeoTiffFile(file);
  throw new TerrainAssetError(`Không hỗ trợ file texture: ${file.name}`);
}

function allMeshes(root: GLTF['scene']): Mesh[] {
  const meshes: Mesh[] = [];
  root.traverse((object) => {
    const mesh = object as Mesh;
    if (mesh.isMesh) meshes.push(mesh);
  });
  return meshes;
}

function meshHasUv(mesh: Mesh): boolean {
  const uv = mesh.geometry.getAttribute('uv');
  return uv !== undefined && uv.count > 0;
}

/**
 * Check whether every mesh in the model already carries a UV attribute, which
 * is required before an external texture image can be swapped in.
 */
export function modelHasUvMaps(model: LoadedModel): boolean {
  const meshes = allMeshes(model.gltf.scene);
  if (meshes.length === 0) return false;
  return meshes.every(meshHasUv);
}

/** Count how many meshes carry UV sets across the model. */
export function countTextureSlots(model: LoadedModel): number {
  return allMeshes(model.gltf.scene).filter(meshHasUv).length;
}

function disposeExistingMaterialTextures(material: MeshStandardMaterial): void {
  if (material.map) {
    material.map.dispose();
    material.map = null;
  }
}

/**
 * Apply a decoded texture image to every mesh of a model.
 *
 * - Meshes with an existing UV attribute keep their UVs and only get the
 *   texture image replaced (PNG/JPG/WebP/GeoTIFF of the same area).
 * - Meshes without UVs raise an error: the GLB must be exported with
 *   --texture once so UVs are baked in, or the caller must supply grid
 *   metadata so UVs can be recomputed.
 */
export function applyTextureToModel(scene: GLTF['scene'], modelName: string, decoded: DecodedTexture): void {
  const meshes = allMeshes(scene);
  if (meshes.length === 0) throw new TerrainAssetError(`Model ${modelName} không chứa mesh nào để dán texture`);
  const withoutUv = meshes.filter((mesh) => !meshHasUv(mesh));
  if (withoutUv.length > 0) {
    throw new TerrainAssetError(
      `Model ${modelName} không có UV map (phải xuất GLB kèm --texture ít nhất 1 lần để có UV, hoặc dùng bản export khác)`,
    );
  }
  for (const mesh of meshes) {
    const material = mesh.material as MeshStandardMaterial | MeshStandardMaterial[];
    const targets = Array.isArray(material) ? material : [material];
    for (const mat of targets) {
      if (!(mat instanceof MeshStandardMaterial)) continue;
      disposeExistingMaterialTextures(mat);
      mat.map = decoded.texture;
      mat.color.set('#ffffff');
      mat.needsUpdate = true;
    }
  }
}
