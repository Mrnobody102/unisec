import { describe, expect, it } from 'vitest';
import { initialMeasurementSession, measurementSessionReducer as reduce } from './measurementSession';
import { projectedMeasurementPoint } from './measurement';

const a = projectedMeasurementPoint(400000, 2400000)!;
const b = projectedMeasurementPoint(400100, 2400000)!;
describe('measurement session', () => {
  it('preserves completed results on close, archives on new and resets explicitly', () => {
    const draft = reduce(initialMeasurementSession, { type: 'points', points: [a, b] });
    expect(reduce(draft, { type: 'cancel' }).points).toEqual([]);
    const finished = reduce(draft, { type: 'finish' });
    expect(reduce(finished, { type: 'cancel' })).toBe(finished);
    const next = reduce(finished, { type: 'new' });
    expect(next.points).toEqual([]); expect(next.saved[0].points).toEqual([a, b]);
    const hidden = reduce(next, { type: 'visible', id: 1 });
    expect(hidden.saved[0].visible).toBe(false); expect(next.saved[0].visible).toBe(true);
    expect(reduce(hidden, { type: 'delete', id: 1 }).saved).toEqual([]);
    expect(reduce(next, { type: 'reset' })).toEqual(initialMeasurementSession);
  });
  it('supports undo/redo, clears the redo branch after editing and rejects incomplete finish', () => {
    const one = reduce(initialMeasurementSession, { type: 'points', points: [a] });
    expect(reduce(one, { type: 'finish' }).finished).toBe(false);
    const two = reduce(one, { type: 'points', points: [a, b] });
    const undo = reduce(two, { type: 'undo' });
    expect(undo.points).toEqual([a]); expect(reduce(undo, { type: 'redo' }).points).toEqual([a, b]);
    expect(reduce(undo, { type: 'points', points: [b] }).redo).toEqual([]);
  });
  it('archives valid imports and removes their source attribution after vertex editing', () => {
    const imported = reduce(initialMeasurementSession, { type: 'import', mode: 'distance', points: [a, b], source: 'Road' });
    expect(imported.finished).toBe(true);
    expect(reduce(imported, { type: 'mode', mode: 'area' }).saved[0].source).toBe('Road');
    const edited = reduce(reduce(imported, { type: 'edit' }), { type: 'points', points: [a, { ...b, x: b.x + 100 }] });
    expect(edited.source).toBeUndefined(); expect(edited.finished).toBe(true);
    expect(reduce(imported, { type: 'import', mode: 'area', points: [a, b], source: 'Bad polygon' })).toBe(imported);
  });
  it('locks a completed result until editing, and restores geometry and source on cancel', () => {
    const imported = reduce(initialMeasurementSession, { type: 'import', mode: 'distance', points: [a, b], source: 'Road' });
    expect(reduce(imported, { type: 'points', points: [b] })).toBe(imported);
    expect(reduce(imported, { type: 'undo' })).toBe(imported);
    const editing = reduce(imported, { type: 'edit' });
    const changed = reduce(editing, { type: 'points', points: [a, { ...b, x: b.x + 100 }] });
    expect(changed.finished).toBe(true);
    expect(reduce(changed, { type: 'undo' }).editing).toBe(true);
    expect(reduce(changed, { type: 'new' })).toBe(changed);
    const cancelled = reduce(changed, { type: 'cancel' });
    expect(cancelled.points).toEqual(imported.points);
    expect(cancelled.source).toBe('Road');
    expect(cancelled.editing).toBe(false);
    const applied = reduce(changed, { type: 'finish' });
    expect(applied.points).toEqual(changed.points);
    expect(applied.editing).toBe(false);
    expect(applied.source).toBeUndefined();
  });
  it('does not apply invalid edits and does not switch modes during editing', () => {
    const finished = reduce(reduce(initialMeasurementSession, { type: 'points', points: [a, b] }), { type: 'finish' });
    const invalid = reduce(reduce(finished, { type: 'edit' }), { type: 'points', points: [a] });
    expect(reduce(invalid, { type: 'finish' })).toBe(invalid);
    expect(reduce(invalid, { type: 'mode', mode: 'area' })).toBe(invalid);
    expect(reduce(invalid, { type: 'cancel' }).points).toEqual([a, b]);
  });
});
