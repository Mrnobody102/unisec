import {describe,it,expect} from 'vitest';
import {scenarioProperties,validProperties} from './scenarioProperties';
import {validEdit,applyScenarioEdits,type ScenarioEdit} from './scenarioEdits';
import {deriveIncidentWorkspace} from '../incident/deriveIncidentWorkspace';
import {validateIncidentPacket} from '../../data/incidentPacket';
import packetJson from '../../../public/scenarios/che-tao/v0.2/incident.json';
const packet=()=>validateIncidentPacket(structuredClone(packetJson));
const edit=(type:ScenarioEdit['target']['type'],id:string,change:ScenarioEdit['change']):ScenarioEdit=>({id:crypto.randomUUID(),at:'2026-10-14T06:00:00Z',author:{id:'manager',name:'Coordinator'},target:{type,id,name:'Edited'},change,note:'Field verification'});
describe('response feature changes',()=>{
 it('edits an updated hazard after the prepared report so its name and coordinates are retained',()=>{
  const p=packet(),h=p.report.hazard,from=scenarioProperties(h),to={...from,names:['T?n ?? s?a','Edited name'] as [string,string],labelMode:'hide' as const};
  const changes=[edit('hazard',h.id,{kind:'properties',from,to}),edit('hazard',h.id,{kind:'move',from:h.projected,to:{x:h.projected.x+40,y:h.projected.y+80}})];
  const out=deriveIncidentWorkspace(p,true,changes);
  expect(out.hazards.find(v=>v.id===h.id)).toMatchObject({name:to.names,projected:{x:h.projected.x+40,y:h.projected.y+80},labelMode:'hide'});
  expect(out.evidence.find(v=>v.hazardId===h.id)).toEqual(p.report.evidence);
  expect(out.manualUpdatedAt).toBe(changes[1].at);
  expect(p.report.hazard).toEqual(packet().report.hazard);
  expect(deriveIncidentWorkspace(p,false).hazards.find(v=>v.id===h.id)).toEqual(p.hazards.find(v=>v.id===h.id));
 });
 it('does not let a prepared blockage overwrite a later recorded road status',()=>{
  const p=packet(),road=p.roads.find(r=>r.id===p.report.roadId)!;
  const out=deriveIncidentWorkspace(p,true,[edit('road',road.id,{kind:'status',from:'blocked',to:'uncertain'})]);
  expect(out.roads.find(r=>r.id===road.id)?.status).toBe('uncertain');
  // Another blocked segment must keep the overall route blocked.
  expect(out.routes.get('NK')?.direct?.status).toBe('blocked');
 });
 it('a moved landing site becomes an unsurveyed candidate; undo can restore the prior survey at its old position',()=>{
  const p=packet(),site=p.responseSites.find(s=>s.kind==='hlz')!;
  site.assessment='assessed';
  const move=edit('site',site.id,{kind:'move',from:site.projected,to:{x:site.projected.x+100,y:site.projected.y},fromAssessment:'assessed',toAssessment:'candidate'});
  const moved=applyScenarioEdits(p,[move]).responseSites.find(s=>s.id===site.id)!;
  expect(moved.assessment).toBe('candidate');
  expect(site.assessment).toBe('assessed');
  const undo=edit('site',site.id,{kind:'move',from:moved.projected,to:site.projected,fromAssessment:'candidate',toAssessment:'assessed'});
  expect(applyScenarioEdits(p,[move,undo]).responseSites.find(s=>s.id===site.id)).toEqual(site);
 });
 it('persists new hazards together with their evidence without silently changing nearby roads',()=>{
  const p=packet(),base=p.hazards[0],id='new-hazard';
  const c:ScenarioEdit['change']={kind:'create',feature:{...base,id,name:['M?i','New']},evidence:{...p.evidence[0],id:'new-evidence',hazardId:id}};
  const entry=edit('hazard',id,c);
  expect(validEdit(entry)).toBe(true);
  const out=applyScenarioEdits(p,[entry,entry]);
  expect(out.hazards.filter(h=>h.id===id)).toHaveLength(1);
  expect(out.evidence.filter(e=>e.hazardId===id)).toHaveLength(1);
  expect(out.roads).toBe(p.roads);
  expect(p.hazards.some(h=>h.id===id)).toBe(false);
 });
 it('rejects naked hazards, future observations, preset verified landing sites and unrelated symbol classes',()=>{
  const p=packet(),h={...p.hazards[0],id:'new-hazard'};
  expect(validEdit(edit('hazard',h.id,{kind:'create',feature:h} as ScenarioEdit['change']))).toBe(false);
  const site={...p.responseSites.find(s=>s.kind==='hlz')!,id:'new-site',assessment:'assessed' as const};
  expect(validEdit(edit('site',site.id,{kind:'create',feature:site}))).toBe(false);
  const from=scenarioProperties(h);
  expect(validProperties('site',{...from,hazardKind:'landslide'})).toBe(false);
  expect(validProperties('hazard',{...from,labelMode:'invalid'})).toBe(false);
  expect(validEdit(edit('hazard',h.id,{kind:'properties',from,to:{...from,names:['','']}}))).toBe(false);
  const c:ScenarioEdit['change']={kind:'create',feature:h,evidence:{...p.evidence[0],id:'future',hazardId:h.id,observedAt:'2030-01-01T00:00:00Z',receivedAt:'2030-01-01T00:00:00Z'}};
  expect(validEdit(edit('hazard',h.id,c))).toBe(false);
 });
});
