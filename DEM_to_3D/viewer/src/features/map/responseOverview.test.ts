import { describe, expect, it } from 'vitest';
import { responseOverviewPoints } from './responseOverview';
import { createLandslideArea } from '../landslides/landslideAreas';
import type { MapScene } from './mapContracts';
import type { TerrainMetadata } from '../../types/terrain';

const metadata = {crs:{authority:'EPSG',code:4326}} as TerrainMetadata;
const area = createLandslideArea({type:'Polygon',coordinates:[[[104,21],[104.01,21],[104.01,21.01],[104,21]]]},'occurred','Scar','old-road-version');
const place = {x:104.02,y:21.02}, distant = {x:105,y:22};
const scene = {communities:[{projected:place}],hazards:[],responseSites:[],roads:[{points:[distant]}],layers:{}} as unknown as MapScene;

describe('response map overview', () => {
  it('frames saved extents and operational places without zooming out to an entire context road', () => {
    const points = responseOverviewPoints(scene,[area],metadata);
    expect(points).toContainEqual({x:104,y:21});
    expect(points).toContainEqual(place);
    expect(points).not.toContainEqual(distant);
  });
  it('retains network context if no mapped extents are displayed', () => {
    expect(responseOverviewPoints(scene,[{...area,visible:false}],metadata)).toContainEqual(distant);
    expect(responseOverviewPoints(scene,[],metadata)).toContainEqual(place);
  });
});
