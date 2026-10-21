/** Reserve only the portion of a visible detail dock that actually overlaps this map. */
export function detailInset(host: HTMLElement): {right: number} {
  const map = host.getBoundingClientRect();
  const dock = host.closest('.workspace')?.querySelector<HTMLElement>('#response-details:not([hidden])');
  if (!dock || !map.width || !map.height) return {right:0};
  const rect = dock.getBoundingClientRect();
  if (!rect.width || !rect.height || rect.bottom <= map.top || rect.top >= map.bottom ||
      rect.left >= map.right || rect.right <= map.left || rect.width >= map.width * .6) return {right:0};
  return {right: Math.max(0, map.right - rect.left + 16)};
}
