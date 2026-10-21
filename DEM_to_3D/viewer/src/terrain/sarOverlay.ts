import * as THREE from 'three';
import proj4 from 'proj4';
import { fromBlob, type GeoTIFFImage } from 'geotiff';
import type { TerrainMetadata } from '../types/terrain';
import { sceneToProjected } from './coordinate';

export type SarBand = { index: number; label: string; description?: string };
export type SarRaster = {
  name: string; bands: SarBand[]; width: number; height: number; crs?: string;
  bbox: [number, number, number, number]; nodata?: number;
  transform?: { a: number; b: number; c: number; d: number; e: number; f: number };
  readBand: (index: number) => Promise<ArrayLike<number>>;
};

async function bandLabels(image: GeoTIFFImage): Promise<SarBand[]> {
  return Promise.all(Array.from({ length: image.getSamplesPerPixel() }, async (_, index) => {
    const metadata = await image.getGDALMetadata(index);
    const description = metadata?.DESCRIPTION;
    return { index, label: typeof description === 'string' && description.trim() ? description.trim() : `Band ${index + 1}` };
  }));
}

export async function readSarRaster(file: File): Promise<SarRaster> {
  if (file.size > 512 * 1024 * 1024) throw new Error('SAR GeoTIFF exceeds the 512 MB display limit.');
  const tiff = await fromBlob(file);
  const image = await tiff.getImage();
  const keys = image.getGeoKeys?.() ?? {};
  const epsg = keys.ProjectedCSTypeGeoKey ?? keys.GeographicTypeGeoKey;
  const directory = image.getFileDirectory();
  const matrix = directory.getValue('ModelTransformation');
  const origin = image.getOrigin(), resolution = image.getResolution();
  const transform = matrix
    ? { a: matrix[0], b: matrix[1], c: matrix[3], d: matrix[4], e: matrix[5], f: matrix[7] }
    : { a: resolution[0], b: 0, c: origin[0], d: 0, e: resolution[1], f: origin[1] };
  // PixelIsPoint origins describe the first sample centre rather than its outer corner.
  if (keys.GTRasterTypeGeoKey === 2) {
    transform.c -= (transform.a + transform.b) / 2;
    transform.f -= (transform.d + transform.e) / 2;
  }
  if (!epsg || epsg === 32767) throw new Error('SAR GeoTIFF requires a declared EPSG CRS.');
  registerCrs(`EPSG:${epsg}`);
  if (!proj4.defs(`EPSG:${epsg}`)) throw new Error(`Unsupported SAR CRS: EPSG:${epsg}`);
  const sourceWidth = image.getWidth(), sourceHeight = image.getHeight();
  if (!Number.isSafeInteger(sourceWidth) || !Number.isSafeInteger(sourceHeight) || sourceWidth < 1 || sourceHeight < 1) throw new Error('Invalid SAR raster dimensions.');
  const bands = image.getSamplesPerPixel();
  const decodedBytes = sourceWidth * sourceHeight * image.getBytesPerPixel();
  if (!Number.isSafeInteger(bands) || bands < 1 || bands > 16 || !Number.isFinite(decodedBytes) || decodedBytes > 256 * 1024 * 1024) throw new Error('SAR decode exceeds the 256 MiB display budget; prepare a smaller georeferenced raster.');
  const scale = Math.min(1, 2048 / Math.max(sourceWidth, sourceHeight));
  const width = Math.max(1, Math.round(sourceWidth * scale)), height = Math.max(1, Math.round(sourceHeight * scale));
  transform.a *= sourceWidth / width; transform.d *= sourceWidth / width;
  transform.b *= sourceHeight / height; transform.e *= sourceHeight / height;
  if (!Object.values(transform).every(Number.isFinite) || Math.abs(transform.a * transform.e - transform.b * transform.d) < 1e-20) throw new Error('Invalid SAR geotransform.');
  const rawNodata = image.getGDALNoData?.();
  return {
    name: file.name, bands: await bandLabels(image), width, height,
    crs: `EPSG:${epsg}`, bbox: image.getBoundingBox() as [number, number, number, number], transform,
    nodata: rawNodata == null ? undefined : Number(rawNodata),
    readBand: async (index) => {
      if (!Number.isInteger(index) || index < 0 || index >= image.getSamplesPerPixel()) throw new Error('Invalid SAR band');
      const rasters = await image.readRasters({ samples: [index], interleave: false, width, height, resampleMethod: 'nearest' });
      return rasters[0] as ArrayLike<number>;
    },
  };
}

