import {describe,expect,it} from 'vitest';
import * as THREE from 'three';
import {terrainCoverage} from './terrainCoverage';
import {pixelToProjected} from './coordinate';
import metadata from '../../public/terrain/che_tao_v2_tex.terrain.json';
import {validateMetadata} from './validation';

describe('regional terrain clipping',()=>{
  const validated=validateMetadata(metadata);
  const m={...validated,grid:{...validated.grid,shape:[3,4] as [number,number]}};
  it('matches actual finite four-corner DEM cells, leaving NoData exposed',()=>{
    const grid=new Float32Array(12).fill(1000);grid[0]=NaN;grid[11]=NaN;
    const result=terrainCoverage({metadata:m,grid},m.world_origin);
    expect([...result.data]).toEqual([0,255,255,255,255,0]);
    expect(grid[5]).toBe(1000);
  });
  it('uses the source affine transform and pixel centres, including rotated grids',()=>{
    for(const frame of [m,{...m,grid_transform:{...m.grid_transform,b:3,d:5}}]){
      const mask=terrainCoverage({metadata:frame,grid:new Float32Array(12).fill(200)},m.world_origin);
      for(const [col,row] of [[.3,.6],[2.4,1.7]]) {
        const p=pixelToProjected(frame,col,row);
        const cell=new THREE.Vector3(p.x-m.world_origin.x,p.y-m.world_origin.y,1).applyMatrix3(mask.matrix);
        expect(cell.x).toBeCloseTo(col,8);expect(cell.y).toBeCloseTo(row,8);
      }
    }
  });
});
