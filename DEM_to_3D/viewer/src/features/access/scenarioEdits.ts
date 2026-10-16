import { publishedGisKey, readPublishedGis, writePublishedEdits } from '../geodata/publishedGis';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { IncidentPacket } from '../../data/incidentPacket';
import type { ResponseSite, RoadStatus } from '../../types/dear';
import type { DemoIdentity } from './demoSession';

import {roadHazardIds,roadsForHazard,setRoadHazards,setHazardRoads,sameLinks} from '../incident/roadHazards';
import { validProperties, type ScenarioProperties } from './scenarioProperties';
import { validNewPoint, type NewScenarioPoint } from './scenarioPoint';
type Point = { x: number; y: number };
export type ScenarioTargetType = 'community' | 'site' | 'hazard' | 'road';
export type ScenarioChange =
  | { kind: 'move'; from: Point; to: Point; fromAssessment?: ResponseSite['assessment']; toAssessment?: ResponseSite['assessment'] }
  | { kind: 'status'; from: RoadStatus; to: RoadStatus }
  | { kind: 'links'; from: string[]; to: string[] }
  | { kind: 'rename'; from: string; to: string }
  | { kind: 'properties'; from: ScenarioProperties; to: ScenarioProperties }
  | NewScenarioPoint;

/** One entry of the append-only edit log. Reverting adds a new entry; nothing is deleted. */
export type ScenarioEdit = {
  id: string;
  at: string;
  author: { id: string; name: string };
  target: { type: ScenarioTargetType; id: string; name: string };
  change: ScenarioChange;
  note: string;
  /** Set when this entry undoes an earlier one. */
  reverts?: string;
};

const statuses: RoadStatus[] = ['open', 'blocked', 'uncertain'];
const finite = (p: unknown): p is Point =>
  !!p && typeof p === 'object' && Number.isFinite((p as Point).x) && Number.isFinite((p as Point).y);

export function validEdit(raw: unknown): raw is ScenarioEdit {
  const e = raw as ScenarioEdit;
  if (!e || typeof e.id !== 'string' || !Number.isFinite(Date.parse(e.at))) return false;
  if (typeof e.author?.id !== 'string' || typeof e.author?.name !== 'string') return false;
  if (!['community', 'site', 'hazard', 'road'].includes(e.target?.type) || typeof e.target?.id !== 'string')
    return false;
  if (typeof e.note !== 'string' || e.note.length > 2000) return false;
  const c = e.change;
  if (c?.kind === 'properties') return !!e.note.trim() && validProperties(e.target.type, c.from) && validProperties(e.target.type, c.to);
  if (c?.kind === 'links') return ['hazard','road'].includes(e.target.type) && !!e.note.trim() && [c.from,c.to].every(ids=>Array.isArray(ids)&&ids.length<=128&&new Set(ids).size===ids.length&&ids.every(id=>typeof id==='string'&&id.length>0&&id.length<=160));
  if (c?.kind === 'create') return !!e.note.trim() && validNewPoint(e.target.type, e.target.id, c, e.at);
  if (c?.kind === 'move') return finite(c.from) && finite(c.to) && e.target.type !== 'road' &&
    [c.fromAssessment, c.toAssessment].every(s => s === undefined || (e.target.type === 'site' && ['candidate','assessed','unavailable'].includes(s)));
  if (c?.kind === 'status')
    return e.target.type === 'road' && statuses.includes(c.from) && statuses.includes(c.to);
  if (c?.kind === 'rename') return typeof c.from === 'string' && typeof c.to === 'string';
  return false;
}

/** Apply after selecting a prepared revision; source data remains unchanged. */
export function applyScenarioEdits(packet: IncidentPacket, edits: ScenarioEdit[]): IncidentPacket {
  if (!edits.length) return packet;
  let communities = packet.communities, responseSites = packet.responseSites, hazards = packet.hazards,
    roads = packet.roads, evidence = packet.evidence;
  for (const edit of edits) {
    const c = edit.change, { type, id } = edit.target;
    if (c.kind === 'create') {
      if (type === 'hazard' && 'observation' in c.feature && c.evidence && !hazards.some(h => h.id === id)) {
        hazards = [...hazards, c.feature]; evidence = [...evidence, c.evidence];
      } else if (type === 'site' && 'assessment' in c.feature && !responseSites.some(s => s.id === id)) responseSites = [...responseSites, c.feature];
      continue;
    }
    if (c.kind === 'links') {
      if (type === 'hazard' && hazards.some(h=>h.id===id) && c.to.every(rid=>roads.some(r=>r.id===rid))) {
        roads=setHazardRoads(roads,id,c.to);hazards=hazards.map(h=>h.id===id?{...h,roadLinksNeedReview:false}:h);
      } else if (type === 'road' && roads.some(r=>r.id===id) && c.to.every(hid=>hazards.some(h=>h.id===hid))) roads=setRoadHazards(roads,id,c.to);
      continue;
    }
    if (c.kind === 'status') { roads = roads.map(r => r.id === id ? { ...r, status: c.to } : r); continue; }
    if (c.kind === 'rename') continue; // Old rename entries use the legacy label store.
    const update = <T extends { id: string; name: string | [string,string]; projected?: Point }>(item: T): T => {
      if (item.id !== id) return item;
      if (c.kind === 'move') {
        const site = item as T & Partial<ResponseSite>;
        return { ...item, projected: { ...c.to },
          ...(type === 'hazard' && roadsForHazard(roads,id).length ? {roadLinksNeedReview:true} : {}),
          ...(type === 'site' && site.kind === 'hlz' ? { assessment: c.toAssessment ?? 'candidate' } : {}) };
      }
      return { ...item, name: type === 'community' ? c.to.names[0] : [...c.to.names],
        labelMode: c.to.labelMode,
        ...(type === 'hazard' && c.to.hazardKind ? { kind: c.to.hazardKind } : {}),
        ...(type === 'hazard' && c.to.observation ? { observation: c.to.observation } : {}),
        ...(type === 'site' && c.to.siteAssessment ? { assessment: c.to.siteAssessment } : {}) } as T;
    };
    if (type === 'community') communities = communities.map(update);
    else if (type === 'hazard') hazards = hazards.map(update);
    else if (type === 'site') responseSites = responseSites.map(update);
    else roads = roads.map(update);
  }
  return { ...packet, communities, responseSites, hazards, roads, evidence };
}