function registerCrs(crs: string): void {
  const match = /^EPSG:(326|327)(\d{2})$/i.exec(crs);
  if (match && !proj4.defs(crs)) proj4.defs(crs, `+proj=utm +zone=${Number(match[2])} ${match[1] === '327' ? '+south' : ''} +datum=WGS84 +units=m +no_defs`);
}

export function sarPixels(values: ArrayLike<number>, nodata?: number): { data: Uint8Array<ArrayBuffer>; low: number; high: number } {
  const valid = Array.from(values).filter((v) => Number.isFinite(v) && v !== nodata).sort((a, b) => a - b);
  const low = valid[Math.floor(valid.length * 0.02)] ?? 0;
  const high = valid[Math.min(valid.length - 1, Math.floor(valid.length * 0.98))] ?? low;
  const data = new Uint8Array(values.length * 4);
  for (let i = 0; i < values.length; i++) {
    if (!Number.isFinite(values[i]) || values[i] === nodata) continue;
    const c = high === low ? 128 : Math.round(255 * THREE.MathUtils.clamp((values[i] - low) / (high - low), 0, 1));
    data.set([c, c, c, 255], i * 4);
  }
  return { data, low, high };
}

function sarProjector(raster: SarRaster, metadata: TerrainMetadata): (point: THREE.Vector3) => [number, number] {
  if (!raster.crs) throw new Error('SAR GeoTIFF requires a supported CRS.');
  const target = metadata.crs.proj4 || `${metadata.crs.authority}:${metadata.crs.code}`;
  registerCrs(target); registerCrs(raster.crs);
  const projection = proj4(target, raster.crs);
  const [minX, minY, maxX, maxY] = raster.bbox;
  const t = raster.transform ?? { a: (maxX - minX) / raster.width, b: 0, c: minX, d: 0, e: -(maxY - minY) / raster.height, f: maxY };
  const det = t.a * t.e - t.b * t.d;
  if (!Number.isFinite(det) || Math.abs(det) < 1e-20) throw new Error('SAR geotransform is not invertible.');
  return point => {
    const projected = sceneToProjected(metadata, point).projected;
    const [x, y] = projection.forward([projected.x, projected.y]);
    return [(t.e * (x - t.c) - t.b * (y - t.f)) / det / raster.width,
      (-t.d * (x - t.c) + t.a * (y - t.f)) / det / raster.height];
  };
}

export function sarUv(raster: SarRaster, metadata: TerrainMetadata, point: THREE.Vector3): [number, number] {
  return sarProjector(raster, metadata)(point);
}

export type SarSurface = { render: (color: boolean, visible: boolean, opacity: number, render: () => void) => void; dispose: () => void };

