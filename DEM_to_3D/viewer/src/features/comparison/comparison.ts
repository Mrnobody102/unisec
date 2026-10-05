import proj4 from 'proj4';

export type ComparisonImage = {
  url: string; bounds: [[number, number], [number, number]];
  filename: string; acquiredAt: string; source: string; crs: string;
};
export type ComparisonPair = { before: ComparisonImage; after: ComparisonImage };

export function validateComparisonPair(pair: ComparisonPair, triggeredAt?: string): void {
  if (!Number.isFinite(Date.parse(pair.before.acquiredAt)) || !Number.isFinite(Date.parse(pair.after.acquiredAt)) ||
      Date.parse(pair.before.acquiredAt) >= Date.parse(pair.after.acquiredAt)) throw new Error('dates');
  if (triggeredAt && (Date.parse(pair.before.acquiredAt) >= Date.parse(triggeredAt) || Date.parse(pair.after.acquiredAt) < Date.parse(triggeredAt))) throw new Error('event-time');
  if (!pair.before.source.trim() || !pair.after.source.trim()) throw new Error('source');
  const [a, b] = [pair.before.bounds, pair.after.bounds];
  if ([a, b].some(bounds => !bounds.flat().every(Number.isFinite) || bounds[0][0] >= bounds[1][0] || bounds[0][1] >= bounds[1][1])) throw new Error('georef');
  if (Math.max(a[0][0], b[0][0]) >= Math.min(a[1][0], b[1][0]) ||
      Math.max(a[0][1], b[0][1]) >= Math.min(a[1][1], b[1][1])) throw new Error('overlap');
}

/** Display products only. Raw SAR processing and damage classification are upstream. */
export async function loadComparisonImage(file: File, acquiredAt: string, source: string, signal: AbortSignal): Promise<ComparisonImage> {
  if (file.size > 40 * 1024 * 1024) throw new Error('size');
  const { fromArrayBuffer } = await import('geotiff');
  const tiff = await fromArrayBuffer(await file.arrayBuffer());
  const image = await tiff.getImage();
  const width = image.getWidth(), height = image.getHeight(), directory = image.getFileDirectory();
  const keys = image.getGeoKeys();
  const code = Number(keys?.ProjectedCSTypeGeoKey ?? keys?.GeographicTypeGeoKey);
  const supported: Record<number, string> = { 4326: 'EPSG:4326', 3857: 'EPSG:3857', 32648: '+proj=utm +zone=48 +datum=WGS84 +units=m +no_defs' };
  if (!supported[code]) throw new Error('crs');
  if (!width || !height || width * height > 8_000_000) throw new Error('size');
  if (Array.from(directory.getValue('BitsPerSample') ?? []).some(bits => bits !== 8)) throw new Error('display-product');
  const matrix = directory.getValue('ModelTransformation');
  if (matrix && (matrix[1] !== 0 || matrix[4] !== 0)) throw new Error('rotation');
  const origin = image.getOrigin(), resolution = image.getResolution();
  if (Number(keys?.GTRasterTypeGeoKey) === 2) { origin[0] -= resolution[0] / 2; origin[1] -= resolution[1] / 2; }
  if (!Number.isFinite(resolution[0]) || !Number.isFinite(resolution[1]) || resolution[0] === 0 || resolution[1] === 0) throw new Error('georef');
  const ratio = Math.min(1, 1024 / Math.max(width, height));
  const sw = Math.max(1, Math.round(width * ratio)), sh = Math.max(1, Math.round(height * ratio));
  const pixels = await image.readRGB({ width: sw, height: sh, interleave: true, enableAlpha: true, signal });
  const bands = pixels.length / (sw * sh);
  if (bands !== 3 && bands !== 4) throw new Error('display-product');
  const nodata = image.getGDALNoData();
  const raw = nodata === null ? null : await image.readRasters({ samples: [0], width: sw, height: sh, interleave: true, signal });
  const transform = proj4(supported[code], 'EPSG:3857');
  const corners = [[0, 0], [width, 0], [0, height], [width, height]].map(([x, y]) => transform.forward([origin[0] + x * resolution[0], origin[1] + y * resolution[1]]));
  const minX = Math.min(...corners.map(p => p[0])), maxX = Math.max(...corners.map(p => p[0]));
  const minY = Math.min(...corners.map(p => p[1])), maxY = Math.max(...corners.map(p => p[1]));
  if (![minX, maxX, minY, maxY].every(Number.isFinite) || maxX <= minX || maxY <= minY) throw new Error('georef');
  const scale = Math.min(1024 / (maxX - minX), 1024 / (maxY - minY));
  const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round((maxX - minX) * scale)); canvas.height = Math.max(1, Math.round((maxY - minY) * scale));
  const context = canvas.getContext('2d')!; const output = context.createImageData(canvas.width, canvas.height);
  const inverse = proj4('EPSG:3857', supported[code]);
  for (let y = 0; y < canvas.height; y++) {
    if (y % 32 === 0) { await new Promise<void>(resolve => requestAnimationFrame(() => resolve())); if (signal.aborted) throw new DOMException('Aborted', 'AbortError'); }
    for (let x = 0; x < canvas.width; x++) {
      const point = inverse.forward([minX + (x + 0.5) / canvas.width * (maxX - minX), maxY - (y + 0.5) / canvas.height * (maxY - minY)]);
      const sx = Math.floor((point[0] - origin[0]) / (resolution[0] * width) * sw), sy = Math.floor((point[1] - origin[1]) / (resolution[1] * height) * sh);
      if (sx < 0 || sy < 0 || sx >= sw || sy >= sh) continue;
      const index = sy * sw + sx;
      if (raw && Number(raw[index]) === nodata) continue;
      const target = (y * canvas.width + x) * 4;
      for (let band = 0; band < 3; band++) output.data[target + band] = Number(pixels[index * bands + band]);
      output.data[target + 3] = bands === 4 ? Number(pixels[index * bands + 3]) : 255;
    }
  }
  context.putImageData(output, 0, 0);
  const a = proj4('EPSG:3857', 'EPSG:4326', [minX, minY]), b = proj4('EPSG:3857', 'EPSG:4326', [maxX, maxY]);
  return { url: canvas.toDataURL('image/png'), bounds: [[a[1], a[0]], [b[1], b[0]]], filename: file.name, acquiredAt, source: source.trim(), crs: `EPSG:${code}` };
}
