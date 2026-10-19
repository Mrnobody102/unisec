import {expect,it} from 'vitest';
import proj4 from 'proj4';
import {focusTiles} from './focusImagery';
import {basemapFrame} from './basemapFrame';
import {pixelToProjected} from './coordinate';
import {tileLonLat} from './regionalBasemap';
import {validateMetadata} from './validation';
import first from '../../public/terrain/che_tao_v2_tex.terrain.json';
import second from '../../public/terrain/lao_chai_v2_tex.terrain.json';
const metadata=validateMetadata(first),other=validateMetadata(second);
it('covers a selected survey point with bounded detailed imagery requests',()=>{
 const [x,y]=proj4('EPSG:4326',metadata.crs.proj4!,[104.05,21.78]);
 const tiles=focusTiles(metadata,[{x,y}]);expect(tiles.length).toBeGreaterThan(0);expect(tiles.length).toBeLessThanOrEqual(48);
 expect(tiles[0].z).toBeGreaterThanOrEqual(16);
 expect(tiles.some(t=>{const a=tileLonLat(t.x,t.y,t.z),b=tileLonLat(t.x+1,t.y+1,t.z);return 104.05>=a[0]&&104.05<=b[0]&&21.78<=a[1]&&21.78>=b[1];})).toBe(true);
 expect(focusTiles(metadata,[{x:NaN,y}])).toEqual([]);expect(focusTiles(metadata,[{x,y},{x:x+15000,y}])).toEqual([]);
});
it('frames both existing DEMs without representing their bounding box as measured elevation',()=>{
 const combined=basemapFrame([metadata,other]);expect(combined.analysis_supported).toBe(false);
 const nw=pixelToProjected(combined,0,0),se=pixelToProjected(combined,combined.grid.shape[1]-1,combined.grid.shape[0]-1);
 for(const m of [metadata,other])for(const col of [0,m.grid.shape[1]-1])for(const row of [0,m.grid.shape[0]-1]){
  const p=pixelToProjected(m,col,row);expect(p.x).toBeGreaterThanOrEqual(nw.x);expect(p.x).toBeLessThanOrEqual(se.x);expect(p.y).toBeLessThanOrEqual(nw.y);expect(p.y).toBeGreaterThanOrEqual(se.y);
 }
});
