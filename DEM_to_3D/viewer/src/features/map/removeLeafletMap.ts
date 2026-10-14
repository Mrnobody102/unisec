import type { Map } from 'leaflet';

/** Leaflet 1.9.4 leaves a 250 ms zoom completion callback pending after remove().
 * stop() cancels pan/fly animations only. Clear this version-specific flag before
 * teardown so that callback returns without reading the removed map pane.
 * Revisit when upgrading Leaflet: src/map/Map.js, _animateZoom/_onZoomTransitionEnd.
 */
export function removeLeafletMap(map: Map): void {
  map.stop();
  const animated = map as Map & { _animatingZoom?: boolean };
  if (animated._animatingZoom) animated._animatingZoom = false;
  map.remove();
}