// Swap only for the draw: tile streaming and model ownership always see their original resources.
export async function createSarOverlay(raster: SarRaster, band: number, models: { root: THREE.Object3D; metadata: TerrainMetadata }[], signal?: AbortSignal): Promise<SarSurface> {
  signal?.throwIfAborted();
  const values = await raster.readBand(band);
  signal?.throwIfAborted();
  if (values.length !== raster.width * raster.height) throw new Error('SAR band dimensions do not match the raster.');
  const pixels = sarPixels(values, raster.nodata);
  const texture = new THREE.DataTexture(pixels.data, raster.width, raster.height, THREE.RGBAFormat);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter; texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  const opacityUniform = { value: 0 };
  const bindings: { mesh: THREE.Mesh; geometry: THREE.BufferGeometry; color: THREE.Material | THREE.Material[]; neutral: THREE.Material | THREE.Material[] }[] = [];
  const materials: THREE.Material[] = [];
  const geometries: THREE.BufferGeometry[] = [];
  let disposed = false;
  const dispose = (): void => {
    if (disposed) return;
    disposed = true;
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((m) => m.dispose()); texture.dispose();
  };
  const decorate = (original: THREE.Material): THREE.Material => {
    const clone = original.clone(); materials.push(clone);
    const hook = original.onBeforeCompile;
    const key = original.customProgramCacheKey();
    clone.onBeforeCompile = (shader, renderer) => {
      hook.call(original, shader, renderer);
      shader.uniforms.sarMap = { value: texture };
      shader.uniforms.sarOpacity = opacityUniform;
      shader.vertexShader = 'attribute vec2 sarUv; varying vec2 vSarUv;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvSarUv = sarUv;');
      shader.fragmentShader = 'uniform sampler2D sarMap; uniform float sarOpacity; varying vec2 vSarUv;\n' + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace('#include <alphamap_fragment>', `#include <alphamap_fragment>
if (vSarUv.x >= 0.0 && vSarUv.x <= 1.0 && vSarUv.y >= 0.0 && vSarUv.y <= 1.0) {
  vec4 sarSample = texture2D(sarMap, vSarUv);
  diffuseColor.rgb = mix(diffuseColor.rgb, sarSample.rgb, sarSample.a * sarOpacity);
}`);
    };
    clone.customProgramCacheKey = () => `${key}:sar-surface-v1`;
    return clone;
  };
  try {
    for (const { root, metadata } of models) {
      root.updateWorldMatrix(true, true);
      const inverse = root.matrixWorld.clone().invert();
      const project = sarProjector(raster, metadata);
      const meshes: THREE.Mesh[] = [];
      root.traverse(object => { if ((object as THREE.Mesh).isMesh) meshes.push(object as THREE.Mesh); });
      for (const mesh of meshes) {
        signal?.throwIfAborted();
        const geometry = mesh.geometry.clone();
        geometries.push(geometry);
        const position = geometry.getAttribute('position');
        const matrix = new THREE.Matrix4().multiplyMatrices(inverse, mesh.matrixWorld);
        const uv = new Float32Array(position.count * 2), point = new THREE.Vector3();
        for (let i = 0; i < position.count; i++) {
          if (i > 0 && i % 8192 === 0) { await new Promise<void>(resolve => setTimeout(resolve, 0)); signal?.throwIfAborted(); }
          uv.set(project(point.fromBufferAttribute(position, i).applyMatrix4(matrix)), i * 2);
        }
        geometry.setAttribute('sarUv', new THREE.Float32BufferAttribute(uv, 2));
        const originals = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        const color = originals.map(decorate);
        const neutral = originals.map(() => {
          const base = new THREE.MeshStandardMaterial({ color: '#b8b8b8', roughness: 0.92, side: THREE.DoubleSide });
          const result = decorate(base); base.dispose(); return result;
        });
        bindings.push({ mesh, geometry, color: Array.isArray(mesh.material) ? color : color[0], neutral: Array.isArray(mesh.material) ? neutral : neutral[0] });
      }
    }
  } catch (error) { dispose(); throw error; }
  return {
    dispose,
    render: (color, visible, opacity, render) => {
      if (disposed) { render(); return; }
      opacityUniform.value = visible ? THREE.MathUtils.clamp(opacity, 0, 1) : 0;
      const originals = bindings.map(({ mesh }) => ({ mesh, geometry: mesh.geometry, material: mesh.material }));
      try {
        bindings.forEach((b) => {
          if (color) {
            const sources = Array.isArray(b.mesh.material) ? b.mesh.material : [b.mesh.material];
            const targets = Array.isArray(b.color) ? b.color : [b.color];
            targets.forEach((target, index) => {
              const source = sources[index] as THREE.MeshLambertMaterial;
              const clone = target as THREE.MeshLambertMaterial;
              if (clone.map !== source.map || clone.vertexColors !== source.vertexColors) {
                clone.map = source.map; clone.vertexColors = source.vertexColors; clone.needsUpdate = true;
              }
              if (clone.color && source.color) clone.color.copy(source.color);
            });
          }
          b.mesh.geometry = b.geometry; b.mesh.material = color ? b.color : b.neutral;
        });
        render();
      } finally { originals.forEach((b) => { b.mesh.geometry = b.geometry; b.mesh.material = b.material; }); }
    },
  };
}
