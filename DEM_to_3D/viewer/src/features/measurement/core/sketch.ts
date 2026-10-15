import { canFinish, takesVertices, type MeasurePoint, type SketchMode } from './geometry';

/**
 * One shape being drawn or edited, shared by measurement and drawing. Every vertex change goes
 * through this reducer, so each one can be undone. Changing a finished shape opens an edit;
 * finish (Apply) keeps it and cancel restores the shape from before the edit.
 */
export type Sketch = {
  mode: SketchMode; points: MeasurePoint[]; finished: boolean; source?: string;
  editing: boolean; editStart?: { points: MeasurePoint[]; source?: string };
  /** Selected vertex for the vertex table, keyboard deletion and map highlight. */
  selected: number | null;
  undo: MeasurePoint[][]; redo: MeasurePoint[][];
};
export const emptySketch = (mode: SketchMode): Sketch =>
  ({ mode, points: [], finished: false, source: undefined, editing: false, editStart: undefined, selected: null, undo: [], redo: [] });
export type SketchAction =
  | { type: 'points'; points: MeasurePoint[]; automatic?: boolean }
  | { type: 'insert'; index: number; point: MeasurePoint }
  | { type: 'move' | 'remove'; index: number; point?: MeasurePoint }
  | { type: 'select'; index: number | null }
  | { type: 'undo' | 'redo' | 'edit' | 'finish' | 'cancel' | 'pause' };

const editable = (sketch: Sketch) => !sketch.finished || sketch.editing;
function beginEdit<S extends Sketch>(sketch: S): S {
  return editable(sketch) ? sketch : { ...sketch, editing: true, editStart: { points: sketch.points, source: sketch.source }, undo: [], redo: [] };
}
function change<S extends Sketch>(sketch: S, points: MeasurePoint[], selected: number | null): S {
  return { ...sketch, points, selected, source: undefined, undo: [...sketch.undo.slice(-49), sketch.points], redo: [] };
}
/** Generic so a measurement or drawing session keeps its own fields; unchanged input is returned as is. */
export function sketchReducer<S extends Sketch>(sketch: S, action: SketchAction): S {
  switch (action.type) {
    case 'points': {
      if (!editable(sketch)) return sketch;
      const selected = sketch.selected !== null && sketch.selected < action.points.length ? sketch.selected : null;
      const next = change(sketch, action.points, selected);
      // Fixed-point modes (location, bearing, radius, angle, rectangle) complete on their last point.
      return !sketch.editing && action.automatic && canFinish(sketch.mode, action.points) ? { ...next, finished: true } : next;
    }
    case 'insert': {
      // Index i places the vertex between i - 1 and i; the vertex count is the closing edge of an area.
      if (!takesVertices(sketch.mode) || action.index < 1 || action.index > sketch.points.length) return sketch;
      const base = beginEdit(sketch);
      return change(base, [...base.points.slice(0, action.index), action.point, ...base.points.slice(action.index)], action.index);
    }
    case 'move': {
      if (!action.point || action.index < 0 || action.index >= sketch.points.length) return sketch;
      const base = beginEdit(sketch), point = action.point;
      return change(base, base.points.map((old, index) => index === action.index ? point : old), action.index);
    }
    case 'remove': {
      if (action.index < 0 || action.index >= sketch.points.length) return sketch;
      // Selection clears, so a repeated Delete key never removes a second vertex by accident.
      const base = beginEdit(sketch);
      return change(base, base.points.filter((_, index) => index !== action.index), null);
    }
    case 'select': {
      const index = action.index;
      if (index !== null && (index < 0 || index >= sketch.points.length)) return sketch;
      return index === sketch.selected ? sketch : { ...sketch, selected: index };
    }
    case 'undo': return sketch.undo.length && editable(sketch) ? { ...sketch, points: sketch.undo.at(-1)!, undo: sketch.undo.slice(0, -1), redo: [...sketch.redo, sketch.points], source: undefined, selected: null } : sketch;
    case 'redo': return sketch.redo.length && editable(sketch) ? { ...sketch, points: sketch.redo.at(-1)!, redo: sketch.redo.slice(0, -1), undo: [...sketch.undo, sketch.points], source: undefined, selected: null } : sketch;
    case 'edit': return sketch.finished && !sketch.editing ? beginEdit(sketch) : sketch;
    case 'finish': return editable(sketch) && canFinish(sketch.mode, sketch.points) ? { ...sketch, finished: true, editing: false, editStart: undefined } : sketch;
    case 'cancel':
      if (sketch.editing && sketch.editStart) return { ...sketch, ...sketch.editStart, editing: false, editStart: undefined, undo: [], redo: [], selected: null };
      return sketch.finished ? sketch : { ...sketch, ...emptySketch(sketch.mode) };
    case 'pause': return sketch.editing ? sketchReducer(sketch, { type: 'cancel' }) : sketch;
  }
}
