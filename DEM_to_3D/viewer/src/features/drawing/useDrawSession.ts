import { useLayoutEffect, useReducer } from 'react';
import { emptySketch, sketchReducer, type Sketch, type SketchAction } from '../measurement/core';
import { kindMode, type DrawKind } from './drawShapes';

/** The shape being drawn, with the name or note it will be saved under. */
export type DrawSession = Sketch & { kind: DrawKind; name: string; note: string };
export type DrawAction =
  | SketchAction
  | { type: 'kind'; kind: DrawKind }
  | { type: 'name'; name: string }
  | { type: 'note'; note: string }
  | { type: 'discard' };
export const initialDrawSession: DrawSession = { ...emptySketch(kindMode.polygon), kind: 'polygon', name: '', note: '' };

export function drawSessionReducer(state: DrawSession, action: DrawAction): DrawSession {
  switch (action.type) {
    case 'kind': return action.kind === state.kind ? state : { ...state, ...emptySketch(kindMode[action.kind]), kind: action.kind, name: '', note: '' };
    case 'name': return { ...state, name: action.name };
    case 'note': return { ...state, note: action.note };
    // After saving or on request: an empty sketch of the same kind, ready for the next shape.
    case 'discard': return { ...state, ...emptySketch(kindMode[state.kind]), name: '', note: '' };
    default: return sketchReducer(state, action);
  }
}

/** Closing the tool keeps the drawing; an unapplied edit of a finished shape is restored. */
export function useDrawSession(mapMode: '2d' | '3d', open: boolean) {
  const [session, dispatch] = useReducer(drawSessionReducer, initialDrawSession);
  useLayoutEffect(() => {
    if (!open || mapMode === '3d') dispatch({ type: 'pause' });
  }, [open, mapMode]);
  return { session, dispatch };
}
