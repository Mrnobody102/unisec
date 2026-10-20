import { materialMapSymbols } from "./materialMapSymbols";

/** Semantic map symbols. Google outlines where the meaning matches; bridge,
 * crossing and landing H retain cartographic line work rather than a generic UI glyph. */
const lineSymbols = {
  community: "M4 10.5 12 4l8 6.5M6 9.5V21h4v-7h4v7h4V9.5",
  staging: "M6 21V4m0 0h11l-2 4 2 4H6",
  // A slope and two falling blocks, drawn for legibility at 16px.
  landslide: "M3 5v16h18M3 10l6 3 3 5h9M13 3l4 1 1 4-4 1-2-3ZM20 11l2 2-1 3-3-1-1-2Z",
  bridge: "M2 9h20M2 13h20M6 5v15M18 5v15",
  crossing:
    "M8 3v5M16 3v5M8 16v5M16 16v5M2 10q2-2 4 0t4 0 4 0 4 0 4 0M2 14q2-2 4 0t4 0 4 0 4 0 4 0",
  hlz: "M7 6v12M17 6v12M7 12h10",
} as const;
export type MapSymbolName =
  keyof typeof materialMapSymbols | keyof typeof lineSymbols;
export function mapSymbolArtwork(name: MapSymbolName): {
  viewBox: string;
  path: string;
  filled: boolean;
} {
  if (name in lineSymbols)
    return {
      viewBox: "0 0 24 24",
      path: lineSymbols[name as keyof typeof lineSymbols],
      filled: false,
    };
  const icon = materialMapSymbols[name as keyof typeof materialMapSymbols];
  return {
    viewBox: icon.viewBox,
    path: icon.content.map((n) => n.attrs.d).join(" "),
    filled: true,
  };
}
export function mapSymbolSvg(name: MapSymbolName, size = 18): string {
  const a = mapSymbolArtwork(name);
  const ink = a.filled ? 'fill="currentColor" stroke="none"' : 'fill="none" stroke="currentColor" stroke-width="1.8"';
  return `<svg width="${size}" height="${size}" viewBox="${a.viewBox}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${a.path}" ${ink}/></svg>`;
}
export function drawMapSymbol(
  ctx: CanvasRenderingContext2D,
  name: MapSymbolName,
  x: number,
  y: number,
  size: number,
  color: string,
): void {
  const a = mapSymbolArtwork(name),
    [vx, vy, vw, vh] = a.viewBox.split(" ").map(Number);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / vw, size / vh);
  ctx.translate(-vx, -vy);
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.6;
  ctx.lineCap='round';ctx.lineJoin='round';
  const path = new Path2D(a.path);
  if (a.filled) ctx.fill(path);
  else ctx.stroke(path);
  ctx.restore();
}
