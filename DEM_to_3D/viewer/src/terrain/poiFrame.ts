import { drawMapSymbol, type MapSymbolName } from "./mapSymbols";
/** Compact round-headed POI with a short tapered tip; both states anchor at their tip. */
export const POI_FRAME_PATH = 'M14 2.8a9.2 9.2 0 0 1 9.2 9.2c0 5.8-5.8 10.2-9.2 13.2C10.6 22.2 4.8 17.8 4.8 12A9.2 9.2 0 0 1 14 2.8Z';
// Google Material Symbols location_on, Apache-2.0; same pinned source as the EO map.
export const SELECTED_PIN_PATH =
  "M480.21-480Q510-480 531-501.21t21-51Q552-582 530.79-603t-51-21Q450-624 429-602.79t-21 51Q408-522 429.21-501t51 21ZM480-96Q323.02-227.11 245.51-339.55 168-452 168-549q0-134 89-224.5T479.5-864q133.5 0 223 90.5T792-549q0 97-77 209T480-96Z";
export function selectedPinSvg(): string {
  return `<svg width="28" height="32" viewBox="0 -960 960 960" aria-hidden="true"><path d="${SELECTED_PIN_PATH}" fill-rule="evenodd"/></svg>`;
}
export function poiFrameSvg(selected = false): string {
  if (selected) return selectedPinSvg();
  return `<svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true"><path d="${POI_FRAME_PATH}"/></svg>`;
}
export function drawPoiMarker(
  ctx: CanvasRenderingContext2D,
  symbol: MapSymbolName,
  x: number,
  y: number,
  color: string,
  size = 28,
  unconfirmed = false,
): void {
  const { half, tip } = poiMetrics(size);
  ctx.save();
  ctx.translate(x - half, y - tip);
  ctx.scale(size / 28, size / 28);
  const frame = new Path2D(POI_FRAME_PATH);
  ctx.fillStyle = '#fbfcfa'; ctx.strokeStyle = color; ctx.lineWidth = .9; ctx.lineJoin = 'round';
  ctx.fill(frame); ctx.stroke(frame);
  ctx.globalAlpha = unconfirmed ? .8 : 1;
  drawMapSymbol(ctx, symbol, 6, 4, 16, color);
  ctx.restore();
}
export function markerSize(clustered: boolean, selected: boolean): number {
  return selected ? 28 : clustered ? 32 : 28;
}
export function poiMetrics(
  size: number,
  selected = false,
): {
  half: number;
  tip: number;
  height: number;
} {
  return {
    half: size / 2,
    tip: (size * (selected ? 28.8 : 25.2)) / 28,
    height: selected ? (size * 32) / 28 : size,
  };
}
