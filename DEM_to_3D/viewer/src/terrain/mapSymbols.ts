import { materialMapSymbols } from "./materialMapSymbols";

/** Semantic map symbols. Material Symbols (community, staging, landslide, flood) where the
 * meaning matches; bridge, crossing and landing H keep cartographic line work. */
const lineSymbols = {
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
  const ink = a.filled ? 'fill="currentColor" stroke="none"' : 'fill="none" stroke="currentColor" stroke-width="2"';
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
  ctx.lineWidth = 2;
  ctx.lineCap='round';ctx.lineJoin='round';
  const path = new Path2D(a.path);
  if (a.filled) ctx.fill(path);
  else ctx.stroke(path);
  ctx.restore();
}
