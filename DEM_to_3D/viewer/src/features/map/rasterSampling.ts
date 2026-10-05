/** Bilinear display sampling. The nearest pixel keeps control of the nodata mask. */
export function sampleDisplayPixel(source: Uint8ClampedArray, width: number, height: number,
  x: number, y: number, target: Uint8ClampedArray, offset: number): void {
  if (!Number.isFinite(x) || !Number.isFinite(y) || x < -.5 || y < -.5 || x > width - .5 || y > height - .5) return;
  const nearestX = Math.max(0, Math.min(width - 1, Math.round(x)));
  const nearestY = Math.max(0, Math.min(height - 1, Math.round(y)));
  const alpha = source[(nearestY * width + nearestX) * 4 + 3];
  if (!alpha) return;
  const left = Math.floor(x), top = Math.floor(y), u = x - left, v = y - top;
  let red = 0, green = 0, blue = 0, total = 0;
  for (let row = 0; row < 2; row++) for (let col = 0; col < 2; col++) {
    const sx = Math.max(0, Math.min(width - 1, left + col));
    const sy = Math.max(0, Math.min(height - 1, top + row));
    const i = (sy * width + sx) * 4;
    const weight = (col ? u : 1 - u) * (row ? v : 1 - v) * source[i + 3];
    red += source[i] * weight; green += source[i + 1] * weight; blue += source[i + 2] * weight; total += weight;
  }
  if (!total) return;
  target[offset] = red / total; target[offset + 1] = green / total; target[offset + 2] = blue / total; target[offset + 3] = alpha;
}
