import { describe,expect,it } from 'vitest';
import type { TerrainMetadata } from '../types/terrain';
import { terrainDrapePoints,terrainSurfaceElevation } from './terrainSurface';
const metadata={grid:{shape:[2,2]},grid_transform:{a:1,b:0,c:-.5,d:0,e:1,f:-.5}} as TerrainMetadata;
describe('terrain display surface',()=>{
  it('matches the actual mesh diagonal instead of floating above a saddle',()=>{
    const grid=new Float32Array([0,0,0,100]);
    expect(terrainSurfaceElevation(grid,metadata,.5,.5)).toBe(0);
    expect(terrainSurfaceElevation(grid,metadata,.75,.75)).toBe(50);
    expect(terrainSurfaceElevation(grid,metadata,1,1)).toBe(100);
  });
  it('keeps holes and never extends the mesh beyond its outer vertices',()=>{
    expect(terrainSurfaceElevation(new Float32Array([0,0,0,NaN]),metadata,.1,.1)).toBeUndefined();
    expect(terrainSurfaceElevation(new Float32Array([0,0,0,100]),metadata,-.1,0)).toBeUndefined();
  });
  it('splits at the triangle ridge without changing the road planimetry',()=>{
    const points=terrainDrapePoints([{x:0,y:.5},{x:1,y:.5}],[metadata]);
    expect(points).toContainEqual({x:.5,y:.5});
    expect(points.every(p=>p.y===.5)).toBe(true);
    expect(points[0]).toEqual({x:0,y:.5});expect(points.at(-1)).toEqual({x:1,y:.5});
  });
});
