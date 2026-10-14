/** Count each requested tile once, including failed requests that later recover. */
export function createTileProgress() {
  const tiles = new Map<object, 'pending' | 'loaded' | 'failed'>();
  return {
    reset: () => tiles.clear(),
    forget: (tile: object) => {
      tiles.delete(tile);
    },
    start: (tile: object) => {
      tiles.set(tile, 'pending');
    },
    settle: (tile: object, ok: boolean) => {
      if (tiles.has(tile)) tiles.set(tile, ok ? 'loaded' : 'failed');
    },
    snapshot: () => {
      const values = [...tiles.values()];
      const loaded = values.filter((value) => value === 'loaded').length;
      const failed = values.includes('failed');
      const total = tiles.size;
      const status: 'loading' | 'ready' | 'partial' | 'error' = failed
        ? loaded
          ? 'partial'
          : 'error'
        : total > 0 && loaded === total
          ? 'ready'
          : 'loading';
      return { loaded, total, status };
    }
  };
}
