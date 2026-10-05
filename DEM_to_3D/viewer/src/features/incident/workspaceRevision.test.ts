import { describe, expect, it } from 'vitest';
import { effectiveRevision } from './workspaceRevision';

describe('incident revision viewing', () => {
  it('separates viewing a past map from accepting or reverting a report', () => {
    expect(effectiveRevision({ applied: false, historical: false })).toBe(false);
    expect(effectiveRevision({ applied: true, historical: false })).toBe(true);
    const accepted = { applied: true, historical: true };
    expect(effectiveRevision(accepted)).toBe(false);
    expect(accepted.applied).toBe(true);
  });
});
