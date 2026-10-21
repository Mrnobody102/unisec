import * as THREE from 'three';
import proj4 from 'proj4';
import type { TerrainMetadata } from '../types/terrain';
import type { ElevationSurface } from './regionalElevation';
import type { MapTile } from './regionalBasemap';
import { pixelToProjected } from './coordinate';
import { terrainCoverage } from './terrainCoverage';
import { terrainSurfaceElevation } from './terrainSurface';

type Vertex = { x:number; y:number; elevation:number };
export type TerrainEdge = readonly [Vertex,Vertex];

/** Exact exposed edges of the exported four-corner cells, not an administrative
 * polygon. Shared edges between valid cells or neighbouring DEMs need no seam. */
export function terrainBoundaryEdges(surfaces:ElevationSurface[]):TerrainEdge[] {
  const result:TerrainEdge[]=[];
  const sides=[[0,-1,0,0,1,0],[1,0,1,0,1,1],[0,1,1,1,0,1],[-1,0,0,1,0,0]] as const;
  for(const surface of surfaces){
    const {metadata,grid}=surface, mask=terrainCoverage(surface,metadata.world_origin), cols=metadata.grid.shape[1];
    const valid=(c:number,r:number)=>c>=0&&r>=0&&c<mask.width&&r<mask.height&&mask.data[r*mask.width+c]>0;
    const vertex=(c:number,r:number):Vertex=>({...pixelToProjected(metadata,c,r),elevation:grid[r*cols+c]});
    for(let r=0;r<mask.height;r++)for(let c=0;c<mask.width;c++){
      if(!valid(c,r))continue;
      for(const [dc,dr,ac,ar,bc,br] of sides){
        if(valid(c+dc,r+dr))continue;
        const v=vertex(c+ac,r+ar),w=vertex(c+bc,r+br), outside=pixelToProjected(metadata,c+.5+dc*.501,r+.5+dr*.501);
        if(surfaces.some(other=>other!==surface&&terrainSurfaceElevation(other.grid,other.metadata,outside.x,outside.y)!==undefined))continue;
        result.push([v,w]);
      }
    }
  }
  return result;
}

/** Close only the vertical crack between a DEM edge and the actual regional
 * triangle underneath. This display skirt does not change DEM heights, extend
 * analysis coverage or bridge missing regional data. UVs retain their XY position. */
export function closeTerrainSeams(geometry:THREE.BufferGeometry,metadata:TerrainMetadata,tile:MapTile,steps:number,edges:readonly TerrainEdge[]){
  const pos=geometry.getAttribute('position'),uv=geometry.getAttribute('uv');
  const convert=proj4(metadata.crs.proj4||`${metadata.crs.authority}:${metadata.crs.code}`,'EPSG:4326'),n=2**tile.z;
  const tileUv=(p:Vertex)=>{const [lon,lat]=convert.forward([p.x,p.y]);return new THREE.Vector2((lon+180)/360*n-tile.x,(1-Math.asinh(Math.tan(lat*Math.PI/180))/Math.PI)/2*n-tile.y);};
  const minX=Math.min(...[0,steps,steps*(steps+1),(steps+1)**2-1].map(i=>pos.getX(i)))+metadata.world_origin.x;
  const maxX=Math.max(...[0,steps,steps*(steps+1),(steps+1)**2-1].map(i=>pos.getX(i)))+metadata.world_origin.x;
  const minY=metadata.world_origin.y-Math.max(...[0,steps,steps*(steps+1),(steps+1)**2-1].map(i=>pos.getZ(i)));
  const maxY=metadata.world_origin.y-Math.min(...[0,steps,steps*(steps+1),(steps+1)**2-1].map(i=>pos.getZ(i)));
  const candidates=edges.filter(([a,b])=>Math.max(a.x,b.x)>=minX&&Math.min(a.x,b.x)<=maxX&&Math.max(a.y,b.y)>=minY&&Math.min(a.y,b.y)<=maxY);
  if(!candidates.length){geometry.setAttribute('terrainSeam',new THREE.Float32BufferAttribute(new Float32Array(pos.count),1));return;}
  const positions=Array.from(pos.array),uvs=Array.from(uv.array),indices=Array.from(geometry.index!.array),seams=new Array(pos.count).fill(0);
  // Regional faces without data were omitted. Do not create a skirt to their placeholders.
  const faces=new Set<number>();for(let i=0;i<indices.length;i+=3)faces.add(indices[i]*2+(indices[i+1]-indices[i]===steps+1?0:1));
  const bottom=(u:number,v:number)=>{
    const x=THREE.MathUtils.clamp(u*steps,0,steps),y=THREE.MathUtils.clamp(v*steps,0,steps),c=Math.min(steps-1,Math.floor(x)),r=Math.min(steps-1,Math.floor(y)),fx=x-c,fy=y-r;
    const a=r*(steps+1)+c,b=a+1,d=a+steps+1,e=d+1;
    if(fx+fy<=1)return faces.has(a*2)?pos.getY(a)*(1-fx-fy)+pos.getY(b)*fx+pos.getY(d)*fy:undefined;
    return faces.has(b*2+1)?pos.getY(e)*(fx+fy-1)+pos.getY(b)*(1-fy)+pos.getY(d)*(1-fx):undefined;
  };
  for(const [a,b] of candidates){
    const av=tileUv(a),bv=tileUv(b);let lo=0,hi=1;
    for(const axis of ['x','y'] as const){
      const d=bv[axis]-av[axis];if(Math.abs(d)<1e-12){if(av[axis]<0||av[axis]>1){hi=-1;break;}}else{const t0=-av[axis]/d,t1=(1-av[axis])/d;lo=Math.max(lo,Math.min(t0,t1));hi=Math.min(hi,Math.max(t0,t1));}
    }
    if(hi-lo<1e-9)continue;
    // A boundary edge can cross several regional triangles. Split at their
    // grid lines and diagonals so the lower edge follows that mesh exactly.
    const cuts=new Set<number>([lo,hi]);
    for(const [start,end] of [[av.x*steps,bv.x*steps],[av.y*steps,bv.y*steps],[(av.x+av.y)*steps,(bv.x+bv.y)*steps]]){
      const delta=end-start;if(Math.abs(delta)<1e-12)continue;
      const first=Math.ceil(start+delta*(delta>0?lo:hi)),last=Math.floor(start+delta*(delta>0?hi:lo));
      for(let k=first;k<=last;k++){const t=(k-start)/delta;if(t>lo+1e-9&&t<hi-1e-9)cuts.add(t);}
    }
    const ts=[...cuts].sort((a,b)=>a-b);
    for(let i=1;i<ts.length;i++){
      const values=[ts[i-1],ts[i]].map(t=>{
        const q=av.clone().lerp(bv,t),height=bottom(q.x,q.y);
        if(height===undefined)return null;
        return {x:a.x+(b.x-a.x)*t-metadata.world_origin.x,z:metadata.world_origin.y-a.y-(b.y-a.y)*t,top:(a.elevation+(b.elevation-a.elevation)*t-metadata.elevation.base_elevation)*metadata.elevation.exaggeration,bottom:height,uv:q};
      });
      if(values.some(v=>!v))continue;
      const start=positions.length/3;
      for(const v of values){for(const height of [v!.top,v!.bottom]){positions.push(v!.x,height,v!.z);uvs.push(v!.uv.x,1-v!.uv.y);seams.push(1);}}
      indices.push(start,start+1,start+2,start+2,start+1,start+3);
    }
  }
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  geometry.setAttribute('terrainSeam',new THREE.Float32BufferAttribute(seams,1));geometry.setIndex(indices);
}
