import type * as L from 'leaflet';

/**
 * Leaflet never retries a failed tile, so a dropped request (flaky network, a request
 * cancelled during a resize) leaves a permanent hole showing the map background.
 * Retry each failed tile a few times with a growing delay and a cache-busting query.
 */
export function retryTileErrors(layer: L.TileLayer, attempts = 3): L.TileLayer {
  const timers = new Set<number>();
  layer.on('tileerror', (event: L.TileErrorEvent) => {
    const tile = event.tile as HTMLImageElement;
    const attempt = Number(tile.dataset.retry ?? 0) + 1;
    if (attempt > attempts) return;
    tile.dataset.retry = String(attempt);
    const timer = window.setTimeout(() => {
      timers.delete(timer);
      if (!tile.isConnected) return;
      const url = layer.getTileUrl(event.coords);
      tile.src = `${url}${url.includes('?') ? '&' : '?'}retry=${attempt}`;
    }, 600 * attempt);
    timers.add(timer);
  });
  layer.on('remove', () => {
    timers.forEach((timer) => window.clearTimeout(timer));
    timers.clear();
  });
  return layer;
}
