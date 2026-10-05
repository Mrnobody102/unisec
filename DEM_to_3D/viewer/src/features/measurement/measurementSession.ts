import { canFinish, type MeasureMode, type MeasurePoint } from './measurement';

export type MeasuredShape = { id: number; mode: MeasureMode; points: MeasurePoint[]; visible: boolean; source?: string };
export type MeasurementSession = {
  mode: MeasureMode; points: MeasurePoint[]; finished: boolean; source?: string;
  undo: MeasurePoint[][]; redo: MeasurePoint[][]; saved: MeasuredShape[]; nextId: number;
};
export const initialMeasurementSession: MeasurementSession = {
  mode: 'distance', points: [], finished: false, undo: [], redo: [], saved: [], nextId: 1
};
export type MeasureAction =
  | { type: 'points'; points: MeasurePoint[]; automatic?: boolean }
  | { type: 'mode'; mode: MeasureMode }
  | { type: 'import'; mode: 'distance' | 'area'; points: MeasurePoint[]; source: string }
  | { type: 'visible' | 'delete'; id: number }
  | { type: 'undo' | 'redo' | 'finish' | 'new' | 'cancel' | 'reset' };

function fresh(state: MeasurementSession): MeasurementSession {
  return { ...state, points: [], finished: false, source: undefined, undo: [], redo: [] };
}
function archive(state: MeasurementSession): MeasurementSession {
  if (!state.finished) return fresh(state);
  return { ...fresh(state), nextId: state.nextId + 1, saved: [...state.saved,
    { id: state.nextId, mode: state.mode, points: state.points, visible: true, source: state.source }] };
}
export function measurementSessionReducer(state: MeasurementSession, action: MeasureAction): MeasurementSession {
  switch (action.type) {
    case 'points': return { ...state, points: action.points, source: undefined,
      undo: [...state.undo.slice(-49), state.points], redo: [],
      finished: (state.finished || Boolean(action.automatic)) && canFinish(state.mode, action.points) };
    case 'undo': return state.undo.length ? { ...state, points: state.undo.at(-1)!, undo: state.undo.slice(0, -1), redo: [...state.redo, state.points], finished: false, source: undefined } : state;
    case 'redo': return state.redo.length ? { ...state, points: state.redo.at(-1)!, redo: state.redo.slice(0, -1), undo: [...state.undo, state.points], finished: false, source: undefined } : state;
    case 'finish': return canFinish(state.mode, state.points) ? { ...state, finished: true } : state;
    case 'cancel': return state.finished ? state : fresh(state);
    case 'new': return archive(state);
    case 'mode': return action.mode === state.mode ? state : { ...archive(state), mode: action.mode };
    case 'import': return canFinish(action.mode, action.points)
      ? { ...archive(state), mode: action.mode, points: action.points, finished: true, source: action.source } : state;
    case 'visible': return { ...state, saved: state.saved.map(item => item.id === action.id ? { ...item, visible: !item.visible } : item) };
    case 'delete': return { ...state, saved: state.saved.filter(item => item.id !== action.id) };
    case 'reset': return initialMeasurementSession;
  }
}
