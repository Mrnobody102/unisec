import { describe, expect, it } from 'vitest';
import { preparedPacket, initialHazards, initialRoadSegments, buildScenarioRoutes } from '../../data/cheTaoScenario';
import { assessCommunity } from '../incident/responseAssessment';
import { createDecisionSnapshot, snapshotFilename } from './decisionSnapshot';

function capture(updated = false, direct = false) {
  const roads = initialRoadSegments.map(r => updated && r.id === preparedPacket.report.roadId ? { ...r, status: 'blocked' as const } : r);
  const hazards = initialHazards.map(h => updated && h.id === preparedPacket.report.hazard.id ? preparedPacket.report.hazard : h);
  const pair = buildScenarioRoutes(roads).get('NK')!;
  const community = { ...preparedPacket.communities.find(c => c.id === 'NK')!, prio: 1 as const };
  return createDecisionSnapshot({ packet: preparedPacket, updated, community, communities: [community],
    assessment: assessCommunity(pair, hazards, preparedPacket.signals.NK), route: direct ? pair.direct : pair.candidate,
    roads, hazards, evidence: preparedPacket.evidence.map(e => updated && e.hazardId === preparedPacket.report.evidence.hazardId ? preparedPacket.report.evidence : e) });
}
describe('decision export snapshot', () => {
  it('keeps selected route and road states while preserving provenance', () => {
    const snapshot = capture();
    expect(snapshot.route!.segs.some(s => s.id === 'E13')).toBe(true);
    expect(snapshot.dataKind).toBe('synthetic'); expect(snapshot.reviewStatus).toBe('draft');
    expect(snapshot.appliedReportIds).toEqual([]);
    expect(snapshotFilename(snapshot)).not.toBe(snapshotFilename(capture(false, true)));
  });
  it('captures the new time, evidence and blocked road after applying a report', () => {
    const snapshot = capture(true);
    expect(snapshot.asOf).toBe(preparedPacket.incident.asOfUpdated);
    expect(snapshot.appliedReportIds).toEqual([preparedPacket.report.id]);
    expect(snapshot.assessment.access).toBe('blocked');
    expect(snapshot.roads.find(r => r.id === preparedPacket.report.roadId)!.status).toBe('blocked');
    expect(snapshot.evidence).toContainEqual(preparedPacket.report.evidence);
  });
  it('does not retain mutable references to the live workspace', () => {
    const snapshot = capture(); snapshot.roads[0].points[0].x = -1;
    snapshot.routingAssumptions.primary[0] = 999;
    expect(initialRoadSegments[0].points[0].x).not.toBe(-1);
    expect(preparedPacket.routingAssumptions.primary[0]).not.toBe(999);
  });
});
