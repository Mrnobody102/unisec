import { areaNameIncludesState } from './areaLabels';
import { describe, expect, it } from 'vitest';
import { createLandslideArea, landslideAreaOf, landslideAreaKey, newLandslideArea, validateLandslideArea, areaPublicationIssue, roadAreaSection, roadLengthM, revisedLandslideBoundary } from './landslideAreas';
import { createGeometryRecords } from '../geodata/geometrySession';
import { parseSpatialInput } from '../geodata/parseSpatialInput';
import { exportGeometryGeoJSON } from '../geodata/geometryExports';
import { removeWithFieldAreas } from '../observations/fieldAreas';
import type { RoadSegment } from '../../types/dear';
const polygon={type:'Polygon' as const,coordinates:[[[104,21],[104.001,21],[104.001,21.001],[104,21]]]};
const road={id:'E1',points:[{x:0,y:0},{x:100,y:0},{x:100,y:100}],status:'open'} as RoadSegment;
const evidence=()=>({...newLandslideArea('potential','network-a'),sources:['resident' as const],basis:'Ground cracks and a reported cracking sound on the slope.'});
describe('mapped landslide area meaning',()=>{
  it('creates an independent polygon without needing a capture point or changing a road',()=>{
    const r=createLandslideArea(polygon,'potential','Slope A','network-a');
    expect(r.role).toBe('reference');expect(landslideAreaOf(r)?.state).toBe('potential');expect(road.status).toBe('open');
    const point=createGeometryRecords({format:'coordinate',features:[{type:'Feature',properties:{},geometry:{type:'Point',coordinates:[104,21]}}]},'GPS','reference')[0];
    expect(removeWithFieldAreas([point,r],point.id)).toEqual([r]);
  });
  it('cannot label a potential area as an observed deposit or recorded road impact',()=>{
    expect(()=>validateLandslideArea({...evidence(),part:'deposit'})).toThrow();
    expect(()=>validateLandslideArea({...evidence(),roadLinks:[{roadId:'E1',relation:'affected'}]})).toThrow();
    expect(()=>validateLandslideArea({...evidence(),state:'occurred',part:'deposit',roadLinks:[{roadId:'E1',relation:'affected'}]})).not.toThrow();
  });
  it('requires evidence at publication while retaining unknown observation time and boundary accuracy',()=>{
    expect(areaPublicationIssue(newLandslideArea('potential'))).toBe('evidence');
    const a=evidence();expect(a.observedAt).toBe('');expect(a.boundaryAccuracyM).toBeNull();expect(areaPublicationIssue(a)).toBeNull();
    expect(areaPublicationIssue({...a,sources:['imagery']})).toBe('imagery');
    expect(areaPublicationIssue({...a,sources:['imagery'],imageReference:'S2 sample',imageResolutionM:10})).toBeNull();
    expect(a.boundaryAccuracyM).toBeNull();
  });
  it('does not treat desk review or a resident report as field verification',()=>{
    const a=evidence();expect(areaPublicationIssue({...a,review:'field-checked',reviewer:'Operator',reviewedAt:a.updatedAt})).toBe('review');
    expect(areaPublicationIssue({...a,review:'reviewed',reviewer:'Operator',reviewedAt:a.updatedAt})).toBeNull();
  });
  it('clips only the selected interval, measured along the original geometry',()=>{
    expect(roadLengthM(road)).toBe(200);
    expect(roadAreaSection(road,{roadId:'E1',relation:'threatens',fromM:50,toM:150})).toEqual([{x:50,y:0},{x:100,y:0},{x:100,y:50}]);
    expect(()=>validateLandslideArea({...evidence(),roadLinks:[{roadId:'E1',relation:'threatens',fromM:150,toM:50}]})).toThrow();
  });
  it('rejects stale road IDs, out-of-range intervals and links from another network',()=>{
    const a={...evidence(),roadLinks:[{roadId:'E1',relation:'threatens' as const,fromM:50,toM:150}]};
    expect(areaPublicationIssue(a,[road],'network-a')).toBeNull();
    expect(areaPublicationIssue(a,[road],'network-b')).toBe('network');
    expect(areaPublicationIssue(a,[],'network-a')).toBe('road');
    expect(areaPublicationIssue({...a,roadLinks:[{...a.roadLinks[0],toM:201}]},[road],'network-a')).toBe('road');
  });
  it('round-trips metadata and remaps only evidence points included in the same export',()=>{
    const point=createGeometryRecords({format:'coordinate',features:[{type:'Feature',properties:{},geometry:{type:'Point',coordinates:[104,21]}}]},'GPS','reference')[0];
    const area=createLandslideArea(polygon,'occurred','Scar A','network-a');
    area.feature.properties[landslideAreaKey]={...newLandslideArea('occurred','network-a'),observationIds:[point.id],sources:['field'],basis:'Mapped deposit edge'};
    const imported=createGeometryRecords(parseSpatialInput(exportGeometryGeoJSON([point,area])),'roundtrip.geojson','auto');
    expect(landslideAreaOf(imported[1])?.observationIds).toEqual([imported[0].id]);
    expect(imported[1].feature.geometry).toEqual(area.feature.geometry);
    const orphan=createGeometryRecords(parseSpatialInput(exportGeometryGeoJSON([area])),'orphan.geojson','auto')[0];
    expect(landslideAreaOf(orphan)?.observationIds).toEqual(['external:'+point.id]);
  });
});

it('requires review again when a checked landslide boundary is changed, retaining evidence and road links', () => {
  const area = { ...evidence(), review: 'field-checked' as const, reviewer: 'Field team', reviewedAt: '2026-10-14T00:00:00Z', roadLinks: [{roadId:'E1', relation:'threatens' as const}] };
  const revised = revisedLandslideBoundary(area, '2026-10-15T00:00:00Z');
  expect(revised.review).toBe('unreviewed');
  expect(revised.reviewer).toBe('');
  expect(revised.reviewedAt).toBe('');
  expect(revised.roadLinks).toEqual(area.roadLinks);
  expect(revised.basis).toBe(area.basis);
  expect(area.review).toBe('field-checked');
});


describe('area heading context', () => {
  it('suppresses the type only when the title already identifies it', () => {
    expect(areaNameIncludesState('Vết sạt lở #1', 'occurred', 'vi')).toBe(true);
    expect(areaNameIncludesState('Vùng nguy cơ 2', 'potential', 'vi')).toBe(true);
    expect(areaNameIncludesState('Mapped landslide occurrence', 'occurred', 'en')).toBe(true);
    expect(areaNameIncludesState('Scar 3', 'occurred', 'vi')).toBe(false);
    expect(areaNameIncludesState('Nghi sạt lở, chưa xác minh', 'occurred', 'vi')).toBe(false);
    expect(areaNameIncludesState('Vết sạt lở 1', 'potential', 'vi')).toBe(false);
  });
});
