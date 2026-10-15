import type { Hazard, IncidentEvidence, ResponseSite } from '../../types/dear';
import type { ScenarioTargetType } from './scenarioEdits';
export type NewScenarioPoint =
  | { kind: 'create'; feature: Hazard; evidence: IncidentEvidence }
  | { kind: 'create'; feature: ResponseSite; evidence?: never };
const names = (value: unknown, limit = 160): value is [string,string] => Array.isArray(value) && value.length === 2 && value.every(n => typeof n === 'string' && n.trim() && n.length <= limit);
const stamp = (value: unknown) => typeof value === 'string' && Number.isFinite(Date.parse(value));
export function validNewPoint(type: ScenarioTargetType, id: string, value: NewScenarioPoint, at: string): boolean {
  const f = value.feature;
  if (!f || f.id !== id || !id || !names(f.name) || !Number.isFinite(f.projected?.x) || !Number.isFinite(f.projected?.y)) return false;
  if (type === 'site') return 'assessment' in f && f.kind === 'hlz' && f.assessment === 'candidate' &&
    stamp(f.observedAt) && Date.parse(f.observedAt) <= Date.parse(at) && names(f.source) && !value.evidence;
  if (type !== 'hazard' || !('observation' in f)) return false;
  const e = value.evidence;
  return ['landslide','flood','bridge','crossing'].includes(f.kind) && ['suspected','reported'].includes(f.observation)
    && names(f.src) && (f.area === undefined || Number.isFinite(f.area) && f.area > 0)
    && !!e && e.hazardId === id && typeof e.id === 'string' && !!e.id && e.type === 'field-report'
    && stamp(e.observedAt) && stamp(e.receivedAt) && Date.parse(e.observedAt) <= Date.parse(e.receivedAt) &&
    Date.parse(e.receivedAt) <= Date.parse(at) && names(e.source) && names(e.finding, 2000) && names(e.limitation, 2000);
}
