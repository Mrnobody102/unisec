import * as THREE from 'three';
import { MeshBVH } from 'three-mesh-bvh';
import proj4 from 'proj4';
import { loadImageryAtlas, type ImageryDetailAtlas } from './imageryAtlas';
import type { TerrainMetadata } from '../types/terrain';
import type { MapTile } from './regionalBasemap';

const faces = [[0,1,3,2],[4,6,7,5],[0,4,5,1],[2,3,7,6],[0,2,6,4],[1,5,7,3]];

/** Conservative visible surface bounds, including tilted views and terrain at different heights. */
export function visibleImageryPoints(metadata: TerrainMetadata, reference: THREE.Matrix4, camera: THREE.Camera, meshes: THREE.Mesh[]): Array<{x:number;y:number}> {
  camera.updateMatrixWorld();
  const toReference = reference.clone().invert();
  const view = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  const visible = new THREE.Box3();
  for (const mesh of meshes) {
    mesh.updateWorldMatrix(true, false);
    if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
    const box = mesh.geometry.boundingBox;
    if (!box || box.isEmpty() || mesh.geometry.index?.count===0) continue;
    const projection = view.clone().multiply(mesh.matrixWorld);
    const frustum = new THREE.Frustum().setFromProjectionMatrix(projection);
    if (!frustum.intersectsBox(box)) continue;
    const transform = toReference.clone().multiply(mesh.matrixWorld);
    const append=(polygon:THREE.Vector3[])=>{
      for (const plane of frustum.planes) {
        const next:THREE.Vector3[]=[];
        for(let i=0;i<polygon.length;i++){
          const a=polygon[i],b=polygon[(i+1)%polygon.length],da=plane.distanceToPoint(a),db=plane.distanceToPoint(b);
          if(da>=0)next.push(a);
          if((da>=0)!==(db>=0))next.push(a.clone().lerp(b,da/(da-db)));
        }
        polygon=next;if(!polygon.length)break;
      }
      polygon.forEach(point=>visible.expandByPoint(point.clone().applyMatrix4(transform)));
    };
    // Surface BVH leaves have tight height ranges. A model-wide box includes
    // empty air above valleys and would select a much coarser image than needed.
    const tree=mesh.geometry.boundsTree??(mesh.geometry.boundsTree=new MeshBVH(mesh.geometry));
    tree.shapecast({
      intersectsBounds:(bounds,isLeaf)=>{
        if(!frustum.intersectsBox(bounds))return false;
        const corners=[bounds.min.x,bounds.max.x].flatMap(x=>[bounds.min.y,bounds.max.y].flatMap(y=>[bounds.min.z,bounds.max.z].map(z=>new THREE.Vector3(x,y,z))));
        if(corners.every(p=>frustum.containsPoint(p))){corners.forEach(p=>visible.expandByPoint(p.applyMatrix4(transform)));return false;}
        if(isLeaf){faces.forEach(face=>append(face.map(i=>corners[i])));return false;}
        return true;
      },
      intersectsTriangle:triangle=>{append([triangle.a,triangle.b,triangle.c]);return false;}
    });
  }
  if(visible.isEmpty())return [];
  const result=[visible.min,visible.max].map(point=>({x:metadata.world_origin.x+point.x,y:metadata.world_origin.y-point.z}));
  return result;
}

/** One complete image window, with an extra tile outside the view to keep its edge off screen. */
export function viewImageryTiles(metadata: TerrainMetadata, points: Array<{x:number;y:number}>, maxZoom: number, budget=256, maxAxis=32): MapTile[] {
  const valid=points.filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y));
  if (!valid.length) return [];
  const convert=proj4(metadata.crs.proj4 || `${metadata.crs.authority}:${metadata.crs.code}`,'EPSG:4326');
  const corners=[Math.min(...valid.map(p=>p.x)),Math.max(...valid.map(p=>p.x))].flatMap(x=>[Math.min(...valid.map(p=>p.y)),Math.max(...valid.map(p=>p.y))].map(y=>convert.forward([x,y])));
  for (let z=Math.min(19,maxZoom);z>=0;z--) {
    const n=2**z;
    const xy=corners.map(([lon,lat])=>[(lon+180)/360*n,(1-Math.asinh(Math.tan(THREE.MathUtils.degToRad(THREE.MathUtils.clamp(lat,-85.0511,85.0511))))/Math.PI)/2*n]);
    const west=Math.max(0,Math.floor(Math.min(...xy.map(p=>p[0])))-1),east=Math.min(n-1,Math.floor(Math.max(...xy.map(p=>p[0])))+1);
    const north=Math.max(0,Math.floor(Math.min(...xy.map(p=>p[1])))-1),south=Math.min(n-1,Math.floor(Math.max(...xy.map(p=>p[1])))+1);
    if ((east-west+1)*(south-north+1)>budget || east-west+1>maxAxis || south-north+1>maxAxis) continue;
    const tiles:MapTile[]=[];
    for(let x=west;x<=east;x++)for(let y=north;y<=south;y++)tiles.push({x,y,z});
    return tiles;
  }
  return [];
}


