import {describe, expect, it} from 'vitest';
import proj4 from 'proj4';
import type {GeometryRecord} from '../../geo/vector/types';
import type {Hazard} from '../../types/dear';
import {fieldRecords} from '../landslides/fieldDataset';
import {distinctSourceRecords, representedHazard} from './sourceRepresentation';
import {visibleMapRecords} from './visibleMapRecords';

const station = fieldRecords([{type:'Feature',properties:{name:'Scar 1'},geometry:{type:'Point',coordinates:[104.0467911061554,21.75744467431061,1782.874820916556]}}], 'a'.repeat(64), 'survey.kml', 'network', '2026-10-20T00:00:00Z')[0];
const [x,y] = proj4('EPSG:4326','EPSG:32648',station.feature.geometry.type === 'Point' ? station.feature.geometry.coordinates.slice(0,2) : []);
const hazard = {id:'LS-01',kind:'landslide',projected:{x,y}} as Hazard;
const copy: GeometryRecord = {...station,id:'duplicate',feature:{...station.feature,properties:{name:'Scar 1'}}};

describe('one representation of source geometry', () => {
  it('keeps survey stations visible in the data and combines only coincident incident symbols', () => {
    expect(station.visible).toBe(true);
    expect(representedHazard(station,[hazard])?.id).toBe('LS-01');
    expect(representedHazard(station,[{...hazard,projected:{x:401439.1,y:2406283.3}}])?.id).toBe('LS-01');
    expect(representedHazard(station,[{...hazard,projected:{x:x+2,y}}])).toBeUndefined();
    expect(visibleMapRecords([station],{landslide:true},'network',[hazard])).toEqual([]);
    expect(visibleMapRecords([station],{landslide:true},'network',[hazard],station.id)).toEqual([station]);
    expect(visibleMapRecords([station],{landslide:true},'network',[])).toEqual([station]);
  });
  it('removes identical raw copies from display without changing storage, preferring the selected copy', () => {
    const records = [copy,station];
    expect(distinctSourceRecords(records)).toEqual([station]);
    expect(distinctSourceRecords(records,copy.id)).toEqual([copy]);
    expect(records).toHaveLength(2);
    expect(distinctSourceRecords([copy,{...copy,id:'second'}])).toEqual([copy]);
    expect(distinctSourceRecords([{...station,visible:false},copy])).toEqual([copy]);
  });
  it('preserves notes, renamed features, nearby coordinates and independent field observations', () => {
    const note = {...copy,id:'note',feature:{...copy.feature,properties:{...copy.feature.properties,description:'Separate survey evidence'}}};
    const renamed = {...copy,id:'renamed',name:'Edited name',feature:{...copy.feature,properties:{name:'Edited name'}}};
    const observed = {...station,id:'observation',feature:{...station.feature,properties:{...station.feature.properties,dearObservation:{schema:'field-observation/v1',kind:'survey',note:'Visit',observedAt:'',observer:'',accuracyM:null,status:'unreviewed',updatedAt:'2026-10-20T00:00:00Z',photos:[]}}}};
    expect(distinctSourceRecords([station,note,renamed,observed])).toEqual([station,note,renamed,observed]);
    expect(representedHazard(observed,[hazard])).toBeUndefined();
  });
});
