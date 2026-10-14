import { describe, expect, it } from 'vitest';
import { createTileProgress } from './tileProgress';

describe('basemap loading recovery', () => {
  it('clears the warning after a tile fails repeatedly and then succeeds', () => {
    const progress = createTileProgress(),
      a = {},
      b = {};
    progress.start(a);
    progress.start(b);
    progress.settle(a, true);
    progress.settle(b, false);
    progress.settle(b, false);
    expect(progress.snapshot()).toEqual({
      loaded: 1,
      total: 2,
      status: 'partial'
    });
    progress.settle(b, true);
    expect(progress.snapshot()).toEqual({
      loaded: 2,
      total: 2,
      status: 'ready'
    });
  });
  it('does not hide the fallback until every requested tile is loaded', () => {
    const progress = createTileProgress(),
      a = {},
      b = {};
    progress.start(a);
    progress.start(b);
    progress.settle(a, true);
    expect(progress.snapshot().status).toBe('loading');
    progress.settle(a, true);
    expect(progress.snapshot().loaded).toBe(1);
  });
  it('ignores a late response from a previous viewport', () => {
    const progress = createTileProgress(),
      old = {},
      current = {};
    progress.start(old);
    progress.reset();
    progress.start(current);
    progress.settle(old, false);
    progress.settle(current, true);
    expect(progress.snapshot()).toEqual({
      loaded: 1,
      total: 1,
      status: 'ready'
    });
  });
  it('does not wait for a pending tile removed by panning', () => {
    const progress = createTileProgress(),
      retired = {},
      visible = {};
    progress.start(retired);
    progress.start(visible);
    progress.settle(visible, true);
    progress.forget(retired);
    expect(progress.snapshot()).toEqual({
      loaded: 1,
      total: 1,
      status: 'ready'
    });
  });
});
