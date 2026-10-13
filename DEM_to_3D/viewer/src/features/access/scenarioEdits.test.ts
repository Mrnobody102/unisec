import { describe, expect, it } from 'vitest';
import type { IncidentPacket } from '../../data/incidentPacket';
import { applyScenarioEdits, editsFor, validEdit, type ScenarioEdit } from './scenarioEdits';

const packet = {
  communities: [{ id: 'NK', name: 'Nậm Khắt', projected: { x: 1, y: 1 } }],
  responseSites: [{ id: 'TOWN', projected: { x: 5, y: 5 } }],
  hazards: [],
  roads: [{ id: 'R1', status: 'open', points: [] }]
} as unknown as IncidentPacket;

const edit = (overrides: Partial<ScenarioEdit>): ScenarioEdit => ({
  id: crypto.randomUUID(),
  at: '2026-10-12T00:00:00Z',
  author: { id: 'demo:manager:a', name: 'A' },
  target: { type: 'community', id: 'NK', name: 'Nậm Khắt' },
  change: { kind: 'move', from: { x: 1, y: 1 }, to: { x: 2, y: 3 } },
  note: '',
  ...overrides
});

describe('applyScenarioEdits', () => {
  it('moves points and changes road status, last entry wins', () => {
    const edits = [
      edit({}),
      edit({ change: { kind: 'move', from: { x: 2, y: 3 }, to: { x: 4, y: 4 } } }),
      edit({ target: { type: 'road', id: 'R1', name: 'R1' }, change: { kind: 'status', from: 'open', to: 'blocked' } })
    ];
    const next = applyScenarioEdits(packet, edits);
    expect(next.communities[0].projected).toEqual({ x: 4, y: 4 });
    expect(next.roads[0].status).toBe('blocked');
    expect(next.responseSites[0].projected).toEqual({ x: 5, y: 5 });
    expect(packet.communities[0].projected).toEqual({ x: 1, y: 1 });
  });

  it('lists a feature history newest first', () => {
    const first = edit({}),
      second = edit({ at: '2026-10-12T01:00:00Z' });
    expect(editsFor([first, second], 'community', 'NK').map((e) => e.id)).toEqual([second.id, first.id]);
  });
});

describe('validEdit', () => {
  it('rejects a status change on a point feature', () => {
    expect(validEdit(edit({ change: { kind: 'status', from: 'open', to: 'blocked' } }))).toBe(false);
    expect(validEdit(edit({}))).toBe(true);
  });
});
