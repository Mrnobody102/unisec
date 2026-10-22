import {localMapSource} from './localMapSource';
import {imagerySource, internetImagerySource} from './imagerySource';
import type {MapTile} from '../../terrain/regionalBasemap';
let retryAfter = 0;
export const internetDetailAvailable = () => !!localMapSource() && typeof navigator !== 'undefined' && navigator.onLine !== false && Date.now() >= retryAfter;
export const deferInternetDetail = () => {retryAfter = Date.now() + 30000;};
export const detailMaxZoom = () => internetDetailAvailable() ? internetImagerySource.maxNativeZoom : imagerySource.maxNativeZoom;
export const detailTileTemplate = (zoom: number): string | null => {
  const local=localMapSource();
  if(local && zoom>local.imagery.maxZoom)return internetDetailAvailable()?internetImagerySource.url:null;
  return imagerySource.url;
};
export const reconnectInternetDetail = () => {retryAfter = 0;};
export function parentImageryTiles(tiles: MapTile[], maxZoom: number): MapTile[] {
  const parents = new Map<string,MapTile>();
  tiles.forEach(tile => {
    const zoom=Math.min(tile.z,maxZoom),scale=2**(tile.z-zoom);
    const parent={z:zoom,x:Math.floor(tile.x/scale),y:Math.floor(tile.y/scale)};
    parents.set(`${parent.z}/${parent.x}/${parent.y}`,parent);
  });
  return [...parents.values()];
}
