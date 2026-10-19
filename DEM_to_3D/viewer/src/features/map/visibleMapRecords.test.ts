import { describe, expect, it } from 'vitest';
import { createLandslideArea } from '../landslides/landslideAreas';
import { createFieldArea } from '../observations/fieldAreas';
import type { GeometryRecord } from '../../geo/vector/types';
import { hazardLayerVisible, visibleMapRecords } from './visibleMapRecords';

const polygon = { type: 'Polygon' as const, coordinates: [[[104,21],[104.01,21],[104.01,21.01],[104,21]]] };
const reference: GeometryRecord = { id:'point',name:'Survey',role:'reference',visible:true,source:{name:'Field',format:'coordinate',importedAt:'2026-09-29T03:00:00Z'},feature:{type:'Feature',properties:{},geometry:{type:'Point',coordinates:[104,21]}} };

describe('Semantic response layers', () => {
  it('keeps mapped landslides independent of imported GIS data and excludes another network', () => {
    const area = createLandslideArea(polygon, 'potential', 'Slope', 'current');
    const other = createLandslideArea(polygon, 'occurred', 'Other dataset', 'other');
    expect(visibleMapRecords([area, reference, other], {gis:false,landslide:true}, 'current')).toEqual([area]);
    expect(visibleMapRecords([area, reference], {gis:true,landslide:false}, 'current')).toEqual([reference]);
    expect(visibleMapRecords([{...area,visible:false}], {gis:true,landslide:true}, 'current')).toEqual([]);
  });
  it('hides linked field areas when their observation is hidden', () => {
    const area = createFieldArea(reference, polygon, 'Reported extent');
    expect(visibleMapRecords([{...reference,visible:false},area], {gis:true})).toEqual([]);
    expect(visibleMapRecords([reference,area], {gis:true})).toEqual([reference,area]);
  });
  it('does not hide bridge/crossing symbols when road status coloring is off', () => {
    const layers = {landslide:false,flood:true,status:false,crossings:true};
    expect(hazardLayerVisible({kind:'bridge'},layers)).toBe(true);
    expect(hazardLayerVisible({kind:'crossing'},layers)).toBe(true);
    expect(hazardLayerVisible({kind:'landslide'},layers)).toBe(false);
    expect(hazardLayerVisible({kind:'flood'},layers)).toBe(true);
    expect(hazardLayerVisible({kind:'bridge'},{...layers,crossings:false})).toBe(false);
  });
});
