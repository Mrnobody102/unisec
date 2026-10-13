import { useEffect, useMemo, useState } from 'react';
import type { IncidentPacket } from '../../data/incidentPacket';
import type { RoadStatus } from '../../types/dear';
import type { DemoIdentity } from './demoSession';

type Point = { x: number; y: number };
export type ScenarioTargetType = 'community' | 'site' | 'hazard' | 'road';
export type ScenarioChange =
  | { kind: 'move'; from: Point; to: Point }
  | { kind: 'status'; from: RoadStatus; to: RoadStatus }
  | { kind: 'rename'; from: string; to: string };

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
  if (c?.kind === 'move') return finite(c.from) && finite(c.to) && e.target.type !== 'road';
  if (c?.kind === 'status')
    return e.target.type === 'road' && statuses.includes(c.from) && statuses.includes(c.to);
  if (c?.kind === 'rename') return typeof c.from === 'string' && typeof c.to === 'string';
  return false;
}

/** Positions and road statuses after the log, in order. Renames are applied by ScenarioLabels. */
export function applyScenarioEdits(packet: IncidentPacket, edits: ScenarioEdit[]): IncidentPacket {
  if (!edits.length) return packet;
  const moved = new Map<string, Point>(),
    status = new Map<string, RoadStatus>();
  for (const edit of edits) {
    const key = `${edit.target.type}:${edit.target.id}`;
    if (edit.change.kind === 'move') moved.set(key, edit.change.to);
    else if (edit.change.kind === 'status') status.set(edit.target.id, edit.change.to);
  }
  const place = <T extends { id: string; projected: Point }>(type: ScenarioTargetType, items: T[]) =>
    items.map((item) => {
      const to = moved.get(`${type}:${item.id}`);
      return to ? { ...item, projected: to } : item;
    });
  return {
    ...packet,
    communities: place('community', packet.communities),
    responseSites: place('site', packet.responseSites),
    hazards: place('hazard', packet.hazards),
    roads: packet.roads.map((road) => {
      const to = status.get(road.id);
      return to ? { ...road, status: to } : road;
    })
  };
}

/** Entries for one feature, newest first. */
export function editsFor(edits: ScenarioEdit[], type: ScenarioTargetType, id: string): ScenarioEdit[] {
  return edits.filter((edit) => edit.target.type === type && edit.target.id === id).reverse();
}

export function useScenarioEdits(packet: IncidentPacket | null, identity: DemoIdentity | null) {
  const key = `dear.scenario-edits.v1:${packet?.datasetVersion ?? ''}`;
  const [edits, setEdits] = useState<ScenarioEdit[]>([]);
  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(key) ?? '[]');
      setEdits(Array.isArray(raw) ? raw.filter(validEdit) : []);
    } catch {
      setEdits([]);
    }
  }, [key]);
  const edited = useMemo(() => (packet ? applyScenarioEdits(packet, edits) : null), [packet, edits]);
  const persist = (next: ScenarioEdit[]) => {
    try {
      localStorage.setItem(key, JSON.stringify(next));
      setEdits(next);
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
    return validEdit(edit) && persist([...edits, edit]);
  };
  const revert = (id: string, note: string): boolean => {
    const original = edits.find((edit) => edit.id === id);
    if (!original || original.change.kind === 'rename') return false;
    const change: ScenarioChange =
      original.change.kind === 'move'
        ? { kind: 'move', from: original.change.to, to: original.change.from }
        : { kind: 'status', from: original.change.to, to: original.change.from };
    return record({ target: original.target, change, note, reverts: id });
  };
  return { packet: edited, edits, record, revert };
}

export type ScenarioEdits = ReturnType<typeof useScenarioEdits>;
