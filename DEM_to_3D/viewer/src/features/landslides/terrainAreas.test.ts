import { describe, expect, it } from 'vitest';
import proj4 from 'proj4';
import * as THREE from 'three';
import type { TerrainMetadata } from '../../types/terrain';
import type { RoadSegment } from '../../types/dear';
import { createLandslideArea, landslideAreaKey, newLandslideArea } from './landslideAreas';
import { disposeTerrainAreas, terrainLandslideAreas } from './terrainAreas';

const metadata = {
  crs: { authority: 'EPSG', code: 3857 },
  grid: { shape: [21, 21] },
  grid_transform: { a: 20, b: 0, c: -10, d: 0, e: 20, f: -10 },
  world_origin: { x: 0, y: 0 },
  elevation: { base_elevation: 0, exaggeration: 1 }
} as TerrainMetadata;
const ring = (points: number[][]) => points.map(p => proj4('EPSG:3857', 'EPSG:4326', p));
const outer = [[40,40],[360,40],[360,360],[40,360],[40,40]];
const area = () => createLandslideArea({ type: 'Polygon', coordinates: [ring(outer)] }, 'potential', 'Slope A', 'network-a');
const render = (record = area(), grid = new Float32Array(441).fill(50), roads: RoadSegment[] = [], network = 'network-a') => terrainLandslideAreas([record], metadata, grid, roads, record.id, { width: 800, height: 600 }, network);
const meshes = (group: THREE.Group) => group.children.filter((c): c is THREE.Mesh<THREE.BufferGeometry> => c.type === 'Mesh');

describe('landslide extent terrain display', () => {
  it('leaves a missing DEM empty instead of inventing an elevation', () => {
    const group = render(area(), new Float32Array(441).fill(NaN));
    expect(group.children).toHaveLength(0);
    disposeTerrainAreas(group);
  });
  it('retains polygon holes and drapes using the actual terrain CRS', () => {
    const record = area();
    record.feature.geometry = { type: 'Polygon', coordinates: [ring(outer), ring([[160,160],[160,240],[240,240],[240,160],[160,160]])] };
    const group = render(record);
    expect(meshes(group)).toHaveLength(1);
    const positions = meshes(group)[0].geometry.getAttribute('position');
    for (let i = 0; i < positions.count; i += 3) {
      const x = (positions.getX(i) + positions.getX(i+1) + positions.getX(i+2)) / 3;
      const y = -(positions.getZ(i) + positions.getZ(i+1) + positions.getZ(i+2)) / 3;
      expect(x > 160.01 && x < 239.99 && y > 160.01 && y < 239.99).toBe(false);
      expect(positions.getY(i)).toBeCloseTo(53);
    }
    disposeTerrainAreas(group);
  });
  it('does not highlight a matching road ID from a different network', () => {
    const record = area();
    record.feature.properties[landslideAreaKey] = { ...newLandslideArea('potential','network-a'), roadLinks:[{roadId:'E1',relation:'threatens'}] };
    const roads = [{id:'E1',points:[{x:50,y:50},{x:100,y:100}]}] as RoadSegment[];
    const matched = render(record, undefined, roads), stale = render(record, undefined, roads, 'network-b');
    expect(matched.children.length).toBe(stale.children.length + 1);
    disposeTerrainAreas(matched); disposeTerrainAreas(stale);
  });
});
