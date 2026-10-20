import type { TerrainMetadata } from '../types/terrain';
import { projectedToPixel } from './coordinate';
import { gridValue } from './elevationGrid';

type Point = {x:number;y:number};

/** Display height on the exporter's [NW,SW,NE] / [NE,SW,SE] triangles.
 * Bilinear interpolation is retained for measurements, but is a different surface. */
export function terrainSurfaceElevation(grid:Float32Array, metadata:TerrainMetadata, x:number, y:number): number | undefined {
  const p=projectedToPixel(metadata,x,y), [rows,cols]=metadata.grid.shape;
  if(rows<2 || cols<2 || p.column < -1e-7 || p.row < -1e-7 || p.column > cols-1+1e-7 || p.row > rows-1+1e-7) return undefined;
  const column=Math.max(0,Math.min(cols-1,p.column)), row=Math.max(0,Math.min(rows-1,p.row));
  const c=Math.min(cols-2,Math.floor(column)), r=Math.min(rows-2,Math.floor(row)), fx=column-c, fy=row-r;
  const values=[gridValue(grid,metadata,r,c),gridValue(grid,metadata,r,c+1),gridValue(grid,metadata,r+1,c),gridValue(grid,metadata,r+1,c+1)];
  // Masked exporters omit the whole cell if any corner is NoData.
  if(values.some(value=>value===undefined)) return undefined;
  const [nw,ne,sw,se]=values as number[];
  return fx+fy<=1 ? nw+(ne-nw)*fx+(sw-nw)*fy : se+(sw-se)*(1-fx)+(ne-se)*(1-fy);
}

/** Split a planimetric line at cell edges and triangle diagonals, preserving XY.
 * Midpoints expose missing cells even when both edge vertices are valid. */
export function terrainDrapePoints(points: Point[], frames: TerrainMetadata[]): Point[] {
  const result:Point[]=[];
  for(let i=1;i<points.length;i++){
    const a=points[i-1],b=points[i], cuts=new Set<number>([0,1]);
    const split=(start:number,end:number,min:number,max:number)=>{
      if(Math.abs(end-start)<1e-10)return;
      const lo=Math.max(min,Math.ceil(Math.min(start,end))),hi=Math.min(max,Math.floor(Math.max(start,end)));
      for(let k=lo;k<=hi;k++){const t=(k-start)/(end-start);if(t>1e-9 && t<1-1e-9)cuts.add(t);}
    };
    for(const frame of frames){
      const pa=projectedToPixel(frame,a.x,a.y),pb=projectedToPixel(frame,b.x,b.y),[rows,cols]=frame.grid.shape;
      split(pa.column,pb.column,0,cols-1);split(pa.row,pb.row,0,rows-1);
      split(pa.column+pa.row,pb.column+pb.row,0,cols+rows-2);
    }
    const ts=[...cuts].sort((x,y)=>x-y).filter((t,j,all)=>j===0||t-all[j-1]>1e-9);
    const at=(t:number)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
    if(i===1)result.push(at(0));
    for(let j=1;j<ts.length;j++){result.push(at((ts[j-1]+ts[j])/2),at(ts[j]));}
  }
  return result;
}
