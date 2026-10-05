import type * as L from 'leaflet';

/** Labels are secondary to map controls and operational objects. Keep results in the panel when no position fits. */
export function positionMeasurementLabels(map: L.Map, labels: L.Tooltip[]): void {
  if (!labels.length) return;
  const container = map.getContainer(), bounds = container.getBoundingClientRect();
  const blocked = Array.from(container.closest('.map-area')?.querySelectorAll<HTMLElement>(
    '.map-toolbar,.map-tools,.map-reference,.map-panel-toggle,.map-measure-panel,.map-location-panel,.map-attribution,.map-source-popover,.map-pin:not(.is-position-hidden)') ?? [])
    .filter(node => node.offsetWidth && node.offsetHeight && getComputedStyle(node).visibility !== 'hidden')
    .map(node => node.getBoundingClientRect());
  const collides = (a: DOMRect, b: DOMRect) => a.left < b.right + 5 && a.right > b.left - 5 && a.top < b.bottom + 5 && a.bottom > b.top - 5;
  for (const label of labels) {
    const node = label.getElement();
    if (!node) continue;
    node.style.display = '';
    const position = label.getLatLng();
    if (!position) { node.style.display = 'none'; continue; }
    const anchor = map.latLngToContainerPoint(position);
    let fitted = false;
    if (anchor.x >= 0 && anchor.x <= bounds.width && anchor.y >= 0 && anchor.y <= bounds.height) {
      for (const direction of ['right', 'left', 'top', 'bottom'] as const) {
        label.options.direction = direction; label.setLatLng(position);
        const rect = node.getBoundingClientRect();
        if (rect.left < bounds.left + 6 || rect.right > bounds.right - 6 || rect.top < bounds.top + 6 || rect.bottom > bounds.bottom - 6 || blocked.some(other => collides(rect, other))) continue;
        blocked.push(rect); fitted = true; break;
      }
    }
    if (!fitted) node.style.display = 'none';
  }
}
