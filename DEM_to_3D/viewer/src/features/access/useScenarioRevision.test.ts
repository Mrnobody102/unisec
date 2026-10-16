import { describe, expect, it } from 'vitest';
import { readScenarioRevision } from './useScenarioRevision';

describe('scenario revision persistence', () => {
  it('accepts the recorded application time without importing unrelated properties', () => {
    expect(readScenarioRevision('{"applied":true,"at":"2026-09-29T03:00:00Z","other":1}')).toEqual({ applied: true, at: '2026-09-29T03:00:00Z' });
  });
  it.each([null, 'broken', '{}', '{"applied":"true","at":null}', '{"applied":true,"at":"not a date"}'])('ignores malformed storage (%s)', value => {
    expect(readScenarioRevision(value)).toEqual({ applied: false, at: null });
  });
});
