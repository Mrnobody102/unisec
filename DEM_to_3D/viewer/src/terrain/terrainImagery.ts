import * as THREE from 'three';
import proj4 from 'proj4';
import type { TerrainMetadata } from '../types/terrain';
import { sceneToProjected } from './coordinate';
import { planBasemapTiles, type MapTile } from './regionalBasemap';

export function imageryAtlasBounds(metadata: TerrainMetadata, maxZoom: number) {
  let tiles: MapTile[];
  try {tiles = planBasemapTiles(metadata, maxZoom);} catch {return null;}
  const zoom = Math.max(...tiles.map(tile => tile.z));
  const detail = tiles.filter(tile => tile.z === zoom);
  if (!detail.length) return null;
  return { zoom, minX:Math.min(...detail.map(tile => tile.x)), minY:Math.min(...detail.map(tile => tile.y)), maxX:Math.max(...detail.map(tile => tile.x))+1, maxY:Math.max(...detail.map(tile => tile.y))+1 };
}

/** Reuse fetched basemap tiles on the existing DEM mesh. Geometry and elevations stay unchanged. */
export function createTerrainImagery(metadata: TerrainMetadata, terrain: THREE.Group, meshes: THREE.Mesh[], maxZoom: number, anisotropy: number) {
  const atlas = imageryAtlasBounds(metadata, maxZoom);
  if (!atlas) return null;
  const canvas = document.createElement('canvas');
  const columns = atlas.maxX-atlas.minX, rows = atlas.maxY-atlas.minY;
  const scale = Math.min(1,4096/(columns*256),4096/(rows*256));
  canvas.width = Math.max(1,Math.round(columns*256*scale)); canvas.height = Math.max(1,Math.round(rows*256*scale));
  const context = canvas.getContext('2d');
  if (!context) return null;
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = anisotropy;
  const material = new THREE.MeshStandardMaterial({roughness:1,metalness:0,map:texture,transparent:true,alphaTest:.01,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2,side:THREE.DoubleSide});
  const group = new THREE.Group(); group.name = 'terrain-online-imagery';
  const toWgs84 = proj4(metadata.crs.proj4 || `${metadata.crs.authority}:${metadata.crs.code}`,'EPSG:4326');
  terrain.updateWorldMatrix(true,true);
  const inverse = terrain.matrixWorld.clone().invert();
  const point = new THREE.Vector3();
  for (const source of meshes) {
    const geometry = source.geometry.clone();
    const relative = inverse.clone().multiply(source.matrixWorld);
    const positions = geometry.getAttribute('position'), uv = new Float32Array(positions.count*2);
    for (let i=0;i<positions.count;i++) {
      point.fromBufferAttribute(positions,i).applyMatrix4(relative);
      const projected = sceneToProjected(metadata,point).projected;
      const [lon,lat] = toWgs84.forward([projected.x,projected.y]);
      const n = 2**atlas.zoom, latitude = THREE.MathUtils.degToRad(THREE.MathUtils.clamp(lat,-85.05112878,85.05112878));
      const x = (lon+180)/360*n, y = (1-Math.asinh(Math.tan(latitude))/Math.PI)/2*n;
      uv[i*2]=(x-atlas.minX)/columns; uv[i*2+1]=1-(y-atlas.minY)/rows;
    }
    geometry.setAttribute('uv',new THREE.BufferAttribute(uv,2));
    const mesh = new THREE.Mesh(geometry,material); mesh.matrix.copy(relative);mesh.matrixAutoUpdate=false;mesh.renderOrder=3;group.add(mesh);
  }
  terrain.add(group);
  group.visible = false;
  let disposed = false;
  return {
    group,
    setVisible: (visible: boolean) => {group.visible=visible;},
    tile: (tile: MapTile, bitmap: ImageBitmap) => {
      if (disposed || tile.z!==atlas.zoom || tile.x<atlas.minX || tile.x>=atlas.maxX || tile.y<atlas.minY || tile.y>=atlas.maxY) return;
      const width=canvas.width/columns,height=canvas.height/rows;
      // Regional textures are decoded with flipY. Undo it when composing the canvas atlas.
      context.save();context.translate((tile.x-atlas.minX)*width,(tile.y-atlas.minY+1)*height);context.scale(1,-1);context.drawImage(bitmap,0,0,width,height);context.restore();
      texture.needsUpdate=true;
    },
    dispose: () => {disposed=true;group.removeFromParent();group.children.forEach(child=>(child as THREE.Mesh).geometry.dispose());material.dispose();texture.dispose();canvas.width=canvas.height=1;}
  };
}
