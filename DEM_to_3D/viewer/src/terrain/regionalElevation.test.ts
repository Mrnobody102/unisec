import { describe, it, expect, vi, afterEach } from 'vitest';
import * as THREE from 'three';
import { decodeTerrarium, sampleElevationTiles, createRegionalElevation, type ElevationTile } from './regionalElevation';
import { tileGeometry, tileLonLat } from './regionalBasemap';
import { createGeographicPlacements } from './geographic';
import { projectedToScene, sceneToProjected, pixelToProjected } from './coordinate';
import { validateMetadata } from './validation';
import metadataJson from '../../public/terrain/che_tao_v2_tex.terrain.json';
const metadata = validateMetadata(metadataJson);

describe('regional elevation underlay', () => {
  it('decodes metres and preserves missing samples instead of turning them into cliffs', () => {
    const result = decodeTerrarium(new Uint8ClampedArray([137,219,68,255, 128,0,0,255, 0,0,0,255, 128,0,0,0]));
    expect(result[0]).toBe(2523.265625); expect(result[1]).toBe(0);
    expect(Number.isNaN(result[2])).toBe(true); expect(Number.isNaN(result[3])).toBe(true);
  });
  it('interpolates across neighbouring pixel centres and does not bridge a missing tile', () => {
    const left: ElevationTile = {x:1,y:1,z:2,heights:new Float32Array(256*256).fill(100)};
    const right = {...left,x:2,heights:new Float32Array(256*256).fill(200)};
    const tiles = new Map([['2/1/1',left],['2/2/1',right]]);
    const [lon,lat] = tileLonLat(2,1.5,2);
    expect(sampleElevationTiles(tiles,2,lon,lat)).toBeCloseTo(150);
    tiles.delete('2/2/1'); expect(sampleElevationTiles(tiles,2,lon,lat)).toBeUndefined();
  });
  it('builds no triangles across unknown heights', () => {
    const mesh = tileGeometry(metadata,{x:1615,y:897,z:11},()=>undefined);
    expect(mesh.index?.count).toBe(0); mesh.dispose();
  });
  it('leaves source grids and analysis elevations untouched', () => {
    const grid = new Float32Array(metadata.grid.shape[0]*metadata.grid.shape[1]).fill(1000);
    const relief = createRegionalElevation(metadata,[{metadata,grid}],[],()=>{});
    const p = pixelToProjected(metadata,10,10);
    expect(relief.sample(p.x,p.y)).toBe(992); expect(grid[0]).toBe(1000);
    expect(relief.sample(0,0)).toBeUndefined(); relief.dispose();
  });
  it('scales baked GLBs, overlays and inverse picks in the same geographic frame', () => {
    const other = {...metadata,world_origin:{x:metadata.world_origin.x+100,y:metadata.world_origin.y+200},elevation:{...metadata.elevation,base_elevation:600,exaggeration:2}};
    const placements = createGeographicPlacements([{name:'first',metadata},{name:'second',metadata:other}],0,1.15);
    const p = {x:metadata.world_origin.x+150,y:metadata.world_origin.y+300};
    const world = [metadata,other].map((m,i)=>{
      const placement=placements[i], point=projectedToScene(m,p,1400);
      const transform=new THREE.Matrix4().compose(new THREE.Vector3(placement.position.x,placement.position.y,placement.position.z),new THREE.Quaternion(),new THREE.Vector3(1,placement.scaleY,1));
      const w=new THREE.Vector3(point.x,point.y,point.z).applyMatrix4(transform);
      const pick=sceneToProjected(m,w.clone().applyMatrix4(transform.clone().invert()));
      expect(pick.elevation).toBeCloseTo(1400); expect(pick.projected.x).toBeCloseTo(p.x);
      return w;
    });
    expect(world[0].distanceTo(world[1])).toBeLessThan(1e-8);
    expect(metadata.elevation.exaggeration).toBe(1.5);
  });
});


describe('context relief lifecycle', () => {
  afterEach(() => vi.unstubAllGlobals());
  const environment = () => {
    vi.stubGlobal('window', {setTimeout, clearTimeout});
    const rgba = new Uint8ClampedArray(256*256*4);
    for (let i=0;i<rgba.length;i+=4) {rgba[i]=128;rgba[i+1]=100;rgba[i+3]=255;}
    vi.stubGlobal('document', {createElement:()=>({getContext:()=>({drawImage:()=>{},getImageData:()=>({data:rgba})})})});
    const close=vi.fn();
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({width:256,height:256,close}));
    return close;
  };
  it('recovers after failure without requesting a completed dataset again', async () => {
    environment();
    const fetcher=vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue({ok:true,blob:async()=>new Blob()});
    vi.stubGlobal('fetch',fetcher);
    const ready=vi.fn(), relief=createRegionalElevation(metadata,[],[{x:0,y:0,z:1}],ready);
    await relief.load(); expect(relief.status).toBe('error');
    await relief.load(); expect(relief.status).toBe('ready');
    await relief.load(); expect(fetcher).toHaveBeenCalledTimes(2);
    expect(ready).toHaveBeenCalledTimes(2); relief.dispose();
  });
  it('discards a late decode when the 3D view is closed', async () => {
    const close=environment();
    let finish!: (value: unknown)=>void;
    vi.stubGlobal('fetch',vi.fn(()=>new Promise(resolve=>{finish=resolve;})));
    const ready=vi.fn(), relief=createRegionalElevation(metadata,[],[{x:1,y:1,z:1}],ready);
    const loading=relief.load(); relief.dispose();
    finish({ok:true,blob:async()=>new Blob()}); await loading;
    expect(ready).not.toHaveBeenCalled(); expect(close).toHaveBeenCalledOnce();
  });
});