/** One request/atlas shared by native DEMs and context; only completed windows are published. */
export function createViewImagery(plan: () => MapTile[], anisotropy: number, publish: (atlas: ImageryDetailAtlas | null) => void, invalidate: () => void) {
  const status = document.createElement('span'); status.className='terrain-detail-status';
  status.setAttribute('role','status'); status.hidden=true;
  let enabled=false, disposed=false, timer:ReturnType<typeof setTimeout>|undefined;
  let controller:AbortController|null=null, atlas:ImageryDetailAtlas|null=null, loadedKey='', loadingKey='';
  const cache=new Map<string,Blob>();
  const keyOf=(tiles:MapTile[])=>tiles.map(t=>`${t.z}/${t.x}/${t.y}`).join(',');
  let scheduledAt:number|null=null;
  const cancel = () => {clearTimeout(timer);scheduledAt=null;controller?.abort();controller=null;loadingKey='';status.hidden=true;};
  const request = async () => {
    if (!enabled || disposed) return;
    const tiles=plan();
    if (!tiles.length) return;
    const key=keyOf(tiles);
    if (key===loadedKey || key===loadingKey) return;
    controller?.abort(); const run=new AbortController();controller=run;loadingKey=key;
    const timeout=setTimeout(()=>run.abort(),45000);
    status.textContent=document.documentElement.lang==='en'?'Loading imagery…':'Đang tải ảnh…';status.hidden=false;
    const apply=(next:ImageryDetailAtlas|null,nextKey:string)=>{
      if(!next)return;
      if(disposed || run.signal.aborted || controller!==run){next.dispose();return;}
      publish(next);atlas?.dispose();atlas=next;loadedKey=nextKey;invalidate();
    };
    try {
      // A full-view intermediate image arrives first; refinement never leaves
      // a sharp island surrounded by the prepared low-resolution image.
      if(tiles.length>80 && tiles[0].z>0){
        const parents=new Map<string,MapTile>();
        tiles.forEach(t=>{const p={z:t.z-1,x:Math.floor(t.x/2),y:Math.floor(t.y/2)};parents.set(`${p.x}/${p.y}`,p);});
        const coarse=[...parents.values()],coarseKey=keyOf(coarse);
        if(coarseKey!==loadedKey)apply(await loadImageryAtlas(coarse,run.signal,anisotropy,cache),coarseKey);
      }
      run.signal.throwIfAborted();
      apply(await loadImageryAtlas(tiles,run.signal,anisotropy,cache),key);
    } catch {run.abort();} // Retain the last complete image while a moved view loads or fails.
    finally {clearTimeout(timeout);if(controller===run){controller=null;loadingKey='';status.hidden=true;}}
  };
  const schedule=()=>{
    if(!enabled||disposed)return;
    const now=performance.now();scheduledAt??=now;clearTimeout(timer);
    // Debounce short gestures, but keep refining during a continuous orbit/drag.
    const delay=Math.min(250,Math.max(0,1000-(now-scheduledAt)));
    timer=setTimeout(()=>{scheduledAt=null;void request();},delay);
  };
  return {status,schedule,setEnabled(value:boolean){if(enabled===value)return;enabled=value;if(!enabled)cancel();else schedule();},
    retry:schedule,dispose(){disposed=true;cancel();publish(null);atlas?.dispose();cache.clear();status.remove();}};
}
