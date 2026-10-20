import {expect,it,vi} from 'vitest';
import * as loader from './imageryAtlas';
import proj4 from 'proj4';
import * as THREE from 'three';
import {createViewImagery,viewImageryTiles,visibleImageryPoints} from './viewImagery';
import {basemapFrame} from './basemapFrame';
import {pixelToProjected} from './coordinate';
import {tileLonLat} from './regionalBasemap';
import {validateMetadata} from './validation';
import first from '../../public/terrain/che_tao_v2_tex.terrain.json';
import second from '../../public/terrain/lao_chai_v2_tex.terrain.json';
const metadata=validateMetadata(first),other=validateMetadata(second);
it('covers the full visible window with bounded requests and a tile buffer',()=>{
 const point=pixelToProjected(metadata,100,100),points=[point,{x:point.x+3500,y:point.y+2000}];
 const tiles=viewImageryTiles(metadata,points,19);
 expect(tiles.length).toBeGreaterThan(0);expect(tiles.length).toBeLessThanOrEqual(256);
 for(const p of points){
  const [lon,lat]=proj4(metadata.crs.proj4!,'EPSG:4326',[p.x,p.y]);
  expect(tiles.some(t=>{const a=tileLonLat(t.x,t.y,t.z),b=tileLonLat(t.x+1,t.y+1,t.z);return lon>=a[0]&&lon<=b[0]&&lat<=a[1]&&lat>=b[1];})).toBe(true);
 }
 expect(viewImageryTiles(metadata,[{x:NaN,y:0}],19)).toEqual([]);
 expect(viewImageryTiles(metadata,points,19,64).length).toBeLessThanOrEqual(64);
});
it('clips the terrain to the camera rather than downloading the entire DEM at close range',()=>{
 const mesh=new THREE.Mesh(new THREE.PlaneGeometry(40000,40000));mesh.rotation.x=-Math.PI/2;
 const camera=new THREE.PerspectiveCamera(45,1.6,1,100000);camera.position.set(0,2500,2000);camera.lookAt(0,0,0);
 const points=visibleImageryPoints(metadata,new THREE.Matrix4(),camera,[mesh]);
 expect(points.length).toBeGreaterThan(0);
 expect(Math.max(...points.map(p=>p.x))-Math.min(...points.map(p=>p.x))).toBeLessThan(15000);
 mesh.position.x=1000000;
 expect(visibleImageryPoints(metadata,new THREE.Matrix4(),camera,[mesh])).toEqual([]);
 mesh.geometry.dispose();(mesh.material as THREE.Material).dispose();
});
it('frames both existing DEMs without representing their bounding box as measured elevation',()=>{
 const combined=basemapFrame([metadata,other]);expect(combined.analysis_supported).toBe(false);
 const nw=pixelToProjected(combined,0,0),se=pixelToProjected(combined,combined.grid.shape[1]-1,combined.grid.shape[0]-1);
 for(const m of [metadata,other])for(const col of [0,m.grid.shape[1]-1])for(const row of [0,m.grid.shape[0]-1]){
  const p=pixelToProjected(m,col,row);expect(p.x).toBeGreaterThanOrEqual(nw.x);expect(p.x).toBeLessThanOrEqual(se.x);expect(p.y).toBeLessThanOrEqual(nw.y);expect(p.y).toBeGreaterThanOrEqual(se.y);
 }
});

