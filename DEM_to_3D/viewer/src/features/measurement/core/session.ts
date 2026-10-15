import { canFinish, type MeasureMode, type MeasurePoint } from './geometry';
import { emptySketch, sketchReducer, type Sketch, type SketchAction } from './sketch';

export type MeasuredShape = { id: number; mode: MeasureMode; points: MeasurePoint[]; visible: boolean; source?: string };
/**
 * One list of results: a measurement joins `saved` as soon as its sketch completes. The panel
 * shows the sketch, which is either a draft or the result `activeId`; applied edits update it.
 */
export type MeasurementSession = Sketch & { mode: MeasureMode; saved: MeasuredShape[]; activeId?: number; nextId: number };
export const initialMeasurementSession: MeasurementSession = { ...emptySketch('distance'), mode: 'distance', saved: [], nextId: 1 };
export type MeasureAction =
  | SketchAction
  | { type: 'mode'; mode: MeasureMode }
  | { type: 'import'; mode: 'distance' | 'area'; points: MeasurePoint[]; source: string }
  | { type: 'visible' | 'delete'; id: number }
  | { type: 'new' | 'reset' };

function fresh(state: MeasurementSession): MeasurementSession {
  return { ...state, ...emptySketch(state.mode), mode: state.mode, activeId: undefined };
}
/** A sketch that has just completed becomes a result; an applied edit updates its result. */
function record(previous: MeasurementSession, next: MeasurementSession, action: MeasureAction): MeasurementSession {
  if (!previous.finished && next.finished) {
    const id = next.nextId;
    return { ...next, activeId: id, nextId: id + 1,
      saved: [...next.saved, { id, mode: next.mode, points: next.points, visible: true, source: next.source }] };
  }
  if (previous.editing && !next.editing && action.type === 'finish')
    return { ...next, saved: next.saved.map(item => item.id === next.activeId ? { ...item, points: next.points, source: next.source } : item) };
  return next;
}
export function measurementSessionReducer(state: MeasurementSession, action: MeasureAction): MeasurementSession {
  switch (action.type) {
    case 'mode': {
      if (action.mode === state.mode) return state;
      // Keep a valid edit; an incomplete one leaves the original result unchanged.
      const settled = measurementSessionReducer(state, { type: state.editing && canFinish(state.mode, state.points) ? 'finish' : 'pause' });
      return { ...fresh(settled), mode: action.mode };
    }
    case 'import': {
      if (state.editing || !canFinish(action.mode, action.points)) return state;
      const draft = { ...fresh(state), mode: action.mode, points: action.points, source: action.source };
      return record(draft, { ...draft, finished: true }, action);
    }
    case 'visible': return { ...state, saved: state.saved.map(item => item.id === action.id ? { ...item, visible: !item.visible } : item) };
    case 'delete': {
      const saved = state.saved.filter(item => item.id !== action.id);
      return action.id === state.activeId ? { ...fresh(state), saved } : { ...state, saved };
    }
    case 'new': return state.editing ? state : fresh(state);
    case 'reset': return initialMeasurementSession;
    default: return record(state, sketchReducer(state, action), action);
  }
}