/** Entries for one feature, newest first. */
export function editsFor(edits: ScenarioEdit[], type: ScenarioTargetType, id: string): ScenarioEdit[] {
  return edits.filter((edit) => edit.target.type === type && edit.target.id === id).reverse();
}

export function useScenarioEdits(packet: IncidentPacket | null, identity: DemoIdentity | null, options:{draft?:boolean}={}) {
  const key = `dear.scenario-edits.v1:${packet?.datasetVersion ?? ''}`;
  const restore = (): ScenarioEdit[] => {
    try {
      const raw = options.draft ? [] : readPublishedGis().scenarios[packet?.datasetVersion ?? ''] ?? [];
      return Array.isArray(raw) ? raw.filter(validEdit) : [];
    } catch { return []; }
  };
  // Restore before the first GIS render, so its draft baseline includes saved edits.
  const [edits, setEdits] = useState<ScenarioEdit[]>(restore);
  const currentEdits = useRef(edits);
  useEffect(() => {
    const restored = restore();
    currentEdits.current = restored;
    setEdits(restored);
  }, [key]);
  // Another tab may record edits too; keep this tab's view of the log current.
  useEffect(() => {
    if (options.draft) return;
    const sync = (event: StorageEvent) => {
      if (event.key !== publishedGisKey) return;
      const restored = restore();
      currentEdits.current = restored;
      setEdits(restored);
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, [key, options.draft]);
  const edited = useMemo(() => (packet ? applyScenarioEdits(packet, edits) : null), [packet, edits]);
  const persist = (next: ScenarioEdit[]) => {
    try {
      const written = options.draft ? next : writePublishedEdits(packet?.datasetVersion ?? '', next);
      currentEdits.current = written;
      setEdits(written);
      return true;
    } catch {
      return false;
    }
  };
  const record = (entry: Pick<ScenarioEdit, 'target' | 'change' | 'note' | 'reverts'>): boolean => {
    if (!identity || identity.role !== 'manager') return false;
    const edit: ScenarioEdit = {
      ...entry,
      id: crypto.randomUUID(),
      at: new Date().toISOString(),
      author: { id: identity.id, name: identity.name }
    };
    if (edit.change.kind === 'create' && edit.change.evidence) {
      edit.change = {...edit.change,evidence:{...edit.change.evidence,receivedAt:edit.at}};
    }
    if (!packet || !validEdit(edit)) return false;
    const current = applyScenarioEdits(packet, currentEdits.current);
    const collection = edit.target.type === 'hazard' ? current.hazards : edit.target.type === 'site' ? current.responseSites :
      edit.target.type === 'road' ? current.roads : current.communities;
    const exists = collection.some(f => f.id === edit.target.id);
    if (edit.change.kind === 'create' ? exists : !exists) return false;
    if(edit.change.kind==='links'){
      const candidates=edit.target.type==='hazard'?current.roads:current.hazards;
      const from=edit.target.type==='hazard'?roadsForHazard(current.roads,edit.target.id).map(r=>r.id):roadHazardIds(current.roads.find(r=>r.id===edit.target.id)!);
      if(!sameLinks(from,edit.change.from)||!edit.change.to.every(id=>candidates.some(v=>v.id===id)))return false;
    }
    return persist([...currentEdits.current, edit]);
  };
  const revert = (id: string, note: string): boolean => {
    const original = currentEdits.current.find((edit) => edit.id === id);
    if (!original || original.change.kind === 'rename' || original.change.kind === 'create' ||
      editsFor(currentEdits.current, original.target.type, original.target.id).find(e => e.change.kind !== 'rename')?.id !== id) return false;
    const change: ScenarioChange =
      original.change.kind === 'move'
        ? { kind: 'move', from: original.change.to, to: original.change.from, fromAssessment: original.change.toAssessment, toAssessment: original.change.fromAssessment }
        : original.change.kind === 'properties'
          ? { kind: 'properties', from: original.change.to, to: original.change.from }
          : original.change.kind === 'links' ? {kind:'links',from:original.change.to,to:original.change.from}
          : { kind: 'status', from: original.change.to, to: original.change.from };
    return record({ target: original.target, change, note, reverts: id });
  };
  const accept=(next:ScenarioEdit[])=>{currentEdits.current=next;setEdits(next);};
  return { packet: edited, edits, record, revert, accept, identity, draft:!!options.draft, canEdit: identity?.role === 'manager' };
}

export type ScenarioEdits = ReturnType<typeof useScenarioEdits>;
