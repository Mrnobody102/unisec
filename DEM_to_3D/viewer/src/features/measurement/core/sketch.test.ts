import { describe, expect, it } from 'vitest';
import { projectedMeasurementPoint, rectangleRing } from './geometry';
import { emptySketch, sketchReducer as reduce } from './sketch';

const a = projectedMeasurementPoint(400000, 2400000)!;
const b = projectedMeasurementPoint(400100, 2400000)!;
const c = projectedMeasurementPoint(400100, 2400100)!;
const m = projectedMeasurementPoint(400050, 2400000)!;
const line = reduce(emptySketch('distance'), { type: 'points', points: [a, b, c] });

describe('sketch vertex editing', () => {
  it('inserts on a segment, moves and removes a vertex, each undoable', () => {
    const inserted = reduce(line, { type: 'insert', index: 1, point: m });
    expect(inserted.points).toEqual([a, m, b, c]);
    expect(inserted.selected).toBe(1);
    const moved = reduce(inserted, { type: 'move', index: 3, point: b });
    expect(moved.points).toEqual([a, m, b, b]);
    const removed = reduce(moved, { type: 'remove', index: 1 });
    expect(removed.points).toEqual([a, b, b]);
    expect(removed.selected).toBeNull();
    expect(reduce(removed, { type: 'undo' }).points).toEqual(moved.points);
    expect(reduce(reduce(removed, { type: 'undo' }), { type: 'redo' }).points).toEqual(removed.points);
  });
  it('rejects vertex insertion for fixed-point modes and out-of-range indexes', () => {
    const bearing = reduce(emptySketch('bearing'), { type: 'points', points: [a, b], automatic: true });
    expect(reduce(bearing, { type: 'insert', index: 1, point: m })).toBe(bearing);
    expect(reduce(line, { type: 'insert', index: 0, point: m })).toBe(line);
    expect(reduce(line, { type: 'remove', index: 5 })).toBe(line);
    expect(reduce(line, { type: 'select', index: 5 })).toBe(line);
  });
  it('closes an area by inserting on its last edge', () => {
    const area = reduce(emptySketch('area'), { type: 'points', points: [a, b, c] });
    expect(reduce(area, { type: 'insert', index: 3, point: m }).points).toEqual([a, b, c, m]);
  });
  it('opens an edit when a finished shape changes, and cancel restores it', () => {
    const finished = reduce(line, { type: 'finish' });
    const selected = reduce(finished, { type: 'select', index: 2 });
    expect(selected.editing).toBe(false);
    const removed = reduce(selected, { type: 'remove', index: 2 });
    expect(removed.editing).toBe(true);
    expect(removed.points).toEqual([a, b]);
    expect(reduce(removed, { type: 'cancel' }).points).toEqual([a, b, c]);
    expect(reduce(removed, { type: 'finish' })).toMatchObject({ editing: false, finished: true, points: [a, b] });
  });
  it('completes a rectangle from two opposite corners', () => {
    const rectangle = reduce(emptySketch('rectangle'), { type: 'points', points: [a, c], automatic: true });
    expect(rectangle.finished).toBe(true);
    expect(rectangleRing(rectangle.points)).toHaveLength(4);
  });
});
