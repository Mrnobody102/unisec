import type { TerrainPoint } from '../types/terrain';

export type MeasurementState = { active: boolean; picks: TerrainPoint[] };
export const initialMeasurementState: MeasurementState = { active: false, picks: [] };

export type MeasurementAction =
  | { type: 'toggle' }
  | { type: 'pick'; point: TerrainPoint }
  | { type: 'clear' };

export function measurementReducer(state: MeasurementState, action: MeasurementAction): MeasurementState {
  switch (action.type) {
    case 'toggle':
      return state.active ? initialMeasurementState : { active: true, picks: [] };
    case 'pick':
      if (!state.active) return state;
      if (state.picks.length === 0) return { ...state, picks: [action.point] };
      return { active: false, picks: [state.picks[0], action.point] };
    case 'clear':
      return initialMeasurementState;
    default:
      return state;
  }
}
