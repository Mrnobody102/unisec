import {afterEach, expect, it, vi} from 'vitest';
import {setLocalMapSource, type LocalMapSource} from './localMapSource';
import {deferInternetDetail, detailMaxZoom, detailTileTemplate, internetDetailAvailable, parentImageryTiles, reconnectInternetDetail} from './imageryDetail';
const local:LocalMapSource={schemaVersion:1,imagery:{url:'/offline-map/imagery/{z}/{x}/{y}.webp',maxZoom:14,name:'Local Sentinel-2',credit:'Copernicus'},terrain:{url:'/offline-map/terrain/{z}/{x}/{y}.webp',maxZoom:14},elevation:{url:'/offline-map/elevation/{z}/{x}/{y}.png',tiles:[{z:11,x:1616,y:897}]},bounds:[103.7,21.4,104.6,22.1]};
afterEach(()=>{setLocalMapSource(null);reconnectInternetDetail();vi.unstubAllGlobals();vi.useRealTimers();});
it('uses the web source at overview and close scales while the renderer retains its local base',()=>{
 setLocalMapSource(local);vi.stubGlobal('navigator',{onLine:true});
 expect(detailTileTemplate(12)).toMatch(/^https:/);
 expect(detailTileTemplate(14)).toMatch(/^https:/);
 expect(detailTileTemplate(16)).toMatch(/^https:/);
 expect(detailMaxZoom()).toBe(18);
});
it('makes no Internet plan while disconnected and never requests nonexistent local detail tiles',()=>{
 setLocalMapSource(local);vi.stubGlobal('navigator',{onLine:false});
 expect(internetDetailAvailable()).toBe(false);
 expect(detailMaxZoom()).toBe(14);
 expect(detailTileTemplate(16)).toBeNull();
 expect(detailTileTemplate(14)).toBe(local.imagery.url);
});
it('backs off after an Internet failure while the complete local base stays usable',()=>{
 setLocalMapSource(local);vi.stubGlobal('navigator',{onLine:true});vi.useFakeTimers();
 deferInternetDetail();
 expect(detailMaxZoom()).toBe(14);
 expect(detailTileTemplate(15)).toBeNull();
 vi.advanceTimersByTime(30001);
 expect(detailMaxZoom()).toBe(18);
});
it('retains geographic alignment and deduplicates local parents for a finer detail window',()=>{
 expect(parentImageryTiles([{z:16,x:20,y:24},{z:16,x:21,y:25},{z:16,x:24,y:24}],14)).toEqual([{z:14,x:5,y:6},{z:14,x:6,y:6}]);
});
