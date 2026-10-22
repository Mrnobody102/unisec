import {afterEach,expect,it} from 'vitest';
import {setLocalMapSource,validateLocalMapSource} from './localMapSource';
import {imagerySource,terrainTileSource} from './imagerySource';
const fixture={schemaVersion:1,imagery:{url:'/offline-map/imagery/{z}/{x}/{y}.webp',maxZoom:14,name:'Local Sentinel-2',credit:'Copernicus'},terrain:{url:'/offline-map/terrain/{z}/{x}/{y}.webp',maxZoom:14},elevation:{url:'/offline-map/elevation/{z}/{x}/{y}.png',tiles:[{z:11,x:1616,y:897}]},bounds:[103.7,21.4,104.6,22.1]};
afterEach(()=>setLocalMapSource(null));
it('uses one local source for all renderers and restores the configured source on dataset change',()=>{
  const original=imagerySource.url;
  setLocalMapSource(validateLocalMapSource(fixture));
  expect(imagerySource.url).toBe(fixture.imagery.url);expect(imagerySource.maxNativeZoom).toBe(14);
  expect(terrainTileSource().url).toBe(fixture.terrain.url);expect(imagerySource.credit).toBe('Copernicus');
  setLocalMapSource(null);expect(imagerySource.url).toBe(original);
});
it.each(['https://external.test/{z}/{x}/{y}','/offline-map/../outside','//outside.test/a'])('rejects an unsafe local tile template %s',url=>{
  expect(()=>validateLocalMapSource({...fixture,imagery:{...fixture.imagery,url}})).toThrow('local map');
});
it('rejects unknown or mixed elevation tile levels',()=>{
 expect(()=>validateLocalMapSource({...fixture,elevation:{...fixture.elevation,tiles:[{z:11,x:1616,y:897},{z:12,x:1,y:1}]}})).toThrow();
});

it('rejects missing tile coordinates, impossible bounds and duplicate relief tiles',()=>{
  expect(()=>validateLocalMapSource({...fixture,imagery:{...fixture.imagery,url:'/offline-map/imagery.webp'}})).toThrow();
  expect(()=>validateLocalMapSource({...fixture,bounds:[103,21,190,22]})).toThrow();
  expect(()=>validateLocalMapSource({...fixture,elevation:{...fixture.elevation,tiles:[fixture.elevation.tiles[0],fixture.elevation.tiles[0]]}})).toThrow();
});
