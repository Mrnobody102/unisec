import {describe,expect,it} from 'vitest';
import * as THREE from 'three';
import proj4 from 'proj4';
import {terrainBoundaryEdges,closeTerrainSeams} from './terrainSeams';
import {validateMetadata} from './validation';
import metadataJson from '../../public/terrain/che_tao_v2_tex.terrain.json';
import {tileGeometry,tileLonLat} from './regionalBasemap';

const original=validateMetadata(metadataJson), tile={x:1615,y:897,z:11};
const centre=proj4('EPSG:4326',original.crs.proj4!,tileLonLat(tile.x+.5,tile.y+.5,tile.z));
const metadata={...original,grid:{...original.grid,shape:[3,3] as [number,number]},grid_transform:{...original.grid_transform,a:30,b:0,c:centre[0]-45,d:0,e:-30,f:centre[1]+45}};

describe('DEM/context display seam',()=>{
  it('extracts actual exterior cell edges and never includes internal valid edges',()=>{
    const grid=new Float32Array(9).fill(1000),surface={metadata,grid};
    expect(terrainBoundaryEdges([surface])).toHaveLength(8);
    grid[0]=NaN;
    const edges=terrainBoundaryEdges([surface]);expect(edges).toHaveLength(8);
    for(const edge of edges)for(const point of edge)expect(Number.isFinite(point.elevation)).toBe(true);
    expect(Number.isNaN(grid[0])).toBe(true);
  });
  it('connects the unchanged DEM boundary heights to regional triangles, with geographic UVs',()=>{
    const grid=new Float32Array(9).fill(1000),edges=terrainBoundaryEdges([{metadata,grid}]);
    const geometry=tileGeometry(metadata,tile,()=>920),count=geometry.getAttribute('position').count;
    closeTerrainSeams(geometry,metadata,tile,128,edges);
    const pos=geometry.getAttribute('position'),seam=geometry.getAttribute('terrainSeam');
    expect(pos.count).toBeGreaterThan(count);
    for(let i=count;i<pos.count;i+=4){
      expect(pos.getX(i)).toBe(pos.getX(i+1));expect(pos.getZ(i)).toBe(pos.getZ(i+1));
      expect(pos.getY(i)).toBeCloseTo((1000-metadata.elevation.base_elevation)*1.5,3);
      expect(pos.getY(i+1)).toBeCloseTo((920-metadata.elevation.base_elevation)*1.5,3);
      expect(seam.getX(i)).toBe(1);
    }
    expect([...grid]).toEqual(new Array(9).fill(1000));geometry.dispose();
  });
  it('does not extend a seam into missing regional elevation data',()=>{
    const grid=new Float32Array(9).fill(1000),edges=terrainBoundaryEdges([{metadata,grid}]);
    const geometry=tileGeometry(metadata,tile,()=>undefined),count=geometry.getAttribute('position').count;
    closeTerrainSeams(geometry,metadata,tile,128,edges);
    expect(geometry.getAttribute('position').count).toBe(count);expect(geometry.index?.count).toBe(0);geometry.dispose();
  });
  it('omits an edge when a neighbouring DEM covers its exterior',()=>{
    const a={metadata,grid:new Float32Array(9).fill(1000)};
    const b={metadata:{...metadata,grid_transform:{...metadata.grid_transform,c:metadata.grid_transform.c+60}},grid:new Float32Array(9).fill(1000)};
    expect(terrainBoundaryEdges([a,b])).toHaveLength(12);
    expect(terrainBoundaryEdges([a])).toHaveLength(8);
  });
});
