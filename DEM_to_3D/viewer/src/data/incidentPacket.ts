import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import schema from '../../public/scenarios/incident-v1.schema.json';
import type { AnalysisArea, Community, Hazard, IncidentEvidence, IncidentModel, ResponseSite, RoadSegment, RoutingAssumptions } from '../types/dear';
import type { CommunitySignal } from '../features/incident/responseAssessment';
import { projectedPathLength } from '../terrain/pathGeometry';
import { areaM2 } from '../terrain/areaGeometry';

export type IncidentPacket = {
  schemaVersion: 1;
  datasetVersion: string;
  dataKind: 'synthetic' | 'historical' | 'operational';
  reviewStatus: 'draft' | 'reviewed' | 'published';
  crs: 'EPSG:32648';
  incident: IncidentModel;
  communities: Array<Omit<Community, 'prio'>>;
  roads: RoadSegment[];
  hazards: Hazard[];
  responseSites: ResponseSite[];
  signals: Record<string, CommunitySignal>;
  evidence: IncidentEvidence[];
  report: { id: string; roadId: string; hazard: Hazard; evidence: IncidentEvidence };
  aoi: AnalysisArea;
  routingAssumptions: RoutingAssumptions;
};

const ajv = new Ajv({ allErrors: true, strict: true });
addFormats(ajv);
const validate = ajv.compile<IncidentPacket>(schema);
const check = (condition: boolean, message: string) => { if (!condition) throw new Error(`Invalid incident packet: ${message}`); };
function unique(items: Array<{ id: string }>, field: string): Set<string> {
  const ids = new Set(items.map(item => item.id));
  check(ids.size === items.length, `duplicate ${field} ID`); return ids;
}

/** Shared validation boundary for prepared packets and API snapshots. */
export function validateIncidentPacket(value: unknown): IncidentPacket {
  if (!validate(value)) throw new Error(`Invalid incident packet: ${ajv.errorsText(validate.errors)}`);
  const communities = unique(value.communities, 'community'), hazards = unique(value.hazards, 'hazard');
  unique(value.roads, 'road'); unique(value.evidence, 'evidence'); unique(value.responseSites, 'response site');
  unique(value.incident.sources, 'source');
  check(value.responseSites.some(site => site.kind === 'staging'), 'staging point missing');
  const first = value.aoi.points[0], last = value.aoi.points.at(-1)!;
  check(first.x === last.x && first.y === last.y, 'AOI ring must be closed');
  check(areaM2(value.aoi.points) > 0, 'AOI area must be positive');
  for (const range of Object.values(value.routingAssumptions)) check(range[0] <= range[1], 'routing speed range');
  check(Object.keys(value.signals).length === communities.size && Object.keys(value.signals).every(id => communities.has(id)), 'community signals');
  const trigger = Date.parse(value.incident.triggeredAt), snapshot = Date.parse(value.incident.asOf);
  check(trigger <= snapshot && snapshot < Date.parse(value.incident.asOfUpdated), 'incident timestamps');
  for (const source of value.incident.sources) {
    check(Date.parse(source.observedAt) <= snapshot, `source timestamp: ${source.id}`);
    if (source.observedAtUpdated) check(Date.parse(source.observedAtUpdated) >= Date.parse(source.observedAt) &&
      Date.parse(source.observedAtUpdated) <= Date.parse(value.incident.asOfUpdated), `updated source timestamp: ${source.id}`);
  }
  for (const item of [...value.responseSites, value.aoi]) check(Date.parse(item.observedAt) <= snapshot, `reference timestamp: ${item.id}`);
  for (const evidence of value.evidence) {
    check(hazards.has(evidence.hazardId), `unknown hazard: ${evidence.hazardId}`);
    check(Date.parse(evidence.observedAt) <= Date.parse(evidence.receivedAt) && Date.parse(evidence.receivedAt) <= snapshot, `evidence timestamps: ${evidence.id}`);
  }
  for (const hazard of value.hazards) {
    check(value.evidence.some(item => item.hazardId === hazard.id), `evidence missing: ${hazard.id}`);
    const [clock, date] = hazard.detected.split(' '), [day, month, year] = date.split('/');
    const stamp = `${year}-${month}-${day}T${clock}:00+07:00`;
    const parsed = new Date(stamp);
    check(Number.isFinite(parsed.getTime()) && parsed.getTime() <= snapshot &&
      new Date(parsed.getTime() + 7 * 3600000).toISOString().slice(0, 16) === `${year}-${month}-${day}T${clock}`, `hazard timestamp: ${hazard.id}`);
  }
  for (const road of value.roads) {
    check(!road.hz || hazards.has(road.hz), `unknown road hazard: ${road.id}`);
    check(Math.abs(road.len - projectedPathLength(road.points) / 1000) <= 0.0051, `road length: ${road.id}`);
    check(road.status !== 'blocked' || Boolean(road.hz), `blocked road evidence missing: ${road.id}`);
  }
  const report = value.report;
  check(value.roads.some(road => road.id === report.roadId && road.hz === report.hazard.id), 'report road/hazard link');
  check(hazards.has(report.hazard.id) && report.evidence.hazardId === report.hazard.id, 'report evidence link');
  check(Date.parse(report.evidence.observedAt) >= snapshot &&
    Date.parse(report.evidence.observedAt) <= Date.parse(report.evidence.receivedAt) && report.evidence.receivedAt === value.incident.asOfUpdated, 'report timestamps');
  return value;
}
