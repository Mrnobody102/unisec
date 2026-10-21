import { describe, expect, it } from 'vitest';
import packetJson from '../../data/fixtures/che-tao-network.json';
import { validateIncidentPacket } from '../../data/incidentPacket';
import { deriveIncidentWorkspace } from './deriveIncidentWorkspace';
import { responseWork } from './responseWork';
import type { ScenarioEdit } from '../access/scenarioEdits';
import type { RoadStatus } from '../../types/dear';

const packet = () => validateIncidentPacket(structuredClone(packetJson));

const statusEdit = (roadId: string, at: string, from: RoadStatus, to: RoadStatus): ScenarioEdit =>
  ({ id: `edit-${at}`, at, author: { id: 'manager', name: 'Coordinator' }, target: { type: 'road', id: roadId, name: roadId },
    change: { kind: 'status', from, to }, note: 'Field check' });

describe('field report and manual status order', () => {
  it('lets a field report applied later win over an earlier manual status', () => {
    const input = packet(), roadId = input.report.roadId;
    const early = statusEdit(roadId, '2026-10-14T06:00:00Z', 'uncertain', 'open');
    const out = deriveIncidentWorkspace(input, true, [early], '2026-10-14T07:00:00Z');
    expect(out.roads.find(road => road.id === roadId)?.status).toBe('blocked');
  });

  it('keeps a manual status recorded after the report was applied', () => {
    const input = packet(), roadId = input.report.roadId;
    const late = statusEdit(roadId, '2026-10-14T08:00:00Z', 'blocked', 'uncertain');
    const out = deriveIncidentWorkspace(input, true, [late], '2026-10-14T07:00:00Z');
    expect(out.roads.find(road => road.id === roadId)?.status).toBe('uncertain');
  });

  it('reopens a completed road check when the road returns to uncertain after a manual change', () => {
    const input = packet(), base = deriveIncidentWorkspace(input, false);
    const road = base.roads.find(item => item.status === 'uncertain')!;
    const before = responseWork(input, base, false).find(task => task.id === `road:${road.id}`)!;
    const edits = [statusEdit(road.id, '2026-10-14T06:00:00Z', 'uncertain', 'blocked'),
      statusEdit(road.id, '2026-10-14T06:10:00Z', 'blocked', 'uncertain')];
    const after = responseWork(input, deriveIncidentWorkspace(input, false, edits), false).find(task => task.id === `road:${road.id}`)!;
    expect(after.signature).not.toBe(before.signature);
  });
});

describe('incident workspace snapshot', () => {
  it('recalculates access, road impact and evidence together without changing the input', () => {
    const input = packet(), original = structuredClone(input);
    const before = deriveIncidentWorkspace(input, false);
    const after = deriveIncidentWorkspace(input, true);
    expect(before.assessments.get('NK')?.access).toBe('uncertain');
    expect(after.assessments.get('NK')?.access).toBe('blocked');
    expect(after.roads.find(road => road.id === input.report.roadId)?.status).toBe('blocked');
    expect(after.hazards.find(hazard => hazard.id === input.report.hazard.id)).toEqual(input.report.hazard);
    expect(after.evidence.find(item => item.hazardId === input.report.evidence.hazardId)).toEqual(input.report.evidence);
    const pair = after.routes.get('NK')!;
    for (const route of [pair.direct, pair.candidate]) {
      expect(route?.status).toBe('blocked');
      expect(route?.eta).toBeUndefined();
    }
    expect(input).toEqual(original);
    expect(deriveIncidentWorkspace(input, false)).toEqual(before);
  });

  it('excludes communities outside the AOI from counts, routes and assessments', () => {
    const input = packet();
    input.communities.push({ ...input.communities[0], id: 'OUTSIDE', projected: { x: 0, y: 0 } });
    input.signals.OUTSIDE = { communication: 'lost', urgentNeed: true };
    const result = deriveIncidentWorkspace(input, false);
    expect(result.communities.some(community => community.id === 'OUTSIDE')).toBe(false);
    expect(result.routes.has('OUTSIDE')).toBe(false);
    expect(result.assessments.has('OUTSIDE')).toBe(false);
    for (const community of result.communities) {
      expect(community.prio).toBe(result.assessments.get(community.id)?.priority);
      const pair = result.routes.get(community.id)!;
      for (const route of [pair.direct, pair.candidate]) {
        if (route) expect(route.segs.every(segment => result.roads.includes(segment))).toBe(true);
      }
    }
  });

  it('fails explicitly if the calculation is called without its staging origin', () => {
    const input = packet();
    input.responseSites = input.responseSites.filter(site => site.kind !== 'staging');
    expect(() => deriveIncidentWorkspace(input, false)).toThrow('staging site');
  });
});