it('cancels stale views, retains the complete image through failure, and retries without duplicate loads',async()=>{
 vi.useFakeTimers();vi.stubGlobal('document',{documentElement:{lang:'en'},createElement:()=>({setAttribute:vi.fn(),remove:vi.fn(),width:256,height:256})});
 let x=0;
 const make=()=>({zoom:18,minX:0,minY:0,maxX:1,maxY:1,texture:new THREE.CanvasTexture(document.createElement('canvas')),dispose:vi.fn()});
 const first=make(),stale=make(),last=make();let finish!:(value:typeof stale)=>void,signal!:AbortSignal;
 const load=vi.spyOn(loader,'loadImageryAtlas').mockResolvedValueOnce(first)
  .mockImplementationOnce((_tiles,s)=>{signal=s;return new Promise(resolve=>{finish=resolve;});})
  .mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(last);
 const publish=vi.fn(),view=createViewImagery(()=>[{x,y:1,z:18}],4,publish,vi.fn());
 try{
  view.setEnabled(true);await vi.advanceTimersByTimeAsync(250);expect(publish).toHaveBeenLastCalledWith(first);
  view.schedule();await vi.advanceTimersByTimeAsync(250);expect(load).toHaveBeenCalledTimes(1);
  x=1;view.schedule();await vi.advanceTimersByTimeAsync(250);
  expect(publish).toHaveBeenCalledTimes(1);expect(view.status.hidden).toBe(false);
  x=2;view.schedule();await vi.advanceTimersByTimeAsync(250);expect(signal.aborted).toBe(true);
  expect(first.dispose).not.toHaveBeenCalled();expect(view.status.hidden).toBe(true);
  finish(stale);await vi.advanceTimersByTimeAsync(0);expect(stale.dispose).toHaveBeenCalledOnce();
  view.retry();await vi.advanceTimersByTimeAsync(250);expect(publish).toHaveBeenLastCalledWith(last);expect(first.dispose).toHaveBeenCalledOnce();
 }finally{view.dispose();load.mockRestore();vi.unstubAllGlobals();vi.useRealTimers();}
});

it('publishes a complete view before its fine refinement finishes',async()=>{
 vi.useFakeTimers();vi.stubGlobal('document',{documentElement:{lang:'en'},createElement:()=>({setAttribute:vi.fn(),remove:vi.fn(),width:256,height:256})});
 const make=(zoom:number)=>({zoom,minX:0,minY:0,maxX:10,maxY:10,texture:new THREE.CanvasTexture(document.createElement('canvas')),dispose:vi.fn()});
 const coarse=make(17),fine=make(18);let finish!:(value:typeof fine)=>void;
 const load=vi.spyOn(loader,'loadImageryAtlas').mockResolvedValueOnce(coarse).mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));
 const tiles=Array.from({length:100},(_,i)=>({x:i%10,y:Math.floor(i/10),z:18})),publish=vi.fn();
 const view=createViewImagery(()=>tiles,4,publish,vi.fn());
 try{
  view.setEnabled(true);await vi.advanceTimersByTimeAsync(250);
  expect(load.mock.calls[0][0]).toHaveLength(25);expect(publish).toHaveBeenLastCalledWith(coarse);
  expect(view.status.hidden).toBe(false);expect(coarse.dispose).not.toHaveBeenCalled();
  finish(fine);await vi.advanceTimersByTimeAsync(0);
  expect(publish).toHaveBeenLastCalledWith(fine);expect(coarse.dispose).toHaveBeenCalledOnce();expect(view.status.hidden).toBe(true);
 }finally{view.dispose();load.mockRestore();vi.unstubAllGlobals();vi.useRealTimers();}
});

it('does not starve image requests during continuous camera motion',async()=>{
 vi.useFakeTimers();vi.stubGlobal('document',{documentElement:{lang:'en'},createElement:()=>({setAttribute:vi.fn(),remove:vi.fn()})});
 const load=vi.spyOn(loader,'loadImageryAtlas').mockResolvedValue(null),view=createViewImagery(()=>[{x:1,y:1,z:18}],4,vi.fn(),vi.fn());
 try{
  view.setEnabled(true);
  for(let i=0;i<6;i++){await vi.advanceTimersByTimeAsync(200);view.schedule();}
  expect(load).toHaveBeenCalled();
 }finally{view.dispose();load.mockRestore();vi.unstubAllGlobals();vi.useRealTimers();}
});
