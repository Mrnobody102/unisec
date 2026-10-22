import {detailTileTemplate, deferInternetDetail} from '../features/map/imageryDetail';
import {noteInternetDetail} from '../features/map/imagerySource';
import * as THREE from 'three';
import type { MapTile } from './regionalBasemap';

/** Publish only a complete patch. A failure never replaces the retained base imagery. */
export async function loadImageryAtlas(tiles: MapTile[], signal: AbortSignal, anisotropy: number, cache?: Map<string, Blob>, sourceTemplate?: string):Promise<ImageryDetailAtlas|null> {
  if (!tiles.length) return null;
  const zoom = tiles[0].z, template=sourceTemplate ?? detailTileTemplate(zoom);
  if(!template)return null;
  const minX = Math.min(...tiles.map(tile => tile.x)), minY = Math.min(...tiles.map(tile => tile.y));
  const maxX = Math.max(...tiles.map(tile => tile.x)) + 1, maxY = Math.max(...tiles.map(tile => tile.y)) + 1;
  const canvas = document.createElement('canvas');
  canvas.width = (maxX - minX) * 256;
  canvas.height = (maxY - minY) * 256;
  const context = canvas.getContext('2d');
  if (!context) return null;
  let cursor = 0;
  const worker = async () => {
    while (cursor < tiles.length) {
      signal.throwIfAborted();
      const tile = tiles[cursor++];
      const url = template.replaceAll('{z}', String(tile.z)).replaceAll('{x}', String(tile.x)).replaceAll('{y}', String(tile.y));
      let blob = cache?.get(url);
      if (!blob) {
        const response = await fetch(url, {signal});
        if (!response.ok) throw new Error('Detail imagery unavailable');
        blob = await response.blob();
        if(cache){
          cache.set(url,blob);
          let bytes=[...cache.values()].reduce((sum,item)=>sum+item.size,0);
          while(cache.size>512 || bytes>24*1024*1024){const key=cache.keys().next().value!;bytes-=cache.get(key)!.size;cache.delete(key);}
        }
      }
      const bitmap = await createImageBitmap(blob);
      try {
        signal.throwIfAborted();
        context.drawImage(bitmap, (tile.x - minX) * 256, (tile.y - minY) * 256, 256, 256);
      } finally {
        bitmap.close();
      }
    }
  };
  try {await Promise.all(Array.from({length: 6}, worker));}
  catch(error){if(!signal.aborted && template.startsWith('https:')) deferInternetDetail();throw error;}
  if(template.startsWith('https:'))noteInternetDetail();
  signal.throwIfAborted();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = anisotropy;
  return {zoom, minX, minY, maxX, maxY, texture, source:template.startsWith('https:')?'online':'local', dispose: () => {
    texture.dispose();
    canvas.width = canvas.height = 1;
  }};
}

export type ImageryDetailAtlas = {
  zoom:number;minX:number;minY:number;maxX:number;maxY:number;texture:THREE.CanvasTexture;
  source?:'local'|'online';dispose:()=>void;
};
