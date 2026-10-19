import {describe,expect,it} from 'vitest';
import {fieldRecords} from './fieldDataset';
import {installPreparedRecords,publishGisDraft,readPublishedGis,publishedGisKey} from '../geodata/publishedGis';
import {landslideAreaOf} from './landslideAreas';
import type {VectorFeature} from '../../geo/vector/types';
const id='a'.repeat(64),time='2026-10-19T00:00:00Z';
const features:VectorFeature[]=[
 {type:'Feature',properties:{name:'Scar 1 [0830]',altitudeMode:'absolute'},geometry:{type:'Point',coordinates:[104.05,21.78,1782]}},
 {type:'Feature',properties:{name:'Talus'},geometry:{type:'Polygon',coordinates:[[[104.05,21.78,0],[104.051,21.78,0],[104.05,21.781,0],[104.05,21.78,0]]]}},
];
function storage(){const data=new Map<string,string>();return {getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>{data.set(k,v);},removeItem:(k:string)=>{data.delete(k);},key:(i:number)=>[...data.keys()][i]??null,get length(){return data.size;},clear:()=>data.clear()};}
describe('prepared field evidence',()=>{
 it('preserves survey Z, stable identity and uncertainty without closing roads',()=>{
  const records=fieldRecords(features,id,'survey.kml','network',time);
  expect(records).toHaveLength(2);expect(records[0].feature.geometry).toEqual(features[0].geometry);
  expect(records[0].feature.properties.altitudeMode).toBe('absolute');
  expect(records[0].id).toBe(fieldRecords(features,id,'survey.kml','network',time)[0].id);
  const area=landslideAreaOf(records[1])!;
  expect(area).toMatchObject({state:'occurred',part:'deposit',review:'unreviewed',observedAt:'',boundaryAccuracyM:null,roadLinks:[],sources:['field']});
 });
 it('installs once and retains later renames and deletions across reload',()=>{
  const s=storage(),source={id,records:fieldRecords(features,id,'survey.kml','network',time)};
  const first=installPreparedRecords(source,s);expect(installPreparedRecords(source,s).records).toHaveLength(2);
  publishGisDraft('network',first.records,[],[{...first.records[0],name:'Renamed'}],[],s);
  expect(installPreparedRecords(source,s).records.map(r=>r.name)).toEqual(['Renamed']);
  expect(readPublishedGis(s).installedSources).toEqual([id]);
 });
 it('never marks an installation complete when its atomic write fails',()=>{
  const s=storage();s.setItem=()=>{throw new Error('Quota');};
  expect(()=>installPreparedRecords({id,records:fieldRecords(features,id,'survey.kml','network',time)},s)).toThrow('Quota');
  expect(s.getItem(publishedGisKey)).toBeNull();
 });
});
