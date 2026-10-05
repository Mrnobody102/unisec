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
    const edited = reduce(imported, { type: 'points', points: [a, { ...b, x: b.x + 100 }] });
    expect(edited.source).toBeUndefined(); expect(edited.finished).toBe(true);
    expect(reduce(imported, { type: 'import', mode: 'area', points: [a, b], source: 'Bad polygon' })).toBe(imported);
  });
});
