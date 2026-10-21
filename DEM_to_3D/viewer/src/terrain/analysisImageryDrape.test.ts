import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import type { LoadedModel } from '../types/terrain';
import type { ImageryRaster } from '../features/imagery/analysisImagery';
import { analysisTextureFrame, createAnalysisDrape } from './analysisImageryDrape';

const raster = (bounds: number[], width: number) => ({terrain:{bounds,width}} as ImageryRaster);

describe('georeferenced analysis drape', () => {
  it('preserves native pixels and maps the canvas outer edges without stretching a partial last pixel', () => {
    const frame = analysisTextureFrame([raster([100,200,109,209],3),raster([109,200,110,210],1)],4096);
    expect(frame.metresPerPixel).toBe(1);
    expect(frame.bounds).toEqual([100,200,110,210]);
    const partial = analysisTextureFrame([raster([100,200,109,210],3)],4096);
    expect(partial.bounds).toEqual([100,198,109,210]);
    expect(partial.height * partial.metresPerPixel).toBe(partial.bounds[3] - partial.bounds[1]);
  });
  it('limits GPU dimensions while keeping a single geographic scale in both axes', () => {
    const frame = analysisTextureFrame([raster([0,0,12000,20000],4000)],2048);
    expect(frame.width).toBeLessThanOrEqual(2048);
    expect(frame.height).toBeLessThanOrEqual(2048);
    expect(frame.bounds[2] / frame.width).toBeCloseTo(frame.bounds[3] / frame.height);
  });
  it('shares terrain geometry without replacing original imagery materials or UVs, including on disposal', () => {
    const root = new THREE.Group(), material = new THREE.MeshBasicMaterial({color:'green'});
    const geometry = new THREE.PlaneGeometry(20,20), mesh = new THREE.Mesh(geometry,material);
    root.add(mesh);
    const uv = geometry.getAttribute('uv'), positions = geometry.getAttribute('position');
    let geometryDisposals = 0; geometry.addEventListener('dispose',()=>geometryDisposals++);
    const drape = createAnalysisDrape([{model:{metadata:{world_origin:{x:100,y:200}}} as LoadedModel,root,meshes:[mesh]}],4096,()=>{});
    const overlay = root.getObjectByName('analysis-imagery-drape')!;
    expect((overlay.children[0] as THREE.Mesh).geometry).toBe(geometry);
    expect(mesh.material).toBe(material);
    expect(geometry.getAttribute('uv')).toBe(uv);
    expect(geometry.getAttribute('position')).toBe(positions);
    drape.dispose();
    expect(root.getObjectByName('analysis-imagery-drape')).toBeUndefined();
    expect(geometryDisposals).toBe(0);
    geometry.dispose(); material.dispose();
  });
});
