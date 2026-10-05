export type ScreenRect = { x: number; y: number; width: number; height: number };
export type ScreenMarker = { id: string; x: number; y: number; priority: number };
export type MarkerGroup = { anchor: ScreenMarker; members: ScreenMarker[]; rect: ScreenRect };

export function overlaps(a: ScreenRect, b: ScreenRect, gap = 4): boolean {
  return a.x < b.x + b.width + gap && a.x + a.width + gap > b.x &&
    a.y < b.y + b.height + gap && a.y + a.height + gap > b.y;
}

const markerRect = (point: ScreenMarker, size: number): ScreenRect =>
  ({ x: point.x - size / 2, y: point.y - size / 2, width: size, height: size });

/** Aggregate colliding screen symbols, without moving their geographic positions.
 * The selected/highest-priority member anchors each group. A group includes all
 * its members, even when a member lies behind a control; controls always win.
 */
export function layoutMarkerGroups(points: ScreenMarker[], width: number, height: number, controls: ScreenRect[]): MarkerGroup[] {
  const remaining = points.filter(p => Number.isFinite(p.x) && Number.isFinite(p.y) &&
    p.x >= 17 && p.y >= 17 && p.x <= width - 17 && p.y <= height - 17)
    .sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));
  const groups: MarkerGroup[] = [];
  while (remaining.length) {
    const members = [remaining.shift()!];
    // Connected components prevent a newly enlarged count symbol from covering
    // a neighbouring symbol. Stable IDs break ties between equal priorities.
    let changed = true;
    while (changed) {
      changed = false;
      for (let i = remaining.length - 1; i >= 0; i--) {
        if (members.some(p => overlaps(markerRect(p, 34), markerRect(remaining[i], 34), 6))) {
          members.push(remaining.splice(i, 1)[0]); changed = true;
        }
      }
    }
    members.sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));
    const size = members.length > 1 ? 34 : 28;
    const anchor = members.find(p => !controls.some(r => overlaps(markerRect(p, size), r, 6)));
    if (!anchor) continue;
    groups.push({ anchor, members, rect: markerRect(anchor, size) });
  }
  return groups;
}
