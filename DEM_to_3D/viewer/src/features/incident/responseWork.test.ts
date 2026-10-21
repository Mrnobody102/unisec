import { describe, expect, it } from 'vitest';
import raw from '../../../public/scenarios/che-tao/v0.3/incident.json';
import { validateIncidentPacket } from '../../data/incidentPacket';
import { deriveIncidentWorkspace } from './deriveIncidentWorkspace';
import { responseWork, restoreWork, workEntry, workState } from './responseWork';
import { journalRecords } from './journalRecords';
import { scenarioProperties } from '../access/scenarioProperties';
import type { ScenarioEdit } from '../access/scenarioEdits';

const packet = validateIncidentPacket(raw);
describe('Response work and journal', () => {
  it('prioritises new reports, contact loss and access gaps without claiming isolation or official alerts', () => {
    const snapshot = deriveIncidentWorkspace(packet, false),
      tasks = responseWork(packet, snapshot, false);
    expect(tasks[0].kind).toBe('report');
    expect(new Set(tasks.map((task) => task.id)).size).toBe(tasks.length);
    expect(tasks.some((task) => task.kind === 'contact')).toBe(true);
    expect(tasks.some((task) => task.id === 'access:NK')).toBe(false); // Initial bypass still exists.
    const revised = responseWork(packet, deriveIncidentWorkspace(packet, true), true);
    expect(revised.some((task) => task.kind === 'report')).toBe(false);
    expect(revised.filter((task) => task.id.startsWith('access:')).length).toBeGreaterThan(
      tasks.filter((task) => task.id.startsWith('access:')).length
    );
  });
  it('requires a result for completed/waiting work and never changes the incident snapshot', () => {
    const snapshot = deriveIncidentWorkspace(packet, false),
      before = JSON.stringify(snapshot.roads);
    const task = responseWork(packet, snapshot, false).find((task) => task.kind === 'access')!;
    expect(() => workEntry(task, 'done', '', '', '2026-10-08T04:00:00Z')).toThrow();
    expect(() => workEntry(task, 'blocked', ' ', '', '2026-10-08T04:00:00Z')).toThrow();
    const entry = workEntry(
      task,
      'done',
      'Requested a field survey',
      'Duty officer',
      '2026-10-08T04:00:00Z'
    );
    expect(workState(task, [entry]).status).toBe('done');
    expect(JSON.stringify(snapshot.roads)).toBe(before);
    expect(restoreWork([entry])).toEqual([entry]);
    expect(() => restoreWork([{ ...entry, owner: '' }])).toThrow();
    expect(() => restoreWork([entry, entry])).toThrow();
  });
  it('reopens a task when its supporting evidence changes while retaining its prior record', () => {
    const task = responseWork(packet, deriveIncidentWorkspace(packet, false), false).find(
      (task) => task.kind === 'contact'
    )!;
    const entry = workEntry(task, 'active', '', 'Officer', '2026-10-08T04:00:00Z');
    expect(workState({ ...task, signature: 'new-evidence' }, [entry])).toMatchObject({
      status: 'pending',
      changed: true
    });
    expect(entry.status).toBe('active');
  });
  it('keeps report observation time, receipt time, analysis and local actions distinct', () => {
    const records = journalRecords(packet, [], null);
    expect(records.filter((record) => record.kind === 'report')).toHaveLength(
      packet.evidence.length + 1
    );
    expect(records.filter((record) => record.kind === 'analysis')).toHaveLength(
      packet.incident.timeline.length
    );
    expect(records.every((record) => Number.isFinite(Date.parse(record.at)))).toBe(true);
    const report = records.find((record) => record.id === packet.report.evidence.id)!;
    expect(report.at).toBe(packet.report.evidence.receivedAt);
    expect(report.record?.observedAt).toBe(packet.report.evidence.observedAt);
    expect(journalRecords(packet, [], '2026-10-08T04:00:00Z')[0].kind).toBe('revision');
  });
});

describe('verification work follows the evidence', () => {
  const confirm = (hazardId: string): ScenarioEdit => {
    const hazard = packet.hazards.find(item => item.id === hazardId)!;
    const from = scenarioProperties(hazard);
    return { id: 'confirm', at: '2026-10-14T06:00:00Z', author: { id: 'manager', name: 'Coordinator' },
      target: { type: 'hazard', id: hazardId, name: hazard.name[0] },
      change: { kind: 'properties', from, to: { ...from, observation: 'reported' } }, note: 'Checked on site' };
  };

  it('asks for an on-site check of each suspected hazard until it is confirmed', () => {
    const suspected = packet.hazards.find(item => item.observation === 'suspected')!;
    expect(responseWork(packet, deriveIncidentWorkspace(packet, false), false).some(task => task.id === `hazard:${suspected.id}`)).toBe(true);
    const confirmed = deriveIncidentWorkspace(packet, false, [confirm(suspected.id)]);
    expect(confirmed.hazards.find(item => item.id === suspected.id)?.observation).toBe('reported');
    expect(responseWork(packet, confirmed, false).some(task => task.id === `hazard:${suspected.id}`)).toBe(false);
  });

  it('asks to check a passable road that a mapped landslide affects, but not one it only threatens', () => {
    const snapshot = deriveIncidentWorkspace(packet, false);
    const road = snapshot.roads.find(item => item.status === 'open')!;
    const link = { areaId: 'area-1', areaName: 'Vùng A', roadId: road.id };
    expect(responseWork(packet, snapshot, false, [{ ...link, relation: 'threatens' }]).some(task => task.id === `road:${road.id}`)).toBe(false);
    const task = responseWork(packet, snapshot, false, [{ ...link, relation: 'affected' }]).find(item => item.id === `road:${road.id}`);
    expect(task?.reason[0]).toContain('Vùng A');
  });
});
