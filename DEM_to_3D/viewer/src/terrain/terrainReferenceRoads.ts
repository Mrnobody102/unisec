import * as THREE from 'three';
import proj4 from 'proj4';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import type { GeometryRecord } from '../geo/vector/types';
import type { TerrainMetadata } from '../types/terrain';
import { bilinearElevation } from './elevationGrid';
import { projectedToScene } from './coordinate';

type Surface = {model:{metadata?:TerrainMetadata|null;grid?:Float32Array|null};group:THREE.Object3D};
/** Display-only drape. Preserve the OSM planimetry and break at missing heights.
 * Context elevation is never passed into the profile or routing analysis.
 */
export function terrainReferenceRoads(records:GeometryRecord[], surfaces:Surface[], selectedId:string|null,
  resolution:{width:number;height:number}, contextPoint?: (x:number,y:number)=>THREE.Vector3|undefined):THREE.Group {
  const group = new THREE.Group(); group.name = 'reference-roads';
  const first = surfaces.find(surface => surface.model.metadata)?.model.metadata;
  if (!first) return group;
  const crs = first.crs.proj4 || `${first.crs.authority}:${first.crs.code}`;
  const surfacePoint = (x:number,y:number) => {
    for (const surface of surfaces) {
      const {metadata,grid} = surface.model; if (!metadata || !grid) continue;
      const elevation = bilinearElevation(grid,metadata,x,y).elevation;
      if (elevation === undefined) continue;
      const p = projectedToScene(metadata,{x,y},elevation+3);
      return new THREE.Vector3(p.x,p.y,p.z).applyMatrix4(surface.group.matrixWorld);
    }
    return contextPoint?.(x,y);
  };
  for (const record of records) {
    if (!record.visible || record.feature.properties.referenceKind !== 'road-corridor' || record.feature.geometry.type !== 'LineString') continue;
    const selected = record.id === selectedId;
    let positions:number[] = [];
    const flush = () => {
      if (positions.length >= 6) for (const [color,width] of [['#343c36',selected?5:4],['#eee5cf',selected?3:2]] as const) {
        const geometry = new LineGeometry(); geometry.setPositions(positions);
        const material = new LineMaterial({color,linewidth:width,depthWrite:false,depthTest:true});
        material.resolution.set(resolution.width,resolution.height);
        const line = new Line2(geometry,material);line.userData.recordId=record.id;line.renderOrder=color==='#343c36'?6:7;group.add(line);
      }
      positions=[];
    };
    const xy = record.feature.geometry.coordinates.map(p=>proj4('EPSG:4326',crs,p.slice(0,2)));
    for (let i=1;i<xy.length;i++) {
      const a=xy[i-1],b=xy[i],steps=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/30));
      for(let j=i===1?0:1;j<=steps;j++) {
        const point=surfacePoint(a[0]+(b[0]-a[0])*j/steps,a[1]+(b[1]-a[1])*j/steps);
        if(point)positions.push(point.x,point.y,point.z);else flush();
      }
    }
    flush();
  }
  return group;
}
