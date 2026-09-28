import { describe, expect, it } from 'vitest';
import { initialMeasurementState, measurementReducer } from './measurementStore';
import type { TerrainPoint } from '../types/terrain';

const point = (x: number): TerrainPoint => ({ scene: { x, y: 1, z: 0 }, projected: { x, y: 0 }, elevation: 1, row: 0, column: 0, interpolated: true });

describe('measurementReducer', () => {
  it('keeps at most two picks and completes a measurement after the second pick', () => {
    let state = measurementReducer(initialMeasurementState, { type: 'toggle' });
    expect(state.active).toBe(true);
    state = measurementReducer(state, { type: 'pick', point: point(1) });
    expect(state.picks).toHaveLength(1);
    state = measurementReducer(state, { type: 'pick', point: point(2) });
    expect(state.active).toBe(false);
    expect(state.picks.map((item) => item.projected.x)).toEqual([1, 2]);
    state = measurementReducer(state, { type: 'toggle' });
    state = measurementReducer(state, { type: 'pick', point: point(3) });
    expect(state.picks.map((item) => item.projected.x)).toEqual([3]);
  });

  it('clears picks and the active mode together', () => {
    const state = measurementReducer({ active: true, picks: [point(1)] }, { type: 'clear' });
    expect(state).toEqual(initialMeasurementState);
  });
});
